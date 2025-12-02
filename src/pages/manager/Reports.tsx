import { useState } from "react";
import { useManagerReports } from "@/hooks/useManagerReports";
import { ReportsFilters } from "@/components/manager/reports/ReportsFilters";
import { MetricsCards } from "@/components/manager/reports/MetricsCards";
import { ReportsCharts } from "@/components/manager/reports/ReportsCharts";
import { CoordinatorTable } from "@/components/manager/reports/CoordinatorTable";
import { ClientAnalytics } from "@/components/manager/reports/ClientAnalytics";
import { ServiceOrderReports } from "@/components/manager/reports/ServiceOrderReports";
import { exportToCSV, formatDateForExport } from "@/lib/exportUtils";
import { toast } from "sonner";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { BarChart3, FileText, Users } from "lucide-react";

const ManagerReports = () => {
  const [filters, setFilters] = useState<{
    startDate?: Date;
    endDate?: Date;
    coordinatorId?: string | null;
  }>({});

  const { metrics, coordinatorComparison, monthlyTrend, isLoading } = useManagerReports(filters);

  const handleExport = () => {
    if (!coordinatorComparison || coordinatorComparison.length === 0) {
      toast.error("Nenhum dado disponível para exportar");
      return;
    }

    try {
      const exportData = coordinatorComparison.map((item) => ({
        Coordenador: item.coordinator_name,
        "Total de OSs": item.total_orders,
        "OSs Concluídas": item.completed_orders,
        "OSs em Andamento": item.in_progress_orders,
        "OSs Pendentes": item.pending_orders,
        "Taxa de Conclusão (%)": item.completion_rate,
      }));

      const fileName = `relatorio-coordenadores-${formatDateForExport(new Date())}`;
      exportToCSV(exportData, fileName);
      toast.success("Relatório exportado com sucesso!");
    } catch (error) {
      console.error("Error exporting report:", error);
      toast.error("Erro ao exportar relatório");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold">Relatórios Consolidados</h2>
        <p className="text-muted-foreground">Análises e métricas da empresa</p>
      </div>

      <ReportsFilters onFilterChange={setFilters} onExport={handleExport} />

      <Tabs defaultValue="overview" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3 lg:w-auto lg:inline-flex">
          <TabsTrigger value="overview" className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4" />
            <span className="hidden sm:inline">Visão Geral</span>
          </TabsTrigger>
          <TabsTrigger value="clients" className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            <span className="hidden sm:inline">Clientes</span>
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="w-4 h-4" />
            <span className="hidden sm:inline">Relatórios OS</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="space-y-6">
          <MetricsCards metrics={metrics} isLoading={isLoading} />
          <ReportsCharts
            monthlyTrend={monthlyTrend}
            coordinatorComparison={coordinatorComparison}
            isLoading={isLoading}
          />
          <CoordinatorTable data={coordinatorComparison} isLoading={isLoading} />
        </TabsContent>

        <TabsContent value="clients" className="space-y-6">
          <ClientAnalytics filters={filters} />
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <ServiceOrderReports filters={filters} />
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default ManagerReports;
