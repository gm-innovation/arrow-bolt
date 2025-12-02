import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ClipboardList, CheckCircle, Clock, Users } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

interface ManagerStatsProps {
  coordinatorId: string | null;
}

export const ManagerStats = ({ coordinatorId }: ManagerStatsProps) => {
  const { data: stats, isLoading } = useQuery({
    queryKey: ["manager-stats", coordinatorId],
    queryFn: async () => {
      let query = supabase.from("service_orders").select("id, status");
      
      if (coordinatorId) {
        query = query.eq("created_by", coordinatorId);
      }

      const { data: orders, error } = await query;
      if (error) throw error;

      const total = orders.length;
      const completed = orders.filter(o => o.status === "completed").length;
      const inProgress = orders.filter(o => o.status === "in_progress").length;
      const pending = orders.filter(o => o.status === "pending").length;

      // Get number of coordinators
      const { count: coordinatorCount } = await supabase
        .from("user_roles")
        .select("*", { count: "exact", head: true })
        .eq("role", "admin");

      return { total, completed, inProgress, pending, coordinators: coordinatorCount || 0 };
    }
  });

  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <Skeleton key={i} className="h-32" />
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Total de OSs</CardTitle>
          <ClipboardList className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.total || 0}</div>
          <p className="text-xs text-muted-foreground">
            {coordinatorId ? "Do coordenador selecionado" : "De todos os coordenadores"}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
          <CheckCircle className="h-4 w-4 text-green-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-green-600">{stats?.completed || 0}</div>
          <p className="text-xs text-muted-foreground">
            {stats?.total ? `${((stats.completed / stats.total) * 100).toFixed(1)}%` : "0%"} do total
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Em Andamento</CardTitle>
          <Clock className="h-4 w-4 text-yellow-500" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold text-yellow-600">{stats?.inProgress || 0}</div>
          <p className="text-xs text-muted-foreground">
            {stats?.pending || 0} pendentes
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">Coordenadores</CardTitle>
          <Users className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{stats?.coordinators || 0}</div>
          <p className="text-xs text-muted-foreground">Ativos na empresa</p>
        </CardContent>
      </Card>
    </div>
  );
};
