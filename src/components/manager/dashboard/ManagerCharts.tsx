import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from "recharts";
import { Skeleton } from "@/components/ui/skeleton";

interface ManagerChartsProps {
  coordinatorId: string | null;
}

export const ManagerCharts = ({ coordinatorId }: ManagerChartsProps) => {
  const { data: chartData, isLoading } = useQuery({
    queryKey: ["manager-charts", coordinatorId],
    queryFn: async () => {
      let query = supabase.from("service_orders").select("status");
      
      if (coordinatorId) {
        query = query.eq("created_by", coordinatorId);
      }

      const { data: orders, error } = await query;
      if (error) throw error;

      const statusCount = {
        pending: orders.filter(o => o.status === "pending").length,
        in_progress: orders.filter(o => o.status === "in_progress").length,
        completed: orders.filter(o => o.status === "completed").length,
        cancelled: orders.filter(o => o.status === "cancelled").length,
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
