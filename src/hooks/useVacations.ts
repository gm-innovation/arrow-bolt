import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export type VacationPeriodStatus = "open" | "partially_used" | "fully_used" | "expired";
export type VacationRequestStatus =
  | "draft"
  | "pending_manager"
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
  created_at: string;
  employee?: { id: string; full_name: string | null; position: string | null } | null;
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
        .select("*, employee:profiles!hr_vacation_requests_employee_id_fkey(id, full_name, position)")
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
    }) => {
      const { data, error } = await supabase
        .from("hr_vacation_requests")
        .insert({
          ...payload,
          sell_days: payload.sell_days ?? 0,
          advance_13th: payload.advance_13th ?? false,
          status: "pending_manager",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["vacation-requests"] });
      qc.invalidateQueries({ queryKey: ["vacation-balance"] });
      toast.success("Solicitação enviada");
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDecideVacationRequest() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (params: {
      id: string;
      stage: "manager" | "hr";
      decision: "approved" | "rejected";
      comment?: string | null;
      approver_id: string;
    }) => {
      const now = new Date().toISOString();
      const patch:
        | Record<string, string | null | undefined>
        | Record<string, unknown> = { updated_at: now };

      if (params.stage === "manager") {
        patch.manager_decision_at = now;
        patch.manager_comment = params.comment ?? null;
        patch.status = params.decision === "approved" ? "pending_hr" : "rejected";
      } else {
        patch.hr_decision_by = params.approver_id;
        patch.hr_decision_at = now;
        patch.hr_comment = params.comment ?? null;
        patch.status = params.decision === "approved" ? "approved" : "rejected";
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
