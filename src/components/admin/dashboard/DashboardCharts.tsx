import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, LineChart, Line, ResponsiveContainer } from "recharts";
import { supabase } from "@/integrations/supabase/client";

export const DashboardCharts = () => {
  const [techTasksData, setTechTasksData] = useState<any[]>([]);
  const [completionTimeData, setCompletionTimeData] = useState<any[]>([]);

  useEffect(() => {
    fetchChartData();
  }, []);

  const fetchChartData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user.id)
        .single();

      if (!profile?.company_id) return;

      // Fetch tasks per technician
      const { data: technicians } = await supabase
        .from("technicians")
        .select("id, profiles!inner(full_name)")
        .eq("company_id", profile.company_id)
        .eq("active", true);

      if (technicians) {
        const techStats = await Promise.all(
          technicians.map(async (tech) => {
            const { count } = await supabase
              .from("tasks")
              .select("id", { count: "exact", head: true })
              .eq("assigned_to", tech.id);

            return {
              name: (tech.profiles as any)?.full_name || "Sem nome",
              tasks: count || 0,
            };
          })
        );

        setTechTasksData(techStats.filter(s => s.tasks > 0));
      }

      // Fetch completion time data (last 7 days)
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

      const { data: completedOrders } = await supabase
        .from("service_orders")
        .select("completed_date, created_at")
        .eq("company_id", profile.company_id)
        .eq("status", "completed")
        .gte("completed_date", sevenDaysAgo.toISOString())
        .not("completed_date", "is", null);

      if (completedOrders) {
        const timeData = completedOrders.map((order) => {
          const created = new Date(order.created_at);
          const completed = new Date(order.completed_date!);
          const hours = (completed.getTime() - created.getTime()) / (1000 * 60 * 60);
          return {
            date: completed.toLocaleDateString("pt-BR", { day: "2-digit", month: "2-digit" }),
            time: parseFloat(hours.toFixed(1)),
          };
        });

        setCompletionTimeData(timeData);
      }
    } catch (error) {
      console.error("Error fetching chart data:", error);
    }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>Tarefas por Técnico</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={techTasksData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="tasks" fill="hsl(var(--primary))" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Tempo Médio de Conclusão (horas)</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={completionTimeData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip />
                <Line type="monotone" dataKey="time" stroke="hsl(var(--primary))" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};