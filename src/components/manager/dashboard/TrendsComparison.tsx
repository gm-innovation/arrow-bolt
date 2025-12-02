import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, BarChart, Bar } from "recharts";
import { format, subYears, startOfYear, endOfYear, eachMonthOfInterval, isSameMonth, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface DashboardFilters {
  startDate?: Date;
  endDate?: Date;
  statuses: string[];
  clientId?: string;
  coordinatorId?: string;
}

interface TrendsComparisonProps {
  filters: DashboardFilters;
}

export const TrendsComparison = ({ filters }: TrendsComparisonProps) => {
  const currentYear = new Date().getFullYear();
  const previousYear = currentYear - 1;

  const { data: trendsData, isLoading } = useQuery({
    queryKey: ["trends-comparison", filters],
    queryFn: async () => {
      const startCurrentYear = startOfYear(new Date(currentYear, 0, 1));
      const endCurrentYear = endOfYear(new Date(currentYear, 11, 31));
      const startPreviousYear = startOfYear(new Date(previousYear, 0, 1));
      const endPreviousYear = endOfYear(new Date(previousYear, 11, 31));

      // Fetch orders for current and previous year
      let query = supabase
        .from("service_orders")
        .select("id, status, created_at, completed_date, client_id, created_by")
        .gte("created_at", startPreviousYear.toISOString())
        .lte("created_at", endCurrentYear.toISOString());

      if (filters.coordinatorId) {
        query = query.eq("created_by", filters.coordinatorId);
      }

      if (filters.clientId) {
        query = query.eq("client_id", filters.clientId);
      }

      const { data: orders, error } = await query;
      if (error) throw error;

      // Generate months for both years
      const currentYearMonths = eachMonthOfInterval({
        start: startCurrentYear,
        end: new Date() // Only up to current month
      });

      const previousYearMonths = eachMonthOfInterval({
        start: startPreviousYear,
        end: endPreviousYear
      });

      // Process monthly data
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

        const currentCompleted = currentMonthOrders.filter(o => o.status === "completed").length;
        const previousCompleted = previousMonthOrders.filter(o => o.status === "completed").length;

        return {
          month: format(month, "MMM", { locale: ptBR }),
          monthFull: format(month, "MMMM", { locale: ptBR }),
          currentYear: currentMonthOrders.length,
          previousYear: previousMonthOrders.length,
          currentCompleted,
          previousCompleted,
        };
      });

      // Calculate totals and growth
      const currentYearTotal = orders?.filter(o => {
        const orderDate = parseISO(o.created_at);
        return orderDate >= startCurrentYear && orderDate <= endCurrentYear;
      }).length || 0;

      const previousYearTotal = orders?.filter(o => {
        const orderDate = parseISO(o.created_at);
        return orderDate >= startPreviousYear && orderDate <= endPreviousYear;
      }).length || 0;

      const currentYearCompleted = orders?.filter(o => {
        const orderDate = parseISO(o.created_at);
        return orderDate >= startCurrentYear && orderDate <= endCurrentYear && o.status === "completed";
      }).length || 0;

      const previousYearCompleted = orders?.filter(o => {
        const orderDate = parseISO(o.created_at);
        return orderDate >= startPreviousYear && orderDate <= endPreviousYear && o.status === "completed";
      }).length || 0;

      const growthRate = previousYearTotal > 0 
        ? ((currentYearTotal - previousYearTotal) / previousYearTotal) * 100 
        : 0;

      const completionGrowth = previousYearCompleted > 0
        ? ((currentYearCompleted - previousYearCompleted) / previousYearCompleted) * 100
        : 0;

      return {
        monthlyData,
        currentYearTotal,
        previousYearTotal,
        currentYearCompleted,
        previousYearCompleted,
        growthRate,
        completionGrowth,
      };
    }
  });

  if (isLoading) {
    return (
      <div className="grid gap-6 lg:grid-cols-2">
        <Skeleton className="h-96" />
        <Skeleton className="h-96" />
      </div>
    );
  }

  const GrowthIndicator = ({ value }: { value: number }) => {
    if (value > 0) {
      return <TrendingUp className="h-4 w-4 text-green-500" />;
    } else if (value < 0) {
      return <TrendingDown className="h-4 w-4 text-red-500" />;
    }
    return <Minus className="h-4 w-4 text-muted-foreground" />;
  };

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">OSs {currentYear}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trendsData?.currentYearTotal || 0}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <GrowthIndicator value={trendsData?.growthRate || 0} />
              <span className={trendsData?.growthRate && trendsData.growthRate > 0 ? "text-green-500" : trendsData?.growthRate && trendsData.growthRate < 0 ? "text-red-500" : ""}>
                {trendsData?.growthRate?.toFixed(1) || 0}% vs {previousYear}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">OSs {previousYear}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{trendsData?.previousYearTotal || 0}</div>
            <p className="text-xs text-muted-foreground">Ano anterior completo</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Concluídas {currentYear}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{trendsData?.currentYearCompleted || 0}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <GrowthIndicator value={trendsData?.completionGrowth || 0} />
              <span className={trendsData?.completionGrowth && trendsData.completionGrowth > 0 ? "text-green-500" : trendsData?.completionGrowth && trendsData.completionGrowth < 0 ? "text-red-500" : ""}>
                {trendsData?.completionGrowth?.toFixed(1) || 0}% vs {previousYear}
              </span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Concluídas {previousYear}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{trendsData?.previousYearCompleted || 0}</div>
            <p className="text-xs text-muted-foreground">Ano anterior completo</p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tendência Mensal - Total de OSs</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={trendsData?.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    value,
                    name === "currentYear" ? currentYear : previousYear
                  ]}
                  labelFormatter={(label) => `Mês: ${label}`}
                />
                <Legend 
                  formatter={(value) => value === "currentYear" ? currentYear : previousYear}
                />
                <Line 
                  type="monotone" 
                  dataKey="currentYear" 
                  stroke="#3b82f6" 
                  strokeWidth={2}
                  dot={{ fill: "#3b82f6" }}
                />
                <Line 
                  type="monotone" 
                  dataKey="previousYear" 
                  stroke="#94a3b8" 
                  strokeWidth={2}
                  strokeDasharray="5 5"
                  dot={{ fill: "#94a3b8" }}
                />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Comparação Ano a Ano - OSs Concluídas</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={trendsData?.monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <Tooltip 
                  formatter={(value, name) => [
                    value,
                    name === "currentCompleted" ? `${currentYear} (Concluídas)` : `${previousYear} (Concluídas)`
                  ]}
                  labelFormatter={(label) => `Mês: ${label}`}
                />
                <Legend 
                  formatter={(value) => value === "currentCompleted" ? `${currentYear}` : `${previousYear}`}
                />
                <Bar dataKey="currentCompleted" fill="#22c55e" name="currentCompleted" />
                <Bar dataKey="previousCompleted" fill="#86efac" name="previousCompleted" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};
