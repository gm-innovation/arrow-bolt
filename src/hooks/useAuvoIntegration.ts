import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type DiscrepancyClassification =
  | "match"
  | "quantity_mismatch"
  | "stock_not_reported"
  | "reported_not_in_stock"
  | "unidentified";

export interface AuvoDiscrepancy {
  id: string;
  auvo_task_uid: string;
  order_number: string | null;
  item_name: string;
  external_product_code: string | null;
  stock_quantity: number;
  reported_quantity: number | null;
  unit_value: number;
  value_at_risk: number;
  classification: DiscrepancyClassification;
  severity: "low" | "medium" | "high";
  ai_notes: string | null;
  review_status: string;
  review_notes: string | null;
  created_at: string;
  auvo_tasks?: {
    auvo_task_id: string;
    customer_name: string | null;
    technician_name: string | null;
    task_date: string | null;
    auvo_task_type: string | null;
  } | null;
}

export interface AuvoSyncRun {
  id: string;
  trigger_source: string;
  period_start: string;
  period_end: string;
  status: string;
  tasks_fetched: number;
  reports_fetched: number;
  discrepancies_found: number;
  error_message: string | null;
  started_at: string;
  finished_at: string | null;
}

export interface AuvoTaskRow {
  id: string;
  auvo_task_id: string;
  order_number: string | null;
  auvo_task_type: string | null;
  customer_name: string | null;
  vessel_name: string | null;
  technician_name: string | null;
  task_date: string | null;
  checkin_at: string | null;
  checkout_at: string | null;
  address: string | null;
  orientation: string | null;
  service_order_id: string | null;
  promoted_at: string | null;
}


interface SyncArgs {
  period_start?: string;
  period_end?: string;
}

export const useAuvoIntegration = (filters?: { onlyDivergent?: boolean }) => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const companyId = profile?.company_id;

  const discrepanciesQuery = useQuery({
    queryKey: ["auvo-discrepancies", companyId, filters?.onlyDivergent],
    queryFn: async () => {
      let query = supabase
        .from("auvo_material_discrepancies")
        .select(
          `id, auvo_task_uid, order_number, item_name, external_product_code, stock_quantity,
           reported_quantity, unit_value, value_at_risk, classification, severity, ai_notes,
           review_status, review_notes, created_at,
           auvo_tasks:auvo_task_uid ( auvo_task_id, customer_name, technician_name, task_date, auvo_task_type )`,
        )
        .order("value_at_risk", { ascending: false })
        .limit(500);

      if (filters?.onlyDivergent) query = query.neq("classification", "match");

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as AuvoDiscrepancy[];
    },
    enabled: !!companyId,
  });

  const runsQuery = useQuery({
    queryKey: ["auvo-sync-runs", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("auvo_sync_runs")
        .select("*")
        .order("started_at", { ascending: false })
        .limit(20);
      if (error) throw error;
      return (data ?? []) as unknown as AuvoSyncRun[];
    },
    enabled: !!companyId,
  });

  const tasksQuery = useQuery({
    queryKey: ["auvo-tasks", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("auvo_tasks")
        .select(
          "id, auvo_task_id, order_number, auvo_task_type, customer_name, technician_name, task_date, checkin_at, checkout_at, service_order_id",
        )
        .order("task_date", { ascending: false, nullsFirst: false })
        .limit(300);
      if (error) throw error;
      return (data ?? []) as unknown as AuvoTaskRow[];
    },
    enabled: !!companyId,
  });

  const runSync = useMutation({
    mutationFn: async (args: SyncArgs = {}) => {
      const { data, error } = await supabase.functions.invoke("auvo-sync", {
        body: { mode: "sync", ...args },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.message ?? data.error);

      // A análise com IA roda em lotes curtos para não estourar o tempo da função.
      let analyzed = 0;
      let discrepancies = 0;
      let remaining = data.pending_analysis ?? 0;

      for (let round = 0; round < 40 && remaining > 0; round++) {
        const { data: batch, error: batchError } = await supabase.functions.invoke("auvo-sync", {
          body: { mode: "analyze_batch", limit: 4 },
        });
        if (batchError || batch?.error) break;
        analyzed += batch.processed ?? 0;
        discrepancies += batch.discrepancies ?? 0;
        remaining = batch.remaining ?? 0;
        queryClient.invalidateQueries({ queryKey: ["auvo-discrepancies"] });
        if (!batch.processed) break;
      }

      return {
        tasks_fetched: data.tasks_fetched as number,
        reports_fetched: data.reports_fetched as number,
        analyzed,
        discrepancies_found: discrepancies,
        pending_analysis: remaining,
      };
    },
    onSuccess: (data) => {
      toast.success(
        `Sincronização concluída: ${data.tasks_fetched} atendimentos, ${data.discrepancies_found} divergências`,
        {
          description: data.pending_analysis
            ? `${data.pending_analysis} relatórios ficaram na fila — rode novamente para concluir.`
            : `${data.analyzed} relatórios analisados pela IA.`,
        },
      );
      queryClient.invalidateQueries({ queryKey: ["auvo-discrepancies"] });
      queryClient.invalidateQueries({ queryKey: ["auvo-sync-runs"] });
      queryClient.invalidateQueries({ queryKey: ["auvo-tasks"] });
    },
    onError: (error: Error) => toast.error("Erro na sincronização", { description: error.message }),
  });

  const reanalyzeTask = useMutation({
    mutationFn: async (taskUid: string) => {
      const { data, error } = await supabase.functions.invoke("auvo-sync", {
        body: { mode: "analyze", task_uid: taskUid },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.message ?? data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("Relatório reanalisado");
      queryClient.invalidateQueries({ queryKey: ["auvo-discrepancies"] });
    },
    onError: (error: Error) => toast.error("Erro ao reanalisar", { description: error.message }),
  });

  const reviewDiscrepancy = useMutation({
    mutationFn: async ({
      id,
      review_status,
      review_notes,
    }: {
      id: string;
      review_status: "confirmed" | "justified" | "dismissed";
      review_notes?: string;
    }) => {
      const { error } = await supabase
        .from("auvo_material_discrepancies")
        .update({
          review_status,
          review_notes: review_notes ?? null,
          reviewed_by: profile?.id,
          reviewed_at: new Date().toISOString(),
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Divergência atualizada");
      queryClient.invalidateQueries({ queryKey: ["auvo-discrepancies"] });
    },
    onError: (error: Error) => toast.error("Erro ao atualizar", { description: error.message }),
  });

  const discrepancies = discrepanciesQuery.data ?? [];
  const divergent = discrepancies.filter((d) => d.classification !== "match");

  const stats = {
    auditedOrders: new Set(discrepancies.map((d) => d.order_number).filter(Boolean)).size,
    totalItems: discrepancies.length,
    divergentItems: divergent.length,
    pendingReview: divergent.filter((d) => d.review_status === "pending").length,
    valueAtRisk: divergent.reduce((sum, d) => sum + Number(d.value_at_risk || 0), 0),
    stockNotReported: divergent.filter((d) => d.classification === "stock_not_reported").length,
    quantityMismatch: divergent.filter((d) => d.classification === "quantity_mismatch").length,
    reportedNotInStock: divergent.filter((d) => d.classification === "reported_not_in_stock").length,
  };

  return {
    discrepancies,
    divergent,
    stats,
    runs: runsQuery.data ?? [],
    tasks: tasksQuery.data ?? [],
    isLoading: discrepanciesQuery.isLoading || runsQuery.isLoading,
    runSync,
    reanalyzeTask,
    reviewDiscrepancy,
  };
};
