import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface AuvoServiceGroup {
  id: string;
  service_key: string;
  order_numbers: string[] | null;
  primary_order_number: string | null;
  customer_name: string | null;
  vessel_name: string | null;
  first_task_date: string | null;
  last_task_date: string | null;
  is_similarity_grouped: boolean;
  grouping_reason: string | null;
  merge_reason: string | null;
  merged_from: unknown;
  analysis_status: string;
  analyzed_at: string | null;
  analysis_error: string | null;
  analysis_attempts: number | null;
  analysis_last_attempt_at: string | null;
}

export interface AuvoMergeCandidate {
  id: string;
  service_key: string;
  primary_order_number: string | null;
  order_numbers: string[];
  customer_name: string | null;
  vessel_name: string | null;
  first_task_date: string | null;
  last_task_date: string | null;
}

export interface AuvoMergeSuggestion {
  primary: AuvoMergeCandidate;
  duplicate: AuvoMergeCandidate;
  reason: string;
}

export interface AuvoMergeDismissal {
  id: string;
  group_a_id: string;
  group_b_id: string;
  reason: string | null;
  dismissed_by: string | null;
  created_at: string;
}




export interface AuvoServiceMember {
  id: string;
  auvo_task_id: string;
  order_number: string | null;
  auvo_task_type: string | null;
  customer_name: string | null;
  vessel_name: string | null;
  task_date: string | null;
  technician_name: string | null;
  service_group_id: string | null;
  unlinked_from_group: boolean;
  hasReport: boolean;
}


/**
 * Serviços do Auvo: um serviço reúne todos os atendimentos e relatórios do mesmo
 * trabalho, ainda que a OS tenha ficado meses aberta ou tenha mais de um número.
 */
export const useAuvoServiceGroups = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const companyId = profile?.company_id;

  const query = useQuery({
    queryKey: ["auvo-service-groups", companyId],
    enabled: !!companyId,
    // Enquanto há serviços na fila, a lista se atualiza sozinha para o revisor
    // ver os achados surgindo sem esperar o fim do processamento.
    refetchInterval: (q) =>
      (q.state.data?.groups ?? []).some((g) => g.analysis_status === "pending") ? 10000 : false,
    queryFn: async () => {
      // O backend devolve no máximo 1000 linhas por consulta, independente do
      // .limit(): sem paginação, atendimentos e relatórios acima disso ficavam
      // de fora e apareciam como "sem relatório".
      const fetchAll = async <T,>(
        table: "auvo_tasks" | "auvo_task_reports",
        columns: string,
        order?: { column: string; ascending: boolean },
      ): Promise<T[]> => {
        const PAGE = 1000;
        const out: T[] = [];
        for (let page = 0; page < 50; page++) {
          let q = supabase
            .from(table)
            .select(columns)
            .range(page * PAGE, page * PAGE + PAGE - 1);
          if (order) {
            q = q.order(order.column, { ascending: order.ascending, nullsFirst: false });
          }
          const { data, error } = await q;
          if (error) throw error;
          const rows = (data ?? []) as unknown as T[];
          out.push(...rows);
          if (rows.length < PAGE) break;
        }
        return out;
      };

      const [groupsRes, taskRows, reportRows] = await Promise.all([
        supabase
          .from("auvo_service_groups")
          .select(
            "id, service_key, order_numbers, primary_order_number, customer_name, vessel_name, first_task_date, last_task_date, is_similarity_grouped, grouping_reason, merge_reason, merged_from, analysis_status, analyzed_at, analysis_error, analysis_attempts, analysis_last_attempt_at",
          )
          .order("last_task_date", { ascending: false, nullsFirst: false })
          .limit(1000),
        fetchAll<Record<string, unknown>>(
          "auvo_tasks",
          "id, auvo_task_id, order_number, auvo_task_type, customer_name, vessel_name, task_date, technician_name, service_group_id, unlinked_from_group",
          { column: "task_date", ascending: true },
        ),
        fetchAll<{ auvo_task_uid: string; report_text: string | null }>(
          "auvo_task_reports",
          "auvo_task_uid, report_text",
        ),
      ]);

      if (groupsRes.error) throw groupsRes.error;

      const withReport = new Set(
        reportRows
          .filter((r) => (r.report_text ?? "").trim().length > 0)
          .map((r) => r.auvo_task_uid),
      );

      const members = taskRows.map((t) => ({
        ...(t as unknown as Omit<AuvoServiceMember, "hasReport">),
        hasReport: withReport.has(t.id as string),
      })) as AuvoServiceMember[];


      const membersByGroup = new Map<string, AuvoServiceMember[]>();
      for (const member of members) {
        if (!member.service_group_id) continue;
        const list = membersByGroup.get(member.service_group_id) ?? [];
        list.push(member);
        membersByGroup.set(member.service_group_id, list);
      }

      return {
        groups: (groupsRes.data ?? []) as unknown as AuvoServiceGroup[],
        membersByGroup,
        members,
      };
    },
  });

  const groups = query.data?.groups ?? [];
  const members = query.data?.members ?? [];

  /** Situação da fila de análise: o que falta processar e o que falhou de vez. */
  const queue = {
    // "analyzing" também está na fila: é serviço reservado por uma execução em andamento.
    pending: groups.filter(
      (g) => g.analysis_status === "pending" || g.analysis_status === "analyzing",
    ).length,
    error: groups.filter((g) => g.analysis_status === "error").length,
    done: groups.filter((g) => g.analysis_status === "done").length,
  };

  /** Atendimentos que não entraram em nenhum serviço (sem nº de OS e sem similaridade). */
  const orphanMembers = members.filter((m) => !m.service_group_id && !m.unlinked_from_group);

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["auvo-service-groups"] });
    queryClient.invalidateQueries({ queryKey: ["auvo-discrepancies"] });
    queryClient.invalidateQueries({ queryKey: ["auvo-tasks"] });
  };


  const unlinkTask = useMutation({
    mutationFn: async (taskId: string) => {
      const { error } = await supabase
        .from("auvo_tasks")
        .update({ service_group_id: null, unlinked_from_group: true })
        .eq("id", taskId);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Atendimento desvinculado do serviço", {
        description: "Ele não será reagrupado automaticamente nas próximas sincronizações.",
      });
      invalidate();
    },
    onError: (error: Error) => toast.error("Erro ao desvincular", { description: error.message }),
  });

  const linkTaskToGroup = useMutation({
    mutationFn: async ({ taskId, groupId }: { taskId: string; groupId: string }) => {
      const { error } = await supabase
        .from("auvo_tasks")
        .update({ service_group_id: groupId, unlinked_from_group: false })
        .eq("id", taskId);
      if (error) throw error;
      await supabase
        .from("auvo_service_groups")
        .update({ analysis_status: "pending" })
        .eq("id", groupId);
    },
    onSuccess: () => {
      toast.success("Atendimento vinculado ao serviço", {
        description: "Rode a análise para recalcular as divergências do serviço.",
      });
      invalidate();
    },
    onError: (error: Error) => toast.error("Erro ao vincular", { description: error.message }),
  });

  const reanalyzeService = useMutation({
    mutationFn: async (groupId: string) => {
      const { data, error } = await supabase.functions.invoke("auvo-sync", {
        body: { mode: "analyze", service_group_id: groupId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.message ?? data.error);
      return data as { reports?: number; discrepancies?: number };
    },
    onSuccess: (data) => {
      toast.success("Serviço reanalisado", {
        description: `${data?.reports ?? 0} relatório(s) considerados · ${data?.discrepancies ?? 0} divergência(s).`,
      });
      invalidate();
    },
    onError: (error: Error) => toast.error("Erro ao reanalisar", { description: error.message }),
  });

  /** Processa um lote da fila de análise imediatamente, sem esperar o agendamento. */
  const processQueue = useMutation({
    mutationFn: async (limit: number = 8) => {
      const { data, error } = await supabase.functions.invoke("auvo-sync", {
        body: { mode: "analyze_batch", limit },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.message ?? data.error);
      return data as { processed?: number; discrepancies?: number; failed?: number };
    },
    onSuccess: (data) => {
      toast.success("Fila processada", {
        description: `${data?.processed ?? 0} serviço(s) analisados · ${data?.discrepancies ?? 0} divergência(s)${
          data?.failed ? ` · ${data.failed} falha(s)` : ""
        }.`,
      });
      invalidate();
    },
    onError: (error: Error) => toast.error("Erro ao processar fila", { description: error.message }),
  });

  /** Devolve à fila os serviços que estouraram as tentativas de análise. */
  const retryFailedAnalyses = useMutation({
    mutationFn: async () => {
      const ids = groups.filter((g) => g.analysis_status === "error").map((g) => g.id);
      if (ids.length === 0) return 0;
      const { error } = await supabase
        .from("auvo_service_groups")
        .update({ analysis_status: "pending", analysis_attempts: 0, analysis_error: null })
        .in("id", ids);
      if (error) throw error;
      return ids.length;
    },
    onSuccess: (count) => {
      toast.success(
        count ? `${count} serviço(s) voltaram para a fila` : "Nenhum serviço com erro",
      );
      invalidate();
    },
    onError: (error: Error) => toast.error("Erro ao reenfileirar", { description: error.message }),
  });

  /** Encaixa automaticamente os atendimentos órfãos em serviços por similaridade. */
  const autoGroupOrphans = useMutation({
    mutationFn: async (limit: number = 200) => {
      const { data, error } = await supabase.functions.invoke("auvo-sync", {
        body: { mode: "regroup", limit },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.message ?? data.error);
      return data as {
        scanned?: number;
        grouped?: number;
        remaining?: number;
        touched_groups?: number;
      };
    },
    onSuccess: (data) => {
      const grouped = data?.grouped ?? 0;
      if (grouped === 0) {
        toast.info("Nenhum atendimento pôde ser agrupado automaticamente", {
          description: `${data?.scanned ?? 0} analisados. Vincule manualmente os que restaram.`,
        });
      } else {
        toast.success(`${grouped} atendimento(s) agrupados por similaridade`, {
          description: `${data?.touched_groups ?? 0} serviço(s) voltaram para a fila de análise · ${
            data?.remaining ?? 0
          } ainda sem serviço.`,
        });
      }
      invalidate();
    },
    onError: (error: Error) =>
      toast.error("Erro ao agrupar automaticamente", { description: error.message }),
  });

  /** Sugestões de serviços duplicados (mesmo trabalho registrado com OS diferentes). */
  const mergeSuggestions = useQuery({
    queryKey: ["auvo-merge-suggestions", companyId],
    enabled: !!companyId,
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const { data, error } = await supabase.functions.invoke("auvo-sync", {
        body: { mode: "suggest_merges", limit: 30 },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.message ?? data.error);
      return (data?.suggestions ?? []) as AuvoMergeSuggestion[];
    },
  });

  /** Unifica serviços que são o mesmo trabalho e recoloca a auditoria na fila. */
  const mergeServices = useMutation({
    mutationFn: async ({
      primaryGroupId,
      duplicateGroupIds,
    }: {
      primaryGroupId: string;
      duplicateGroupIds: string[];
    }) => {
      const { data, error } = await supabase.functions.invoke("auvo-sync", {
        body: {
          mode: "merge_groups",
          primary_group_id: primaryGroupId,
          duplicate_group_ids: duplicateGroupIds,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.message ?? data.error);
      return data as { moved_tasks?: number; merged_groups?: number };
    },
    onSuccess: (data) => {
      toast.success("Serviços unificados", {
        description: `${data?.merged_groups ?? 0} serviço(s) absorvidos · ${
          data?.moved_tasks ?? 0
        } atendimento(s) movidos. A auditoria será refeita.`,
      });
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["auvo-merge-suggestions"] });
    },
    onError: (error: Error) => toast.error("Erro ao unificar", { description: error.message }),
  });

  /** Desfaz a unificação, recriando os serviços absorvidos. */
  const unmergeService = useMutation({
    mutationFn: async (groupId: string) => {
      const { data, error } = await supabase.functions.invoke("auvo-sync", {
        body: { mode: "unmerge_group", service_group_id: groupId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.message ?? data.error);
      return data as { restored_tasks?: number; restored_groups?: number };
    },
    onSuccess: (data) => {
      toast.success("Unificação desfeita", {
        description: `${data?.restored_groups ?? 0} serviço(s) recriados · ${
          data?.restored_tasks ?? 0
        } atendimento(s) devolvidos.`,
      });
      invalidate();
      queryClient.invalidateQueries({ queryKey: ["auvo-merge-suggestions"] });
    },
    onError: (error: Error) =>
      toast.error("Erro ao desfazer unificação", { description: error.message }),
  });

  /** Pares descartados manualmente ("não são duplicatas"). */
  const mergeDismissals = useQuery({
    queryKey: ["auvo-merge-dismissals", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("auvo_merge_dismissals")
        .select("id, group_a_id, group_b_id, reason, dismissed_by, created_at")
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as AuvoMergeDismissal[];
    },
  });

  /** Registra que os dois serviços não são o mesmo trabalho. */
  const dismissMerge = useMutation({
    mutationFn: async ({
      groupAId,
      groupBId,
      reason,
    }: {
      groupAId: string;
      groupBId: string;
      reason?: string;
    }) => {
      const { data, error } = await supabase.functions.invoke("auvo-sync", {
        body: {
          mode: "dismiss_merge",
          group_a_id: groupAId,
          group_b_id: groupBId,
          reason: reason ?? null,
        },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.message ?? data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("Duplicidade descartada", {
        description: "Este par não voltará a aparecer nas sugestões.",
      });
      queryClient.invalidateQueries({ queryKey: ["auvo-merge-suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["auvo-merge-dismissals"] });
    },
    onError: (error: Error) => toast.error("Erro ao descartar", { description: error.message }),
  });

  /** Reverte o descarte: o par volta a ser sugerido. */
  const undoDismissMerge = useMutation({
    mutationFn: async (dismissalId: string) => {
      const { data, error } = await supabase.functions.invoke("auvo-sync", {
        body: { mode: "undo_dismiss_merge", dismissal_id: dismissalId },
      });
      if (error) throw error;
      if (data?.error) throw new Error(data.message ?? data.error);
      return data;
    },
    onSuccess: () => {
      toast.success("Descarte revertido");
      queryClient.invalidateQueries({ queryKey: ["auvo-merge-suggestions"] });
      queryClient.invalidateQueries({ queryKey: ["auvo-merge-dismissals"] });
    },
    onError: (error: Error) =>
      toast.error("Erro ao reverter descarte", { description: error.message }),
  });

  /**
   * Confirma ou descarta o vínculo "material baixado em uma OS, aplicado em outra".
   * O descarte impede que o par volte a ser conciliado e reabre a divergência.
   */
  const decideCrossOs = useMutation({
    mutationFn: async ({
      groupId,
      counterpartGroupId,
      itemKey,
      externalProductId,
      decision,
      notes,
    }: {
      groupId: string;
      counterpartGroupId: string;
      itemKey: string;
      externalProductId?: number | null;
      decision: "confirmed" | "dismissed";
      notes?: string | null;
    }) => {
      if (!companyId) throw new Error("Empresa não identificada");
      const { data: auth } = await supabase.auth.getUser();
      const { error } = await supabase.from("auvo_cross_os_decisions").upsert(
        {
          company_id: companyId,
          group_id: groupId,
          counterpart_group_id: counterpartGroupId,
          item_key: itemKey,
          external_product_id: externalProductId ?? null,
          decision,
          notes: notes ?? null,
          decided_by: auth.user?.id ?? null,
        },
        { onConflict: "group_id,counterpart_group_id,item_key" },
      );
      if (error) throw error;

      if (decision === "dismissed") {
        // Reanalisa para a divergência voltar a ser apontada.
        const { error: fnError } = await supabase.functions.invoke("auvo-sync", {
          body: { mode: "analyze", service_group_id: groupId },
        });
        if (fnError) throw fnError;
      }
    },
    onSuccess: (_data, vars) => {
      toast.success(
        vars.decision === "confirmed" ? "Vínculo confirmado" : "Vínculo desfeito",
        {
          description:
            vars.decision === "confirmed"
              ? "O material fica registrado como aplicado na outra OS."
              : "A divergência volta a ser apontada nesta OS.",
        },
      );
      queryClient.invalidateQueries({ queryKey: ["auvo-discrepancies"] });
      queryClient.invalidateQueries({ queryKey: ["auvo-service-groups"] });
    },
    onError: (error: Error) => toast.error("Erro ao registrar decisão", { description: error.message }),
  });

  return {



    groups,
    membersByGroup: query.data?.membersByGroup ?? new Map<string, AuvoServiceMember[]>(),
    members,
    orphanMembers,
    queue,
    isLoading: query.isLoading,
    unlinkTask,
    linkTaskToGroup,
    reanalyzeService,
    processQueue,
    retryFailedAnalyses,
    autoGroupOrphans,
    mergeSuggestions,
    mergeServices,
    unmergeService,
    mergeDismissals,
    dismissMerge,
    undoDismissMerge,
    decideCrossOs,


  };
};

