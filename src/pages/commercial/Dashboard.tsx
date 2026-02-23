import { useCommercialStats } from "@/hooks/useCommercialStats";
import { useOpportunities } from "@/hooks/useOpportunities";
import { useRecurrences } from "@/hooks/useRecurrences";
import { useCommercialTasks } from "@/hooks/useCommercialTasks";
import { CommercialStats } from "@/components/commercial/dashboard/CommercialStats";
import { RenewalsSummaryCard } from "@/components/commercial/dashboard/RenewalsSummaryCard";
import { PipelineSummaryCard } from "@/components/commercial/dashboard/PipelineSummaryCard";
import { PendingActionsCard } from "@/components/commercial/dashboard/PendingActionsCard";
import { AlertsCard } from "@/components/commercial/dashboard/AlertsCard";
import { PipelineChart } from "@/components/commercial/dashboard/PipelineChart";
import { addDays, isBefore, isAfter, differenceInDays } from "date-fns";
import { useMemo } from "react";

const CommercialDashboard = () => {
  const { data, isLoading } = useCommercialStats();
  const { opportunities } = useOpportunities();
  const { recurrences } = useRecurrences();
  const { tasks } = useCommercialTasks();

  const stats = useMemo(() => {
    const now = new Date();
    const activeRecurrences = recurrences.filter((r: any) => r.status === "active");
    const mrr = activeRecurrences.reduce((sum: number, r: any) => sum + (Number(r.estimated_value) || 0), 0);

    // Count unique active clients from opportunities
    const activeClientIds = new Set(opportunities.filter((o: any) => !["closed_lost"].includes(o.stage)).map((o: any) => o.client_id));
    const activeClients = activeClientIds.size;

    // Average ticket
    const openOpps = opportunities.filter((o: any) => !["closed_won", "closed_lost"].includes(o.stage));
    const avgTicket = openOpps.length > 0 ? openOpps.reduce((s: number, o: any) => s + (Number(o.estimated_value) || 0), 0) / openOpps.length : 0;

    // Renewals by range
    const next30 = activeRecurrences.filter((r: any) => {
      if (!r.next_date) return false;
      const d = new Date(r.next_date);
      return isAfter(d, now) && isBefore(d, addDays(now, 30));
    }).length;
    const next60 = activeRecurrences.filter((r: any) => {
      if (!r.next_date) return false;
      const d = new Date(r.next_date);
      return isAfter(d, addDays(now, 30)) && isBefore(d, addDays(now, 60));
    }).length;
    const next90 = activeRecurrences.filter((r: any) => {
      if (!r.next_date) return false;
      const d = new Date(r.next_date);
      return isAfter(d, addDays(now, 60)) && isBefore(d, addDays(now, 90));
    }).length;

    // Overdue recurrences
    const overdueRecurrences = activeRecurrences.filter((r: any) => r.next_date && isBefore(new Date(r.next_date), now)).length;

    // At-risk clients (have overdue recurrences)
    const riskClientIds = new Set(
      activeRecurrences.filter((r: any) => r.next_date && isBefore(new Date(r.next_date), now)).map((r: any) => r.client_id)
    );

    // Pending tasks
    const pendingTasks = tasks.filter((t: any) => t.status === "pending" || t.status === "in_progress").length;

    // Open proposals
    const openProposals = opportunities.filter((o: any) => o.stage === "proposal").length;

    // At-risk client details
    const riskClients = activeRecurrences
      .filter((r: any) => r.next_date && isBefore(new Date(r.next_date), now))
      .map((r: any) => ({
        label: r.clients?.name || "Cliente",
        detail: `${Math.abs(differenceInDays(now, new Date(r.next_date)))}d atrasada`,
      }))
      .slice(0, 5);

    return {
      activeClients,
      mrr,
      avgTicket,
      atRiskClients: riskClientIds.size,
      next30, next60, next90,
      overdueRecurrences,
      pendingTasks,
      openProposals,
      pipelineCount: openOpps.length,
      pipelineValue: data?.kpis?.pipelineTotal || 0,
      riskClients,
    };
  }, [opportunities, recurrences, tasks, data]);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Dashboard Comercial</h2>

      <CommercialStats
        activeClients={stats.activeClients}
        mrr={stats.mrr}
        avgTicket={stats.avgTicket}
        atRiskClients={stats.atRiskClients}
        isLoading={isLoading}
      />

      <div className="grid gap-6 lg:grid-cols-3">
        <RenewalsSummaryCard next30={stats.next30} next60={stats.next60} next90={stats.next90} />
        <PipelineSummaryCard count={stats.pipelineCount} value={stats.pipelineValue} />
        <PendingActionsCard pendingTasks={stats.pendingTasks} overdueRecurrences={stats.overdueRecurrences} openProposals={stats.openProposals} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <AlertsCard title="Alertas Prioritários" items={[]} type="alerts" />
        <AlertsCard title="Clientes em Risco" items={stats.riskClients} type="risk" />
      </div>

      <PipelineChart stageStats={data?.stageStats || []} />
    </div>
  );
};

export default CommercialDashboard;
