import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { FileDown, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { downloadManagerReport } from "./ManagerReportPDF";
import { format, subMonths, parseISO, eachMonthOfInterval, isSameMonth, startOfYear, endOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DashboardFilters {
  startDate?: Date;
  endDate?: Date;
  statuses: string[];
  clientId?: string;
  coordinatorId?: string;
}

interface ExportReportButtonProps {
  filters: DashboardFilters;
}

export const ExportReportButton = ({ filters }: ExportReportButtonProps) => {
  const [isGenerating, setIsGenerating] = useState(false);

  // Fetch all data needed for the report
  const { data: stats } = useQuery({
    queryKey: ["export-stats", filters],
    queryFn: async () => {
      let query = supabase.from("service_orders").select("id, status, created_at, client_id, created_by");
      
      if (filters.coordinatorId) query = query.eq("created_by", filters.coordinatorId);
      if (filters.clientId) query = query.eq("client_id", filters.clientId);
      if (filters.startDate) query = query.gte("created_at", filters.startDate.toISOString());
      if (filters.endDate) query = query.lte("created_at", filters.endDate.toISOString());

      const { data: orders, error } = await query;
      if (error) throw error;

      let filteredOrders = orders || [];
      if (filters.statuses.length > 0) {
        filteredOrders = filteredOrders.filter(o => filters.statuses.includes(o.status || ""));
      }

      const total = filteredOrders.length;
      const completed = filteredOrders.filter(o => o.status === "completed").length;
      const inProgress = filteredOrders.filter(o => o.status === "in_progress").length;
      const pending = filteredOrders.filter(o => o.status === "pending").length;
      const completionRate = total > 0 ? Math.round((completed / total) * 100) : 0;

      const { count: coordinatorCount } = await supabase
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "admin");

      return { 
        total, 
        completed, 
        inProgress, 
        pending, 
        coordinators: coordinatorCount || 0,
        completionRate 
      };
    }
  });

  const { data: trends } = useQuery({
    queryKey: ["export-trends", filters],
    queryFn: async () => {
      const currentYear = new Date().getFullYear();
      const previousYear = currentYear - 1;
      const startCurrentYear = startOfYear(new Date(currentYear, 0, 1));
      const endCurrentYear = endOfYear(new Date(currentYear, 11, 31));
      const startPreviousYear = startOfYear(new Date(previousYear, 0, 1));
      const endPreviousYear = endOfYear(new Date(previousYear, 11, 31));

      let query = supabase
        .from("service_orders")
        .select("id, status, created_at")
        .gte("created_at", startPreviousYear.toISOString())
        .lte("created_at", endCurrentYear.toISOString());

      if (filters.coordinatorId) query = query.eq("created_by", filters.coordinatorId);
      if (filters.clientId) query = query.eq("client_id", filters.clientId);

      const { data: orders, error } = await query;
      if (error) throw error;

      const currentYearMonths = eachMonthOfInterval({
        start: startCurrentYear,
        end: new Date()
      });

      const previousYearMonths = eachMonthOfInterval({
        start: startPreviousYear,
        end: endPreviousYear
      });

      const monthlyData = currentYearMonths.map((month, index) => {
        const currentMonthOrders = orders?.filter(o => {
          const orderDate = parseISO(o.created_at);
          return isSameMonth(orderDate, month);
        }) || [];

        const previousYearMonth = previousYearMonths[index];
        const previousMonthOrders = previousYearMonth ? orders?.filter(o => {
          const orderDate = parseISO(o.created_at);
          return isSameMonth(orderDate, previousYearMonth);
        }) || [] : [];

        return {
          month: format(month, "MMM", { locale: ptBR }),
          currentYear: currentMonthOrders.length,
          previousYear: previousMonthOrders.length,
        };
      });

      const currentYearTotal = orders?.filter(o => {
        const orderDate = parseISO(o.created_at);
        return orderDate >= startCurrentYear && orderDate <= endCurrentYear;
      }).length || 0;

      const previousYearTotal = orders?.filter(o => {
        const orderDate = parseISO(o.created_at);
        return orderDate >= startPreviousYear && orderDate <= endPreviousYear;
      }).length || 0;

      const growthRate = previousYearTotal > 0 
        ? ((currentYearTotal - previousYearTotal) / previousYearTotal) * 100 
        : 0;

      return {
        currentYearTotal,
        previousYearTotal,
        growthRate,
        monthlyData,
      };
    }
  });

  const { data: accuracy } = useQuery({
    queryKey: ["export-accuracy", filters],
    queryFn: async () => {
      let query = supabase
        .from("forecast_history")
        .select("*")
        .not("actual_orders", "is", null)
        .order("forecast_month", { ascending: true });

      if (filters.coordinatorId) query = query.eq("coordinator_id", filters.coordinatorId);
      if (filters.clientId) query = query.eq("client_id", filters.clientId);

      const { data, error } = await query;
      if (error) throw error;

      if (!data || data.length === 0) return null;

      const forecasts = data.map(f => {
        const orderError = Math.abs(f.predicted_orders - (f.actual_orders || 0));
        const orderErrorPercent = f.actual_orders ? (orderError / f.actual_orders) * 100 : 0;
        return {
          ...f,
          orderAccuracy: Math.max(0, 100 - orderErrorPercent),
        };
      });

      const avgOrderAccuracy = forecasts.reduce((sum, f) => sum + f.orderAccuracy, 0) / forecasts.length;
      const mapeOrders = forecasts.reduce((sum, f) => sum + (100 - f.orderAccuracy), 0) / forecasts.length;
      const accuratePredictions = forecasts.filter(f => (100 - f.orderAccuracy) <= 15).length;
      const accuracyRate = (accuratePredictions / forecasts.length) * 100;

      return {
        overallAccuracy: avgOrderAccuracy,
        mapeOrders,
        accuracyRate,
        forecasts: forecasts.slice(-6),
      };
    }
  });

  const handleExport = async () => {
    if (!stats || !trends) {
      toast.error("Aguarde o carregamento dos dados.");
      return;
    }

    setIsGenerating(true);

    try {
      await downloadManagerReport({
        stats,
        trends,
        accuracy: accuracy || undefined,
        filters: {
          startDate: filters.startDate,
          endDate: filters.endDate,
          coordinatorId: filters.coordinatorId,
          clientId: filters.clientId,
        },
        generatedAt: new Date(),
      });

      toast.success("Relatorio PDF gerado com sucesso!");
    } catch (error) {
      console.error("Error generating PDF:", error);
      toast.error("Erro ao gerar relatorio PDF.");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Button onClick={handleExport} disabled={isGenerating || !stats || !trends} variant="outline">
      {isGenerating ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          Gerando PDF...
        </>
      ) : (
        <>
          <FileDown className="h-4 w-4 mr-2" />
          Exportar PDF
        </>
      )}
    </Button>
  );
};
