import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type VacationPeriodStatus = "open" | "partially_used" | "fully_used" | "expired";
export type VacationRequestStatus =
  | "draft"
  | "pending_manager"
  | "pending_director"
  | "pending_hr"
  | "approved"
  | "rejected"
  | "cancelled";
export type VacationRequestType = "vacation" | "sell_days" | "advance_13th";

export interface VacationPeriod {
  id: string;
  employee_id: string;
  period_start: string;
  period_end: string;
  concession_deadline: string;
  entitled_days: number;
  used_days: number;
  sold_days: number;
  status: VacationPeriodStatus;
  notes: string | null;
  ferias_vencidas?: boolean;
  proporcional_meses?: number | null;
  employee?: { id: string; full_name: string | null; position: string | null } | null;
}

export interface VacationRequest {
  id: string;
  employee_id: string;
  period_id: string | null;
  request_type: VacationRequestType;
  start_date: string;
  end_date: string;
  requested_days: number;
  sell_days: number;
  advance_13th: boolean;
  justification: string | null;
  status: VacationRequestStatus;
  manager_id: string | null;
  manager_decision_at: string | null;
  manager_comment: string | null;
  hr_decision_by: string | null;
  hr_decision_at: string | null;
  hr_comment: string | null;
  is_exception?: boolean;
  director_decision_by?: string | null;
  director_decision_at?: string | null;
  director_comment?: string | null;
  created_at: string;
  numero_parcela?: number;
  mes_referencia_texto?: string | null;
  company_id?: string | null;
  period?: {
    id: string;
    period_start: string;
    period_end: string;
    concession_deadline: string;
    entitled_days: number;
    used_days: number;
    sold_days: number;
  } | null;
  employee?: {
    id: string;
    full_name: string | null;
    position: string | null;
    department_id?: string | null;
  } | null;
}

export interface VacationBalance {
  total_entitled: number;
  total_used: number;
  total_sold: number;
  available_days: number;
  open_periods: number;
  next_deadline: string | null;
}

export const requestStatusLabel: Record<VacationRequestStatus, string> = {
  draft: "Rascunho",
  pending_manager: "Aguardando Gestor",
  pending_director: "Aguardando Diretoria",
  pending_hr: "Aguardando RH",
  approved: "Aprovado",
  rejected: "Rejeitado",
  cancelled: "Cancelado",
};

export const requestTypeLabel: Record<VacationRequestType, string> = {
  vacation: "Férias",
  sell_days: "Venda de Dias (Abono)",
  advance_13th: "Adiantamento 13º",
};

export function useVacationPeriods(employeeId?: string) {
  return useQuery({
    queryKey: ["vacation-periods", employeeId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("hr_vacation_periods")
        .select("*, employee:profiles!hr_vacation_periods_employee_id_fkey(id, full_name, position)")
        .order("period_start", { ascending: false });
      if (employeeId) q = q.eq("employee_id", employeeId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as VacationPeriod[];
    },
  });
}

export function useVacationRequests(employeeId?: string) {
  return useQuery({
    queryKey: ["vacation-requests", employeeId ?? "all"],
    queryFn: async () => {
      let q = supabase
        .from("hr_vacation_requests")
        .select(
          "*, employee:profiles!hr_vacation_requests_employee_id_fkey(id, full_name, position, department_id), period:hr_vacation_periods!hr_vacation_requests_period_id_fkey(id, period_start, period_end, concession_deadline, entitled_days, used_days, sold_days)"
        )
        .order("created_at", { ascending: false });
      if (employeeId) q = q.eq("employee_id", employeeId);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as VacationRequest[];
    },
  });
}

export function useVacationBalance(employeeId: string | undefined) {
  return useQuery({
    queryKey: ["vacation-balance", employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      const { data, error } = await supabase.rpc("get_vacation_balance", {
        _employee_id: employeeId!,
      });
      if (error) throw error;
      const row = (data as unknown as VacationBalance[])?.[0];
      return (
        row ?? {
          total_entitled: 0,
          total_used: 0,
          total_sold: 0,
          available_days: 0,
          open_periods: 0,
          next_deadline: null,
        }
      );
    },
  });
}

export function useCreateVacationRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      employee_id: string;
      period_id?: string | null;
      request_type: VacationRequestType;
      start_date: string;
      end_date: string;
      requested_days: number;
      sell_days?: number;
      advance_13th?: boolean;
      justification?: string | null;
      manager_id?: string | null;
      /** Fora do padrão (30d ou 20d + 10d de abono): exige Diretoria. */
      is_exception?: boolean;
      /** Quem está cadastrando; se for RH/Diretoria a solicitação nasce aprovada. */
      created_by_hr_id?: string | null;
    }) => {
      const { created_by_hr_id, ...rest } = payload;
      const now = new Date().toISOString();
      const isException = rest.is_exception ?? false;
      // RH/Diretoria programando: nasce aprovada, mesmo fora do padrão.
      const status: VacationRequestStatus = created_by_hr_id
        ? "approved"
        : rest.manager_id
          ? "pending_manager"
          : isException
            ? "pending_director"
            : "pending_hr";

      const { data, error } = await supabase
        .from("hr_vacation_requests")
        .insert({
          ...rest,
          sell_days: rest.sell_days ?? 0,
          advance_13th: rest.advance_13th ?? false,
          status,
          ...(created_by_hr_id && status === "approved"
            ? { hr_decision_by: created_by_hr_id, hr_decision_at: now }
            : {}),
        })
        .select()
        .single();
      if (error) throw error;

      if (created_by_hr_id && status === "approved") {
        await supabase.from("hr_vacation_approvals").insert({
          request_id: (data as { id: string }).id,
          approver_id: created_by_hr_id,
          stage: "hr",
          decision: "approved",
          comment: "Cadastrada e aprovada diretamente pelo RH",
        });
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vacation-requests"] });
      qc.invalidateQueries({ queryKey: ["vacation-balance"] });
      qc.invalidateQueries({ queryKey: ["vacation-periods"] });
      toast.success("Solicitação registrada");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}


export function useDecideVacationRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id: string;
      stage: "manager" | "director" | "hr";
      decision: "approved" | "rejected";
      comment?: string | null;
      approver_id: string;
      /** RH decidindo sem esperar o gestor direto. */
      bypass_manager?: boolean;
      /** Solicitação fora do padrão: após o gestor vai para a Diretoria. */
      is_exception?: boolean;
    }) => {
      const now = new Date().toISOString();
      const patch:
        | Record<string, string | null | undefined>
        | Record<string, unknown> = { updated_at: now };

      if (params.stage === "manager") {
        patch.manager_decision_at = now;
        patch.manager_comment = params.comment ?? null;
        patch.status =
          params.decision !== "approved"
            ? "rejected"
            : params.is_exception
              ? "pending_director"
              : "pending_hr";
      } else if (params.stage === "director") {
        patch.director_decision_by = params.approver_id;
        patch.director_decision_at = now;
        patch.director_comment = params.comment ?? null;
        patch.status = params.decision === "approved" ? "pending_hr" : "rejected";
      } else {
        patch.hr_decision_by = params.approver_id;
        patch.hr_decision_at = now;
        patch.hr_comment = params.comment ?? null;
        patch.status = params.decision === "approved" ? "approved" : "rejected";
        if (params.bypass_manager) {
          patch.manager_decision_at = now;
          patch.manager_comment = "Etapa do gestor dispensada pelo RH";
        }
      }


      const { error } = await supabase.from("hr_vacation_requests").update(patch).eq("id", params.id);
      if (error) throw error;

      await supabase.from("hr_vacation_approvals").insert({
        request_id: params.id,
        approver_id: params.approver_id,
        stage: params.stage,
        decision: params.decision,
        comment: params.comment ?? null,
      });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vacation-requests"] });
      qc.invalidateQueries({ queryKey: ["vacation-periods"] });
      qc.invalidateQueries({ queryKey: ["vacation-balance"] });
      toast.success("Decisão registrada");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCancelVacationRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("hr_vacation_requests")
        .update({ status: "cancelled" })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vacation-requests"] });
      qc.invalidateQueries({ queryKey: ["vacation-periods"] });
      toast.success("Solicitação cancelada");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function daysBetween(start: string, end: string) {
  const s = new Date(start + "T00:00:00");
  const e = new Date(end + "T00:00:00");
  return Math.max(0, Math.round((e.getTime() - s.getTime()) / 86400000) + 1);
}

/* ------------------------------------------------------------------ */
/* Conflitos                                                          */
/* ------------------------------------------------------------------ */

export type VacationConflictType =
  | "limite_tecnicos_mes"
  | "limite_ferias_mes"
  | "divisao_nao_permitida"
  | "abono_excedido"
  | "periodo_vencido"
  | "sobreposicao_datas"
  | "colaborador_inativo";

export const conflictTypeLabel: Record<VacationConflictType, string> = {
  limite_tecnicos_mes: "Técnicos simultâneos",
  limite_ferias_mes: "Limite de férias no mês",
  divisao_nao_permitida: "Divisão não permitida",
  abono_excedido: "Abono excedido",
  periodo_vencido: "Fora do limite concessivo",
  sobreposicao_datas: "Sobreposição de datas",
  colaborador_inativo: "Colaborador inativo",
};

export interface VacationConflict {
  id: string;
  programacao_id: string;
  tipo_conflito: VacationConflictType;
  descricao: string;
  resolvido: boolean;
  motivo_excecao: string | null;
  resolvido_por: string | null;
  resolvido_em: string | null;
  created_at: string;
}

export function useVacationConflicts() {
  return useQuery({
    queryKey: ["vacation-conflicts"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_vacation_conflicts")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as VacationConflict[];
    },
  });
}

export function useResolveVacationConflict() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; motivo: string; approver_id: string }) => {
      const { error } = await supabase
        .from("hr_vacation_conflicts")
        .update({
          resolvido: true,
          motivo_excecao: params.motivo,
          resolvido_por: params.approver_id,
          resolvido_em: new Date().toISOString(),
        })
        .eq("id", params.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vacation-conflicts"] });
      toast.success("Exceção registrada");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/* ------------------------------------------------------------------ */
/* Regras da empresa                                                  */
/* ------------------------------------------------------------------ */

export interface VacationRules {
  id: string;
  company_id: string;
  max_ferias_por_mes: number;
  max_tecnicos_simultaneos: number;
  max_dias_abono: number;
  max_parcelas: number;
  permite_divisao_ferias: boolean;
  permite_ferias_em_periodo_experiencia: boolean;
  antecedencia_minima_solicitacao_dias: number;
  tolerancia_sobreposicao_dias: number;
  notificar_financeiro: boolean;
  observacoes: string | null;
}

export function useVacationRules(companyId?: string | null) {
  return useQuery({
    queryKey: ["vacation-rules", companyId ?? "any"],
    queryFn: async () => {
      let q = supabase.from("hr_vacation_rules").select("*").limit(1);
      if (companyId) q = q.eq("company_id", companyId);
      const { data, error } = await q.maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as VacationRules | null;
    },
  });
}

export function useUpdateVacationRules() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: { id: string; patch: Partial<VacationRules>; updated_by?: string }) => {
      const { error } = await supabase
        .from("hr_vacation_rules")
        .update({ ...params.patch, updated_by: params.updated_by ?? null })
        .eq("id", params.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vacation-rules"] });
      toast.success("Regras atualizadas");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

/* ------------------------------------------------------------------ */
/* Utilidades                                                         */
/* ------------------------------------------------------------------ */

export function deadlineSeverity(deadline: string): "expired" | "critical" | "warning" | "ok" {
  const d = new Date(deadline + "T00:00:00");
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const diff = Math.round((d.getTime() - today.getTime()) / 86400000);
  if (diff < 0) return "expired";
  if (diff <= 90) return "critical";
  if (diff <= 180) return "warning";
  return "ok";
}
