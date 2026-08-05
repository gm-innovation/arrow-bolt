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
  analysis_status: string;
  analyzed_at: string | null;
  analysis_error: string | null;
  analysis_attempts: number | null;
  analysis_last_attempt_at: string | null;
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
    queryFn: async () => {
      const [groupsRes, tasksRes, reportsRes] = await Promise.all([
        supabase
          .from("auvo_service_groups")
          .select(
            "id, service_key, order_numbers, primary_order_number, customer_name, vessel_name, first_task_date, last_task_date, is_similarity_grouped, grouping_reason, analysis_status, analyzed_at, analysis_error, analysis_attempts, analysis_last_attempt_at",
          )
          .order("last_task_date", { ascending: false, nullsFirst: false })
          .limit(1000),
        supabase
          .from("auvo_tasks")
          .select(
            "id, auvo_task_id, order_number, auvo_task_type, customer_name, vessel_name, task_date, technician_name, service_group_id, unlinked_from_group",
          )
          .order("task_date", { ascending: true, nullsFirst: false })
          .limit(2000),
        supabase.from("auvo_task_reports").select("auvo_task_uid, report_text").limit(2000),
      ]);

      if (groupsRes.error) throw groupsRes.error;
      if (tasksRes.error) throw tasksRes.error;
      if (reportsRes.error) throw reportsRes.error;


      const withReport = new Set(
        (reportsRes.data ?? [])
          .filter((r) => (r.report_text ?? "").trim().length > 0)
          .map((r) => r.auvo_task_uid as string),
      );

      const members = (tasksRes.data ?? []).map((t) => ({
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
    pending: groups.filter((g) => g.analysis_status === "pending").length,
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
    mutationFn: async (limit = 8) => {
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
  };

};
