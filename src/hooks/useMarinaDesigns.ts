import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

const FUNCTIONS_URL = `https://${import.meta.env.VITE_SUPABASE_PROJECT_ID}.supabase.co/functions/v1/marina-chat`;

export type MarinaDesignStatus = "pendente" | "aprovado" | "ajuste_solicitado" | "descartado";

export interface MarinaDesign {
  id: string;
  canva_url: string | null;
  /** Origem da peça: Canva ou prévia gerada pela própria Marina. */
  source?: "canva" | "marina" | string;
  /** Motivo quando o Canva não entregou a peça. */
  fail_reason?: string | null;
  status: MarinaDesignStatus | string;

  profile: string;
  title: string | null;
  prompt?: string | null;
  adjust_note?: string | null;
  export_format?: string | null;
  storage_path?: string | null;
  export_url?: string | null;
  file_url?: string | null;
  approved_at?: string | null;
  conversation_id?: string | null;
  created_at: string;
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
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error || "Não foi possível concluir a ação.");
  return json;
}

/** Todos os designs pedidos por esta pessoa (pendentes, aprovados, descartados). */
export function useMarinaDesigns(enabled = true) {
  return useQuery({
    queryKey: ["marina-designs"],
    enabled,
    queryFn: async () => ((await callDesign("designs")) as { designs: MarinaDesign[] }).designs ?? [],
  });
}

/** Aprova o design: pede a exportação e guarda o arquivo no Arrow. */
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
