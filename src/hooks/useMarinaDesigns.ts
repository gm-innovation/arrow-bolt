import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const FUNCTIONS_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/marina-chat`;

export type MarinaDesignStatus = "pendente" | "aprovado" | "ajuste_solicitado" | "descartado";

/** Etapa da produção da peça, com tempo gasto. */
export interface MarinaDesignStep {
  id: string;
  label: string;
  state: "aguardando" | "andamento" | "concluida" | "falhou" | "cancelada";
  ms?: number;
  detail?: string;
  started_at?: string;
  updated_at?: string;
}

/** Briefing preenchido no formulário "Criar post". */
export interface MarinaDesignForm {
  size: "quadrado" | "feed" | "paisagem" | "story";
  theme?: string;
  title: string;
  subtitle?: string;
  cta?: string;
  /** Cor predominante ou estilo, texto livre. */
  style: string;
  background?: string;
  /** Público-alvo da peça. */
  audience?: string;
  logo?: boolean;
  /** Logo enviada pelo usuário (URL assinada). */
  logo_url?: string;
  variations?: number;
}

/** Sobe uma imagem do formulário e devolve uma URL assinada para o motor. */
export async function uploadDesignImage(file: File): Promise<string> {
  const { data: session } = await supabase.auth.getUser();
  const userId = session.user?.id;
  if (!userId) throw new Error("Sessão expirada.");
  const safe = file.name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.\-_]/g, "-");
  const path = `${userId}/briefing/${Date.now()}-${safe}`;
  const { error } = await supabase.storage.from("marina-designs").upload(path, file, {
    cacheControl: "3600",
    upsert: false,
  });
  if (error) throw error;
  const { data, error: signError } = await supabase.storage
    .from("marina-designs")
    .createSignedUrl(path, 60 * 60 * 12);
  if (signError || !data?.signedUrl) throw signError ?? new Error("Não consegui preparar a imagem enviada.");
  return data.signedUrl;
}


export interface MarinaDesign {
  id: string;
  canva_url: string | null;
  /** Lote: todas as variações de um mesmo pedido compartilham este id. */
  batch_id?: string | null;
  variant_index?: number | null;
  /** Briefing usado no pedido. */
  form?: MarinaDesignForm | null;
  source?: "canva" | "marina" | string;
  fail_reason?: string | null;
  steps?: MarinaDesignStep[] | null;
  status: MarinaDesignStatus | string;

  profile: string;
  title: string | null;
  prompt?: string | null;
  adjust_note?: string | null;
  export_format?: string | null;
  storage_path?: string | null;
  /** PNG exportado do Canva (link direto devolvido pelo motor). */
  preview_url?: string | null;
  export_url?: string | null;
  /** Prévia guardada no Arrow (URL assinada). */
  file_url?: string | null;
  approved_at?: string | null;
  conversation_id?: string | null;
  created_at: string;
  updated_at?: string;
}

async function callDesign(action: string, init?: { method?: string; body?: unknown }) {
  const { data } = await supabase.auth.getSession();
  const res = await fetch(`${FUNCTIONS_URL}?action=${action}`, {
    method: init?.method ?? "GET",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${data.session?.access_token ?? ""}`,
      apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY as string,
    },
    ...(init?.body ? { body: JSON.stringify(init.body) } : {}),
  });
  const raw = await res.text().catch(() => "");
  let json: any = {};
  try {
    json = raw ? JSON.parse(raw) : {};
  } catch {
    json = {};
  }
  if (!res.ok) throw new Error(json?.message || json?.error || (raw ? raw.slice(0, 240) : "Não foi possível concluir a ação."));
  return json;
}

/** Todos os designs pedidos por esta pessoa (pendentes, aprovados, descartados). */
export function useMarinaDesigns(enabled = true) {
  return useQuery({
    queryKey: ["marina-designs"],
    enabled,
    refetchOnWindowFocus: true,
    refetchInterval: (query) => {
      const rows = query.state.data as MarinaDesign[] | undefined;
      const now = Date.now();
      return rows?.some((design) =>
        design.steps?.some((step) => step.state === "andamento") &&
        (!design.updated_at || now - Date.parse(design.updated_at) < 15 * 60_000)
      ) ? 4000 : false;
    },
    queryFn: async () => ((await callDesign("designs")) as { designs: MarinaDesign[] }).designs ?? [],
  });
}

/** Cria o pedido pelo formulário: o motor gera as variações no Canva. */
export function useCreateDesign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      form: MarinaDesignForm;
      profile?: string;
      conversation_id?: string | null;
      references?: string[];
    }) =>
      (await callDesign("design_create", { method: "POST", body: payload })) as {
        design: MarinaDesign;
        design_id: string;
        batch_id: string;
      },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["marina-designs"] }),
  });
}

/** Aprova o design: guarda o arquivo aprovado no Arrow. */
export function useApproveDesign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; format: "png" | "jpg" | "pdf" }) =>
      (await callDesign("design_approve", { method: "POST", body: payload })) as {
        design: MarinaDesign;
        warning: string | null;
      },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["marina-designs"] }),
  });
}

/** Marca ajuste solicitado ou descarte. */
export function useSetDesignStatus() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; status: MarinaDesignStatus; note?: string }) =>
      await callDesign("design_status", { method: "POST", body: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["marina-designs"] }),
  });
}

/** Pede ao motor uma nova geração do mesmo briefing. */
export function useRetryCanvaDesign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; force?: boolean }) =>
      await callDesign("design_retry_canva", { method: "POST", body: payload }),
    onSuccess: (_data, { id }) => {
      qc.setQueryData<MarinaDesign[]>(["marina-designs"], (rows) =>
        rows?.map((design) => (design.id === id ? { ...design, fail_reason: null } : design)),
      );
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["marina-designs"] }),
  });
}

/** Ajusta a peça: o motor gera a nova versão a partir do design do Canva. */
export function useAdjustCanvaDesign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; note: string }) =>
      await callDesign("design_adjust_canva", { method: "POST", body: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["marina-designs"] }),
  });
}
