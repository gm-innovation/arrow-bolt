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

/** Camada da peça: foto real do acervo ou composição gerada, sempre separada no Canva. */
export interface MarinaDesignLayer {
  id: string;
  role: "fundo" | "embarcacao" | "equipamento" | "pessoa" | "apoio" | string;
  label: string;
  origin: "biblioteca" | "gerada" | "falhou" | string;
  order: number;
  transparent?: boolean;
  cutout?: boolean;
  asset_name?: string | null;
  detail?: string | null;
  storage_path?: string | null;
  file_url?: string | null;
}

export interface MarinaDesign {
  id: string;
  canva_url: string | null;
  /** Origem da peça: Canva ou prévia gerada pela própria Marina. */
  source?: "canva" | "marina" | string;
  /** Motivo quando o Canva não entregou a peça. */
  fail_reason?: string | null;
  /** Trilha de etapas já registradas para esta peça. */
  steps?: MarinaDesignStep[] | null;
  status: MarinaDesignStatus | string;
  /** Camadas da peça, na ordem de trás para frente. */
  layers?: MarinaDesignLayer[] | null;


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
        (!design.updated_at || now - Date.parse(design.updated_at) < 120_000)
      ) ? 2500 : false;
    },
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

/** Mantém o pedido e refaz somente a etapa obrigatória de criação no Canva. */
export function useRetryCanvaDesign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; layer?: string; force?: boolean; full?: boolean }) =>
      await callDesign("design_retry_canva", { method: "POST", body: payload }),
    onSuccess: (_data, { id }) => {

      qc.setQueryData<MarinaDesign[]>(["marina-designs"], (rows) =>
        rows?.map((design) =>
          design.id === id
            ? {
                ...design,
                fail_reason: null,
                steps: [
                  { id: "briefing", label: "Briefing e plano de camadas", state: "andamento", started_at: new Date().toISOString(), updated_at: new Date().toISOString() },
                  { id: "camadas", label: "Camadas (fotos reais e composições)", state: "aguardando" },
                  { id: "canva_geracao", label: "Montagem no Canva", state: "aguardando" },
                  { id: "revisao", label: "Revisão automática", state: "aguardando" },
                  { id: "exportacao", label: "Exportação do Canva", state: "aguardando" },
                  { id: "guardar_preview", label: "Preview no Arrow", state: "aguardando" },
                ],

              }
            : design,
        ),
      );
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["marina-designs"] }),
  });
}

/** Ajusta as camadas do arquivo Canva existente e atualiza seu preview. */
export function useAdjustCanvaDesign() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; note: string }) =>
      await callDesign("design_adjust_canva", { method: "POST", body: payload }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ["marina-designs"] }),
  });
}

/** Refaz somente uma camada da peça e volta a aplicá-la no arquivo do Canva. */
export function useRetryDesignLayer() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: { id: string; layer: string }) =>
      await callDesign("design_retry_canva", { method: "POST", body: payload }),
    onSettled: () => qc.invalidateQueries({ queryKey: ["marina-designs"] }),
  });
}
