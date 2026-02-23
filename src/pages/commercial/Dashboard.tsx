import { useCommercialStats } from "@/hooks/useCommercialStats";
import { useOpportunities } from "@/hooks/useOpportunities";
import { CommercialStats } from "@/components/commercial/dashboard/CommercialStats";
import { PipelineChart } from "@/components/commercial/dashboard/PipelineChart";
import { RecentOpportunities } from "@/components/commercial/dashboard/RecentOpportunities";

const CommercialDashboard = () => {
  const { data, isLoading } = useCommercialStats();
  const { opportunities } = useOpportunities();

  const defaultKpis = { pipelineTotal: 0, openOpportunities: 0, conversionRate: 0, monthlyClosedValue: 0 };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Dashboard Comercial</h2>

      <CommercialStats kpis={data?.kpis || defaultKpis} isLoading={isLoading} />

      <div className="grid gap-6 lg:grid-cols-2">
        <PipelineChart stageStats={data?.stageStats || []} />
        <RecentOpportunities opportunities={opportunities} />
      </div>
    </div>
  );
};

export default CommercialDashboard;
