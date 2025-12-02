import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardFilters {
  startDate?: Date;
  endDate?: Date;
  statuses: string[];
  clientId?: string;
  coordinatorId?: string;
}

interface ManagerChartsProps {
  filters: DashboardFilters;
}

export const ManagerCharts = ({ filters }: ManagerChartsProps) => {
  const { data: chartData, isLoading } = useQuery({
    queryKey: ["manager-charts", filters],
    queryFn: async () => {
      let query = supabase.from("service_orders").select("status, created_at, client_id, created_by");
      
      if (filters.coordinatorId) {
        query = query.eq("created_by", filters.coordinatorId);
      }

      if (filters.clientId) {
        query = query.eq("client_id", filters.clientId);
      }

      if (filters.startDate) {
        query = query.gte("created_at", filters.startDate.toISOString());
      }

      if (filters.endDate) {
        query = query.lte("created_at", filters.endDate.toISOString());
      }

      const { data: orders, error } = await query;
      if (error) throw error;

      let filteredOrders = orders;

      // Apply status filter if any statuses are selected
      if (filters.statuses.length > 0) {
        filteredOrders = filteredOrders.filter(o => filters.statuses.includes(o.status || ""));
      }

      const statusCount = {
        pending: filteredOrders.filter(o => o.status === "pending").length,
        in_progress: filteredOrders.filter(o => o.status === "in_progress").length,
        completed: filteredOrders.filter(o => o.status === "completed").length,
        cancelled: filteredOrders.filter(o => o.status === "cancelled").length,
      };

      const barData = [
        { name: "Pendente", value: statusCount.pending },
        { name: "Em Andamento", value: statusCount.in_progress },
        { name: "Concluída", value: statusCount.completed },
        { name: "Cancelada", value: statusCount.cancelled },
      ];

      const pieData = barData.filter(d => d.value > 0);

      return { barData, pieData };
    }
  });

  const COLORS = ["#94a3b8", "#3b82f6", "#22c55e", "#ef4444"];

  if (isLoading) {
    return (
      <div className="grid gap-4">
        <Skeleton className="h-80" />
        <Skeleton className="h-80" />
      </div>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Status das OSs</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <BarChart data={chartData?.barData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Bar dataKey="value" fill="#3b82f6" />
            </BarChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Distribuição de Status</CardTitle>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <PieChart>
              <Pie
                data={chartData?.pieData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                outerRadius={80}
                fill="#8884d8"
                dataKey="value"
              >
                {chartData?.pieData?.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>
    </>
  );
};
