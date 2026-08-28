import { useCallback, useEffect, useRef, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import type { MarinaDesign } from "@/hooks/useMarinaDesigns";

const FUNCTIONS_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/marina-chat`;

export interface MarinaThread {
  id: string;
  title: string | null;
  subject: string | null;
  channel: "marina_web" | "whatsapp" | string;
  pinned_at: string | null;
  updated_at: string;
  created_at: string;
}

export interface MarinaMessage {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
  metadata?: Record<string, unknown> | null;
  pending?: boolean;
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  return {
    "Content-Type": "application/json",
    Authorization: `Bearer ${data.session?.access_token ?? ""}`,
    apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
  };
}

async function callMarina(action: string, init?: { method?: string; body?: unknown; params?: Record<string, string> }) {
  const headers = await authHeaders();
  const params = new URLSearchParams({ action, ...(init?.params ?? {}) });
  const res = await fetch(`${FUNCTIONS_URL}?${params.toString()}`, {
    method: init?.method ?? "GET",
    headers,
    ...(init?.body ? { body: JSON.stringify(init.body) } : {}),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || "Não foi possível concluir a ação.");
  return json;
}

/** Permissões da pessoa no Copiloto (avançado ou não) e prontidão do motor. */
export function useMarinaAccess() {
  return useQuery({
    queryKey: ["marina-access"],
    queryFn: async () => (await callMarina("me")) as { advanced: boolean; role: string; engine_ready: boolean },
    staleTime: 5 * 60 * 1000,
  });
}

/** Conversas do Copiloto (chat do Arrow e assuntos vindos do WhatsApp). */
export function useMarinaThreads() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["marina-threads", user?.id],
    enabled: !!user?.id,
    queryFn: async (): Promise<MarinaThread[]> => {
      const { data, error } = await supabase
        .from("ai_conversations")
        .select("id, title, subject, channel, pinned_at, created_at, updated_at, last_message_at")
        .eq("user_id", user!.id)
        .in("channel", ["marina_web", "whatsapp"])
        .order("pinned_at", { ascending: false, nullsFirst: false })
        .order("updated_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []).map((c: any) => ({
        id: c.id,
        title: c.subject || c.title,
        subject: c.subject,
        channel: c.channel ?? "marina_web",
        pinned_at: c.pinned_at ?? null,
        created_at: c.created_at,
        updated_at: c.last_message_at ?? c.updated_at,
      }));
    },
  });
}

/** Fixa/desfixa uma conversa na coluna lateral. */
export function useToggleThreadPin() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, pinned }: { id: string; pinned: boolean }) => {
      const { error } = await supabase
        .from("ai_conversations")
        .update({ pinned_at: pinned ? new Date().toISOString() : null })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["marina-threads"] }),
  });
}

export function useMarinaMessages(threadId?: string) {
  return useQuery({
    queryKey: ["marina-messages", threadId],
    enabled: !!threadId,
    queryFn: async (): Promise<MarinaMessage[]> => {
      const { data, error } = await supabase
        .from("ai_messages")
        .select("id, role, content, created_at, metadata")
        .eq("conversation_id", threadId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []).map((m: any) => ({
        id: m.id,
        role: m.role === "assistant" ? "assistant" : "user",
        content: m.content ?? "",
        created_at: m.created_at,
        metadata: m.metadata,
      }));
    },
  });
}

export function useRenameThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, title }: { id: string; title: string }) => {
      const { error } = await supabase
        .from("ai_conversations")
        .update({ title, subject: title, title_locked: true })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["marina-threads"] }),
  });
}

export function useDeleteThread() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      await supabase.from("ai_messages").delete().eq("conversation_id", id);
      const { error } = await supabase.from("ai_conversations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["marina-threads"] }),
  });
}

export interface MarinaStep {
  id: string;
  label: string;
  state: "andamento" | "concluida" | "falhou";
  ms?: number;
  detail?: string;
}

interface StreamState {
  streaming: boolean;
  status: string | null;
  draft: string;
  /** Trilha de etapas da peça em produção (design). */
  steps: MarinaStep[];
  /** Último turno não concluiu (motor ocupado ou erro): permite tentar de novo. */
  retry: { message: string; options?: SendOptions; reason: string } | null;
}

export interface SendOptions {
  /** Perfil/área do pedido (ex.: marketing) — usado nos pedidos de design. */
  profile?: string;
  /** Marca o turno como pedido de peça (true) ou como conversa (false). */
  design?: boolean;
  /** Fotos reais que a peça deve reproduzir com fidelidade. */
  references?: string[];
  /** Peça no palco: dá contexto para conversar sobre ela sem criar outra. */
  focusDesignId?: string | null;
}


/** Envia a mensagem e consome o stream da Marina. */
export function useMarinaStream(
  threadId: string | undefined,
  onThreadCreated: (id: string) => void,
  onDesign?: (design: MarinaDesign) => void,
) {
  const qc = useQueryClient();
  const [state, setState] = useState<StreamState>({ streaming: false, status: null, draft: "", steps: [], retry: null });
  const abortRef = useRef<AbortController | null>(null);

  useEffect(() => () => abortRef.current?.abort(), []);

  const send = useCallback(
    async (message: string, options?: SendOptions) => {
      if (!message.trim() || state.streaming) return;
      const controller = new AbortController();
      abortRef.current = controller;
      setState({ streaming: true, status: "pensando…", draft: "", steps: [], retry: null });


      let createdId: string | null = null;
      try {
        const headers = await authHeaders();
        const res = await fetch(`${FUNCTIONS_URL}?action=chat`, {
          method: "POST",
          headers,
          body: JSON.stringify({
            message,
            conversation_id: threadId ?? null,
            ...(options?.profile ? { profile: options.profile } : {}),
            ...(options?.design !== undefined ? { design: options.design } : {}),
            ...(options?.focusDesignId ? { focus_design_id: options.focusDesignId } : {}),
            ...(options?.references?.length ? { references: options.references } : {}),
          }),

          signal: controller.signal,
        });
        if (!res.ok || !res.body) {
          const err = await res.json().catch(() => ({}));
          throw new Error(err?.error || "A Marina não respondeu agora.");
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        let draft = "";

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split("\n");
          buffer = lines.pop() ?? "";
          for (const line of lines) {
            const trimmed = line.trim();
            if (!trimmed.startsWith("data:")) continue;
            const payload = trimmed.slice(5).trim();
            if (!payload) continue;
            let event: any;
            try {
              event = JSON.parse(payload);
            } catch {
              continue;
            }
            if (event.type === "meta" && event.conversation_id && !threadId) {
              createdId = event.conversation_id;
              onThreadCreated(event.conversation_id);
            }
            if (event.type === "status") setState((s) => ({ ...s, status: event.label }));
            if (event.type === "delta") {
              draft += event.text ?? "";
              setState((s) => ({ ...s, status: null, draft }));
            }
            if (event.type === "steps" && Array.isArray(event.steps)) {
              setState((s) => ({ ...s, steps: event.steps as MarinaStep[] }));
            }
            if (event.type === "design" && event.design) {
              onDesign?.(event.design as MarinaDesign);
              qc.invalidateQueries({ queryKey: ["marina-designs"] });
            }
            if (event.type === "retryable") {
              setState((s) => ({ ...s, retry: { message, options, reason: event.reason ?? "engine_error" } }));
            }
            if (event.type === "error") {
              draft += `\n\n${event.message}`;
              setState((s) => ({ ...s, status: null, draft }));
            }
          }
        }
      } catch (e) {
        if ((e as Error).name !== "AbortError") {
          setState((s) => ({
            ...s,
            draft: s.draft || `Não consegui responder agora: ${(e as Error).message}`,
            retry: { message, options, reason: "network" },
          }));
        }
      } finally {
        setState((s) => ({ ...s, streaming: false, status: null }));
        const id = threadId ?? createdId;
        qc.invalidateQueries({ queryKey: ["marina-threads"] });
        qc.invalidateQueries({ queryKey: ["marina-skills"] });
        if (id) await qc.invalidateQueries({ queryKey: ["marina-messages", id] });
        setState((s) => ({ streaming: false, status: null, draft: "", steps: s.steps, retry: s.retry }));
      }
    },
    [threadId, state.streaming, onThreadCreated, onDesign, qc],
  );


  const stop = useCallback(() => abortRef.current?.abort(), []);

  const retryLast = useCallback(() => {
    const pending = state.retry;
    if (!pending) return;
    setState((s) => ({ ...s, retry: null }));
    void send(pending.message, pending.options);
  }, [state.retry, send]);

  return { ...state, send, stop, retryLast };
}

// ------------------------------------------------------- habilidades e execuções

export interface MarinaSkill {
  id: string;
  name: string;
  slug: string;
  file: string;
  description?: string | null;
  when_to_use?: string | null;
  category?: string | null;
  origin: "builtin" | "user" | "auto";
  scope: "global" | "empresa";
  usage_hits: number;
  active: boolean;
  suggested: boolean;
}

export function useMarinaSkills(enabled = true) {
  return useQuery({
    queryKey: ["marina-skills"],
    enabled,
    queryFn: async () => ((await callMarina("skills")) as { skills: MarinaSkill[] }).skills ?? [],
  });
}

export function useMarinaSkillContent(id?: string) {
  return useQuery({
    queryKey: ["marina-skill", id],
    enabled: !!id,
    queryFn: async () => ((await callMarina("skill", { params: { id: id! } })) as { content: string }).content,
  });
}

function useSkillMutation(action: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (body: Record<string, unknown>) => await callMarina(action, { method: "POST", body }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["marina-skills"] }),
  });
}

export function useSaveMarinaSkill() {
  return useSkillMutation("save_skill");
}

export function useActivateMarinaSkill() {
  const m = useSkillMutation("activate_skill");
  return { ...m, mutateAsync: (id: string) => m.mutateAsync({ id }) };
}

export function useDeactivateMarinaSkill() {
  const m = useSkillMutation("deactivate_skill");
  return { ...m, mutateAsync: (id: string) => m.mutateAsync({ id }) };
}

export function useDismissMarinaSuggestion() {
  const m = useSkillMutation("dismiss_suggestion");
  return { ...m, mutateAsync: (id: string) => m.mutateAsync({ id }) };
}

export function useDeleteMarinaSkill() {
  const m = useSkillMutation("delete_skill");
  return { ...m, mutateAsync: (id: string) => m.mutateAsync({ id }) };
}

export function useMarinaRuns(enabled: boolean) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["marina-runs", user?.id],
    enabled: enabled && !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_agent_runs")
        .select("id, objective, engine, success, duration_ms, summary, created_at")
        .order("created_at", { ascending: false })
        .limit(50);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function useMarinaEnginePing() {
  return useMutation({
    mutationFn: async () => (await callMarina("ping")) as { ok: boolean; latency_ms?: number; status?: number },
  });
}

// ------------------------------------------------------- conexões do motor

export interface MarinaConnectorField {
  name: string;
  label: string;
  placeholder?: string;
  secret?: boolean;
}

export interface MarinaCatalogConnector {
  key: string;
  label: string;
  description: string;
  category: string;
  fields: MarinaConnectorField[];
  connected: boolean;
  connection_id: string | null;
}

export function useMarinaConnectorCatalog(enabled: boolean) {
  return useQuery({
    queryKey: ["marina-connector-catalog"],
    enabled,
    queryFn: async () =>
      (await callMarina("connector_catalog")) as {
        source: "engine" | "catalogo";
        catalog: MarinaCatalogConnector[];
        custom: any[];
      },
  });
}

export function useSetConnectorCredential() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { key: string; values: Record<string, string> }) =>
      await callMarina("set_connector_credential", { method: "POST", body: payload }),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["marina-connector-catalog"] });
      qc.invalidateQueries({ queryKey: ["marina-connectors"] });
    },
  });
}
