import { useState } from "react";
import { useManagerReports } from "@/hooks/useManagerReports";
import { ReportsFilters } from "@/components/manager/reports/ReportsFilters";
import { MetricsCards } from "@/components/manager/reports/MetricsCards";
import { ReportsCharts } from "@/components/manager/reports/ReportsCharts";
import { CoordinatorTable } from "@/components/manager/reports/CoordinatorTable";
import { exportToCSV, formatDateForExport } from "@/lib/exportUtils";
import { toast } from "sonner";

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

      <MetricsCards metrics={metrics} isLoading={isLoading} />

      <ReportsCharts
        monthlyTrend={monthlyTrend}
        coordinatorComparison={coordinatorComparison}
        isLoading={isLoading}
      />

      <CoordinatorTable data={coordinatorComparison} isLoading={isLoading} />
    </div>
  );
};

export default ManagerReports;
