import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Users, Package, Bell, AlertTriangle, ArrowRight, Clock, Server, Database, Activity } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";

const CommercialAdminDashboard = () => {
  const { profile } = useAuth();
  const navigate = useNavigate();

  const { data: stats, isLoading } = useQuery({
    queryKey: ["commercial-admin-stats", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return null;
      const today = new Date().toISOString().split("T")[0];
      const in30 = new Date(Date.now() + 30 * 86400000).toISOString().split("T")[0];

      const [usersRes, productsRes, pendingRes, overdueRes] = await Promise.all([
        supabase.from("profiles").select("id", { count: "exact", head: true }).eq("company_id", profile.company_id),
        supabase.from("crm_products").select("id", { count: "exact", head: true }).eq("company_id", profile.company_id).eq("active", true),
        supabase.from("crm_client_recurrences").select("id", { count: "exact", head: true }).eq("company_id", profile.company_id).eq("status", "active").gte("next_date", today).lte("next_date", in30),
        supabase.from("crm_client_recurrences").select("id", { count: "exact", head: true }).eq("company_id", profile.company_id).eq("status", "active").lt("next_date", today),
      ]);

      return {
        activeUsers: usersRes.count || 0,
        activeServices: productsRes.count || 0,
        pendingReminders: pendingRes.count || 0,
        overdue: overdueRes.count || 0,
      };
    },
    enabled: !!profile?.company_id,
  });

  const { data: recentLogs = [] } = useQuery({
    queryKey: ["commercial-admin-logs", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      const { data } = await supabase
        .from("crm_integration_logs")
        .select("*, profiles(full_name)")
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false })
        .limit(10);
      return data || [];
    },
    enabled: !!profile?.company_id,
  });

  const kpis = [
    { label: "Usuários Ativos", value: stats?.activeUsers ?? 0, icon: Users, color: "text-blue-600 bg-blue-50" },
    { label: "Serviços Ativos", value: stats?.activeServices ?? 0, icon: Package, color: "text-green-600 bg-green-50" },
    { label: "Lembretes Pendentes", value: stats?.pendingReminders ?? 0, icon: Bell, color: "text-amber-600 bg-amber-50" },
    { label: "Em Atraso", value: stats?.overdue ?? 0, icon: AlertTriangle, color: "text-red-600 bg-red-50" },
  ];

  const quickActions = [
    { label: "Gerenciar Usuários", path: "/commercial/admin/users" },
    { label: "Configurar Serviços", path: "/commercial/admin/services" },
    { label: "Ver Agendamentos", path: "/commercial/admin/schedules" },
    { label: "Logs de Auditoria", path: "/commercial/admin/logs" },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Painel Administrativo</h2>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {kpis.map((kpi) => (
          <Card key={kpi.label}>
            <CardContent className="p-5">
              {isLoading ? (
                <Skeleton className="h-16 w-full" />
              ) : (
                <div className="flex items-center gap-4">
                  <div className={`p-3 rounded-lg ${kpi.color}`}>
                    <kpi.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-foreground">{kpi.value}</p>
                    <p className="text-sm text-muted-foreground">{kpi.label}</p>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Activity */}
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-lg">Atividades Recentes</CardTitle>
          </CardHeader>
          <CardContent>
            {recentLogs.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">Nenhuma atividade recente</p>
            ) : (
              <div className="space-y-3">
                {recentLogs.slice(0, 8).map((log: any) => (
                  <div key={log.id} className="flex items-start gap-3 p-3 rounded-lg bg-muted/30">
                    <div className="mt-0.5">
                      <Clock className="h-4 w-4 text-muted-foreground" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground">{log.action}</p>
                      <p className="text-xs text-muted-foreground">
                        {log.profiles?.full_name || "Sistema"} · {log.entity_type || ""} ·{" "}
                        {format(new Date(log.created_at), "dd/MM HH:mm")}
                      </p>
                    </div>
                    <Badge variant={log.status === "success" ? "default" : "destructive"} className="text-xs">
                      {log.status}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Quick Actions + System Status */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Ações Rápidas</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {quickActions.map((a) => (
                <Button
                  key={a.path}
                  variant="ghost"
                  className="w-full justify-between h-10 text-sm"
                  onClick={() => navigate(a.path)}
                >
                  {a.label}
                  <ArrowRight className="h-4 w-4" />
                </Button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Status do Sistema</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {[
                { label: "Disponibilidade", value: "99.9%", icon: Server },
                { label: "Tempo de Resposta", value: "< 200ms", icon: Activity },
                { label: "Armazenamento", value: "Normal", icon: Database },
                { label: "Eventos Hoje", value: String(recentLogs.filter((l: any) => {
                  const d = new Date(l.created_at);
                  const t = new Date();
                  return d.toDateString() === t.toDateString();
                }).length), icon: Clock },
              ].map((s) => (
                <div key={s.label} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <s.icon className="h-4 w-4" />
                    {s.label}
                  </div>
                  <span className="font-medium text-foreground">{s.value}</span>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default CommercialAdminDashboard;
