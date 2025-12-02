import { useState } from "react";
import { ManagerStats } from "@/components/manager/dashboard/ManagerStats";
import { ManagerCharts } from "@/components/manager/dashboard/ManagerCharts";
import { ConsolidatedCalendar } from "@/components/manager/dashboard/ConsolidatedCalendar";
import { CriticalOrdersCard } from "@/components/manager/dashboard/CriticalOrdersCard";
import { ManagerDashboardFilters } from "@/components/manager/dashboard/ManagerDashboardFilters";
import { TrendsComparison } from "@/components/manager/dashboard/TrendsComparison";
import { DemandForecast } from "@/components/manager/dashboard/DemandForecast";
import { ForecastAccuracy } from "@/components/manager/dashboard/ForecastAccuracy";

interface DashboardFilters {
  startDate?: Date;
  endDate?: Date;
  statuses: string[];
  clientId?: string;
  coordinatorId?: string;
}

const ManagerDashboard = () => {
  const [filters, setFilters] = useState<DashboardFilters>({ statuses: [] });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard Gerencial</h2>
          <p className="text-muted-foreground">Visão consolidada de todas as operações</p>
        </div>
      </div>

      <ManagerDashboardFilters filters={filters} onFiltersChange={setFilters} />

      <ManagerStats filters={filters} />
      
      <CriticalOrdersCard />

      <TrendsComparison filters={filters} />

      <DemandForecast filters={filters} />

      <ForecastAccuracy filters={filters} />
      
      <div className="grid gap-6 lg:grid-cols-2">
        <ManagerCharts filters={filters} />
        <ConsolidatedCalendar filters={filters} />
      </div>
    </div>
  );
};

export default ManagerDashboard;
