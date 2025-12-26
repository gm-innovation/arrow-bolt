import { useState, useEffect } from "react";
import { useLocation } from "react-router-dom";
import { ManagerStats } from "@/components/manager/dashboard/ManagerStats";
import { ManagerCharts } from "@/components/manager/dashboard/ManagerCharts";
import { ConsolidatedCalendar } from "@/components/manager/dashboard/ConsolidatedCalendar";
import { CriticalOrdersCard } from "@/components/manager/dashboard/CriticalOrdersCard";
import { ManagerDashboardFilters } from "@/components/manager/dashboard/ManagerDashboardFilters";
import { TrendsComparison } from "@/components/manager/dashboard/TrendsComparison";
import { DemandForecast } from "@/components/manager/dashboard/DemandForecast";
import { ForecastAccuracy } from "@/components/manager/dashboard/ForecastAccuracy";
import { ExportReportButton } from "@/components/manager/dashboard/ExportReportButton";
import { TechnicianProductivityReport } from "@/components/manager/dashboard/TechnicianProductivityReport";
import { CoordinatorProductivityReport } from "@/components/manager/dashboard/CoordinatorProductivityReport";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { PushNotificationPrompt } from "@/components/notifications/PushNotificationPrompt";

interface DashboardFilters {
  startDate?: Date;
  endDate?: Date;
  statuses: string[];
  clientId?: string;
  coordinatorId?: string;
}

const ManagerDashboard = () => {
  const location = useLocation();
  const [filters, setFilters] = useState<DashboardFilters>({ statuses: [] });
  const [activeTab, setActiveTab] = useState("overview");

  // Reagir a navegação com coordinatorId
  useEffect(() => {
    const coordinatorId = (location.state as { coordinatorId?: string })?.coordinatorId;
    if (coordinatorId) {
      setFilters(prev => ({ ...prev, coordinatorId }));
      setActiveTab("coordinators");
    }
  }, [location.state]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Dashboard Gerencial</h2>
          <p className="text-muted-foreground">Visao consolidada de todas as operacoes</p>
        </div>
        <ExportReportButton filters={filters} />
      </div>

      <ManagerDashboardFilters filters={filters} onFiltersChange={setFilters} />

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="coordinators">Coordenadores</TabsTrigger>
          <TabsTrigger value="productivity">Técnicos</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <ManagerStats filters={filters} />
          
          <CriticalOrdersCard />

          <TrendsComparison filters={filters} />

          <DemandForecast filters={filters} />

          <ForecastAccuracy filters={filters} />
          
          <div className="grid gap-6 lg:grid-cols-2">
            <ManagerCharts filters={filters} />
            <ConsolidatedCalendar filters={filters} />
          </div>
        </TabsContent>

        <TabsContent value="coordinators">
          <CoordinatorProductivityReport 
            dateRange={filters.startDate && filters.endDate ? {
              start: filters.startDate,
              end: filters.endDate
            } : undefined}
            coordinatorId={filters.coordinatorId}
          />
        </TabsContent>

        <TabsContent value="productivity">
          <TechnicianProductivityReport 
            dateRange={filters.startDate && filters.endDate ? {
              start: filters.startDate,
              end: filters.endDate
            } : undefined}
          />
        </TabsContent>
      </Tabs>

      <PushNotificationPrompt />
    </div>
  );
};

export default ManagerDashboard;
