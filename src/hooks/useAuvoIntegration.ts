import { useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export type DiscrepancyClassification =
  | "match"
  | "quantity_mismatch"
  | "stock_not_reported"
  | "reported_not_in_stock"
  | "stock_returned"
  | "cross_os_matched"
  | "unidentified";

export interface AuvoDiscrepancy {
  id: string;
  auvo_task_uid: string;
  service_group_id: string | null;
  order_number: string | null;
  item_name: string;
  external_product_id?: number | null;
  external_product_code: string | null;
  stock_quantity: number;
  reported_quantity: number | null;
  unit_value: number;
  value_at_risk: number;
  classification: DiscrepancyClassification;
  severity: "low" | "medium" | "high";
  ai_notes: string | null;
  returned_quantity?: number | null;
  return_reference?: string | null;
  matched_group_id?: string | null;
  matched_order_number?: string | null;
  matched_quantity?: number | null;
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
export interface AuvoPhotoFinding {
  id: string;
  auvo_task_uid: string;
  service_group_id: string | null;
  order_number: string | null;
  activity: string;
  expected_evidence: string | null;
  severity: "low" | "medium" | "high";
  ai_notes: string | null;
  photo_count: number;
  /** Fotos mais próximas da atividade, para conferência humana. */
  candidate_photos: Array<{ url: string; caption: string | null }> | null;
  /** "captions" = confronto por legenda; "vision" = confirmado por análise visual. */
  evidence_source: "captions" | "vision" | null;
  review_status: string;
  review_notes: string | null;
  created_at: string;
  /** Atendimento de origem — o mesmo nº de OS pode reunir serviços distintos. */
  auvo_tasks?: {
    auvo_task_id: string | null;
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
  progress_message: string | null;
  current_block: string | null;
  heartbeat_at: string | null;
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
  service_group_id: string | null;
  unlinked_from_group: boolean;
}



interface SyncArgs {
  period_start?: string;
  period_end?: string;
}

export const useAuvoIntegration = (filters?: {
  onlyDivergent?: boolean;
  /** Sinaliza que há fila de análise externa em andamento (grupos pendentes). */
  live?: boolean;
}) => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const companyId = profile?.company_id;

  // Atualização viva: enquanto a IA está processando, as listas se atualizam
  // sozinhas para o revisor começar antes do fim do lote.
  const liveRef = useRef(false);
  const liveInterval = () => (liveRef.current ? 8000 : false);

  const discrepanciesQuery = useQuery({
    queryKey: ["auvo-discrepancies", companyId, filters?.onlyDivergent],
    queryFn: async () => {
      let query = supabase
        .from("auvo_material_discrepancies")
        .select(
          `id, auvo_task_uid, service_group_id, order_number, item_name, external_product_code, stock_quantity,
           reported_quantity, unit_value, value_at_risk, classification, severity, ai_notes,
           returned_quantity, return_reference,
           review_status, review_notes, created_at,
           auvo_tasks:auvo_task_uid ( auvo_task_id, customer_name, technician_name, task_date, auvo_task_type )`,
        )

        .order("value_at_risk", { ascending: false })
        .limit(500);

      // "match" e "stock_returned" são linhas informativas, não pendências.
      if (filters?.onlyDivergent) {
        query = query.not("classification", "in", "(match,stock_returned)");
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data ?? []) as unknown as AuvoDiscrepancy[];
    },
    enabled: !!companyId,
    refetchInterval: liveInterval,
  });

  // Auditoria de evidência fotográfica: atividades declaradas sem foto.
  const photoFindingsQuery = useQuery({
    queryKey: ["auvo-photo-findings", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("auvo_photo_findings")
        .select(
          `id, auvo_task_uid, service_group_id, order_number, activity, expected_evidence, severity, ai_notes,
           photo_count, candidate_photos, evidence_source, review_status, review_notes, created_at,
           auvo_tasks:auvo_task_uid ( auvo_task_id, technician_name, task_date, auvo_task_type )`,
        )
        .order("created_at", { ascending: false })
        .limit(1000);

      if (error) throw error;
      return (data ?? []) as unknown as AuvoPhotoFinding[];
    },
    enabled: !!companyId,
    refetchInterval: liveInterval,
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
    // Enquanto há ingestão em background, acompanhamos o progresso.
    refetchInterval: (query) =>
      (query.state.data ?? []).some((r) => r.status === "running") ? 8000 : false,
  });


  const tasksQuery = useQuery({
    queryKey: ["auvo-tasks", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("auvo_tasks")
        .select(
          "id, auvo_task_id, order_number, auvo_task_type, customer_name, vessel_name, technician_name, task_date, checkin_at, checkout_at, address, orientation, service_order_id, promoted_at, service_group_id, unlinked_from_group",
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

      // A ingestão roda em background na função: aguardamos a execução terminar.
      const runId = data.run_id as string | undefined;
      let ingested = { tasks: 0, reports: 0 };
      if (runId) {
        for (let attempt = 0; attempt < 180; attempt++) {
          await new Promise((resolve) => setTimeout(resolve, 5000));
          const { data: run } = await supabase
            .from("auvo_sync_runs")
            .select("status, tasks_fetched, reports_fetched, error_message")
            .eq("id", runId)
            .maybeSingle();
          queryClient.invalidateQueries({ queryKey: ["auvo-sync-runs"] });
          if (!run) continue;
          if (run.status === "error") throw new Error(run.error_message ?? "Falha na ingestão.");
          if (run.status === "success") {
            ingested = { tasks: run.tasks_fetched ?? 0, reports: run.reports_fetched ?? 0 };
            break;
          }
        }
      }

      // A análise com IA roda em lotes curtos para não estourar o tempo da função.
      let analyzed = 0;
      let discrepancies = 0;
      let remaining = 1;

      for (let round = 0; round < 80 && remaining > 0; round++) {
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
        tasks_fetched: ingested.tasks,
        reports_fetched: ingested.reports,
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
            ? `${data.pending_analysis} serviços ficaram na fila — rode novamente para concluir.`
            : `${data.analyzed} serviços analisados pela IA.`,
        },
      );
      queryClient.invalidateQueries({ queryKey: ["auvo-discrepancies"] });
      queryClient.invalidateQueries({ queryKey: ["auvo-sync-runs"] });
      queryClient.invalidateQueries({ queryKey: ["auvo-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["auvo-service-groups"] });
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

  // Revisão em lote: todas as divergências de um serviço/OS de uma só vez.
  const reviewDiscrepanciesBulk = useMutation({
    mutationFn: async (
      decisions: {
        id: string;
        review_status: "confirmed" | "justified" | "dismissed";
        review_notes?: string;
      }[],
    ) => {
      const reviewed_at = new Date().toISOString();
      for (const decision of decisions) {
        const { error } = await supabase
          .from("auvo_material_discrepancies")
          .update({
            review_status: decision.review_status,
            review_notes: decision.review_notes ?? null,
            reviewed_by: profile?.id,
            reviewed_at,
          })
          .eq("id", decision.id);
        if (error) throw error;
      }
      return decisions.length;
    },
    onSuccess: (count) => {
      toast.success(`${count} ${count === 1 ? "divergência" : "divergências"} revisadas`);
      queryClient.invalidateQueries({ queryKey: ["auvo-discrepancies"] });
    },
    onError: (error: Error) => toast.error("Erro ao salvar revisões", { description: error.message }),
  });

  // Revisão em lote das lacunas de evidência fotográfica.
  const reviewPhotoFindingsBulk = useMutation({
    mutationFn: async (
      decisions: {
        id: string;
        review_status: "confirmed" | "justified" | "dismissed";
        review_notes?: string;
      }[],
    ) => {
      const reviewed_at = new Date().toISOString();
      for (const decision of decisions) {
        const { error } = await supabase
          .from("auvo_photo_findings")
          .update({
            review_status: decision.review_status,
            review_notes: decision.review_notes ?? null,
            reviewed_by: profile?.id,
            reviewed_at,
          })
          .eq("id", decision.id);
        if (error) throw error;
      }
      return decisions.length;
    },
    onSuccess: (count) => {
      toast.success(`${count} ${count === 1 ? "lacuna" : "lacunas"} de foto revisadas`);
      queryClient.invalidateQueries({ queryKey: ["auvo-photo-findings"] });
    },
    onError: (error: Error) =>
      toast.error("Erro ao salvar revisão de fotos", { description: error.message }),
  });


  // Promove um atendimento espelhado do Auvo para uma OS nativa do Arrow,
  // reaproveitando (ou criando) cliente e embarcação pelo nome vindo do Auvo.
  const promoteToOS = useMutation({
    mutationFn: async (task: AuvoTaskRow) => {
      if (!companyId) throw new Error("Empresa não identificada");
      if (task.service_order_id) throw new Error("Atendimento já promovido a OS");

      const orderNumber = (task.order_number || `AUVO-${task.auvo_task_id}`).slice(0, 50);

      const { data: existingOrder } = await supabase
        .from("service_orders")
        .select("id")
        .eq("company_id", companyId)
        .eq("order_number", orderNumber)
        .maybeSingle();
      if (existingOrder) throw new Error(`Já existe uma OS ${orderNumber} no Arrow`);

      // Cliente
      let clientId: string | null = null;
      const clientName = task.customer_name?.trim();
      if (clientName) {
        const { data: found } = await supabase
          .from("clients")
          .select("id")
          .eq("company_id", companyId)
          .ilike("name", clientName)
          .limit(1)
          .maybeSingle();
        if (found) {
          clientId = found.id;
        } else {
          const { data: created, error: clientError } = await supabase
            .from("clients")
            .insert({ company_id: companyId, name: clientName })
            .select("id")
            .single();
          if (clientError) throw clientError;
          clientId = created.id;
        }
      }

      // Embarcação (depende do cliente)
      let vesselId: string | null = null;
      const vesselName = task.vessel_name?.trim();
      if (vesselName && clientId) {
        const { data: foundVessel } = await supabase
          .from("vessels")
          .select("id")
          .eq("client_id", clientId)
          .ilike("name", vesselName)
          .limit(1)
          .maybeSingle();
        if (foundVessel) {
          vesselId = foundVessel.id;
        } else {
          const { data: createdVessel, error: vesselError } = await supabase
            .from("vessels")
            .insert({ client_id: clientId, name: vesselName })
            .select("id")
            .single();
          if (vesselError) throw vesselError;
          vesselId = createdVessel.id;
        }
      }

      const descriptionParts = [
        task.auvo_task_type ? `Tipo Auvo: ${task.auvo_task_type}` : null,
        task.orientation?.trim() || null,
        task.technician_name ? `Técnico no Auvo: ${task.technician_name}` : null,
        `Importado do Auvo (atendimento ${task.auvo_task_id}).`,
      ].filter(Boolean);

      const { data: order, error: orderError } = await supabase
        .from("service_orders")
        .insert({
          company_id: companyId,
          order_number: orderNumber,
          client_id: clientId,
          vessel_id: vesselId,
          status: task.checkout_at ? "completed" : "pending",
          scheduled_date: task.task_date,
          completed_date: task.checkout_at ? task.checkout_at.slice(0, 10) : null,
          service_date_time: task.checkin_at,
          location: task.address,
          description: descriptionParts.join("\n"),
          created_by: profile?.id,
        })
        .select("id, order_number")
        .single();
      if (orderError) throw orderError;

      const { error: linkError } = await supabase
        .from("auvo_tasks")
        .update({
          service_order_id: order.id,
          promoted_at: new Date().toISOString(),
          promoted_by: profile?.id,
        })
        .eq("id", task.id);
      if (linkError) throw linkError;

      return order;
    },
    onSuccess: (order) => {
      toast.success(`OS ${order.order_number} criada no Arrow`, {
        description: "Cliente, embarcação e datas foram preenchidos a partir do Auvo.",
      });
      queryClient.invalidateQueries({ queryKey: ["auvo-tasks"] });
      queryClient.invalidateQueries({ queryKey: ["service-orders"] });
    },
    onError: (error: Error) => toast.error("Erro ao promover para OS", { description: error.message }),
  });


  // Progresso da auditoria de evidência fotográfica (backfill por relatório).
  const photoAuditProgressQuery = useQuery({
    queryKey: ["auvo-photo-audit-progress", companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("auvo_task_reports")
        .select("photo_audit_status")
        .eq("company_id", companyId!);
      if (error) throw error;
      const rows = (data ?? []) as Array<{ photo_audit_status: string | null }>;
      const count = (status: string) =>
        rows.filter((r) => (r.photo_audit_status ?? "pending") === status).length;
      return {
        total: rows.length,
        pending: count("pending"),
        gaps: count("gaps"),
        ok: count("ok"),
        skipped: count("skipped"),
        error: count("error"),
      };
    },
    enabled: !!companyId,
    // Enquanto restam relatórios na fila de fotos, o progresso se atualiza sozinho.
    refetchInterval: (q) => ((q.state.data?.pending ?? 0) > 0 ? 10000 : false),
  });

  const runPhotoAudit = useMutation({
    mutationFn: async (rounds?: number) => {
      const maxRounds = rounds ?? 20;
      let processed = 0;
      let gaps = 0;
      let skipped = 0;
      let failed = 0;
      let remaining = 1;

      for (let round = 0; round < maxRounds && remaining > 0; round++) {
        const { data, error } = await supabase.functions.invoke("auvo-sync", {
          body: { mode: "photo_audit_batch", limit: 8 },
        });
        if (error) throw error;
        if (data?.error) throw new Error(data.message ?? data.error);
        processed += data.processed ?? 0;
        gaps += data.gaps ?? 0;
        skipped += data.skipped ?? 0;
        failed += data.failed ?? 0;
        remaining = data.remaining ?? 0;
        queryClient.invalidateQueries({ queryKey: ["auvo-photo-audit-progress"] });
        queryClient.invalidateQueries({ queryKey: ["auvo-photo-findings"] });
        if (!data.processed && !data.skipped) break;
      }

      return { processed, gaps, skipped, failed, remaining };
    },
    onSuccess: (result) => {
      toast.success(`Auditoria de fotos: ${result.processed} relatórios analisados`, {
        description: result.remaining
          ? `${result.gaps} lacunas encontradas · ${result.remaining} relatórios ainda na fila.`
          : `${result.gaps} lacunas encontradas · fila concluída.`,
      });
      queryClient.invalidateQueries({ queryKey: ["auvo-photo-findings"] });
      queryClient.invalidateQueries({ queryKey: ["auvo-photo-audit-progress"] });
    },
    onError: (error: Error) =>
      toast.error("Erro na auditoria de fotos", { description: error.message }),
  });

  const resetPhotoAudit = useMutation({
    mutationFn: async (reportId: string) => {
      const { error } = await supabase
        .from("auvo_task_reports")
        .update({ photo_audit_status: "pending", photo_audit_notes: null })
        .eq("id", reportId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Relatório recolocado na fila de auditoria de fotos");
      queryClient.invalidateQueries({ queryKey: ["auvo-photo-audit-progress"] });
    },
    onError: (error: Error) =>
      toast.error("Erro ao reprocessar", { description: error.message }),
  });

  const photoAuditPending = photoAuditProgressQuery.data?.pending ?? 0;
  const isProcessing =
    !!filters?.live ||
    photoAuditPending > 0 ||
    (runsQuery.data ?? []).some((r) => r.status === "running") ||
    runPhotoAudit.isPending ||
    runSync.isPending;
  liveRef.current = isProcessing;

  const discrepancies = discrepanciesQuery.data ?? [];

  const divergent = discrepancies.filter(
    (d) => d.classification !== "match" && d.classification !== "stock_returned",
  );
  const photoFindings = photoFindingsQuery.data ?? [];

  const stats = {
    auditedOrders: new Set(discrepancies.map((d) => d.order_number).filter(Boolean)).size,
    totalItems: discrepancies.length,
    divergentItems: divergent.length,
    pendingReview: divergent.filter((d) => d.review_status === "pending").length,
    valueAtRisk: divergent.reduce((sum, d) => sum + Number(d.value_at_risk || 0), 0),
    stockNotReported: divergent.filter((d) => d.classification === "stock_not_reported").length,
    quantityMismatch: divergent.filter((d) => d.classification === "quantity_mismatch").length,
    reportedNotInStock: divergent.filter((d) => d.classification === "reported_not_in_stock").length,
    stockReturned: discrepancies.filter((d) => d.classification === "stock_returned").length,
    photoGaps: photoFindings.length,
    photoGapsPending: photoFindings.filter((f) => f.review_status === "pending").length,
  };

  return {
    discrepancies,
    divergent,
    photoFindings,
    stats,
    runs: runsQuery.data ?? [],
    tasks: tasksQuery.data ?? [],
    isLoading: discrepanciesQuery.isLoading || runsQuery.isLoading,
    runSync,
    reanalyzeTask,
    reviewDiscrepancy,
    reviewDiscrepanciesBulk,
    reviewPhotoFindingsBulk,
    promoteToOS,
    photoAuditProgress: photoAuditProgressQuery.data ?? null,
    isProcessing,
    runPhotoAudit,
    resetPhotoAudit,



  };
};
