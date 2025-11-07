import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ClipboardCheck, 
  Clock, 
  Star, 
  Plus, 
  Bell,
  FileText,
  HelpCircle 
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import { supabase } from "@/integrations/supabase/client";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

const TechDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [stats, setStats] = useState({
    assignedTasks: 0,
    highPriorityTasks: 0,
    completedThisWeek: 0,
    hoursThisWeek: 0,
    averageRating: 0,
  });
  const [productivityData, setProductivityData] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get technician ID
      const { data: technician } = await supabase
        .from("technicians")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!technician) return;

      // Fetch assigned tasks
      const { data: assignedTasks } = await supabase
        .from("tasks")
        .select("priority, status")
        .eq("assigned_to", technician.id)
        .in("status", ["pending", "in_progress"]);

      const highPriorityCount = assignedTasks?.filter(t => t.priority && t.priority >= 3).length || 0;

      // Fetch completed tasks this week
      const weekStart = new Date();
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const { count: completedCount } = await supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("assigned_to", technician.id)
        .eq("status", "completed")
        .gte("completed_at", weekStart.toISOString());

      // Fetch hours worked this week
      const { data: timeEntries } = await supabase
        .from("time_entries")
        .select("start_time, end_time")
        .eq("technician_id", technician.id)
        .gte("entry_date", weekStart.toISOString().split("T")[0]);

      let totalHours = 0;
      timeEntries?.forEach((entry) => {
        const [startHour, startMin] = entry.start_time.split(":").map(Number);
        const [endHour, endMin] = entry.end_time.split(":").map(Number);
        const hours = (endHour + endMin / 60) - (startHour + startMin / 60);
        totalHours += hours;
      });

      // Fetch productivity data for the last 7 days
      const last7Days = Array.from({ length: 7 }, (_, i) => {
        const date = new Date();
        date.setDate(date.getDate() - (6 - i));
        return date;
      });

      const productivityPromises = last7Days.map(async (date) => {
        const dateStr = date.toISOString().split("T")[0];
        const { count } = await supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("assigned_to", technician.id)
          .eq("status", "completed")
          .gte("completed_at", `${dateStr}T00:00:00`)
          .lte("completed_at", `${dateStr}T23:59:59`);

        return {
          name: date.toLocaleDateString("pt-BR", { weekday: "short" }),
          tasks: count || 0,
        };
      });

      const productivity = await Promise.all(productivityPromises);

      // Fetch notifications
      const { data: notificationsData } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      const unread = notificationsData?.filter(n => !n.read).length || 0;

      setStats({
        assignedTasks: assignedTasks?.length || 0,
        highPriorityTasks: highPriorityCount,
        completedThisWeek: completedCount || 0,
        hoursThisWeek: totalHours,
        averageRating: 4.8, // This would come from satisfaction surveys
      });
      setProductivityData(productivity);
      setNotifications(notificationsData || []);
      setUnreadCount(unread);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do dashboard.",
        variant: "destructive",
      });
    }
  };

  const handleViewTasks = () => {
    navigate("/tech/tasks");
  };

  const handleCreateReport = () => {
    navigate("/tech/reports/new");
  };

  const handleRequestSupport = () => {
    toast({
      title: "Suporte solicitado",
      description: "Um administrador entrará em contato em breve.",
    });
  };

  const handleViewAllNotifications = () => {
    navigate("/tech/notifications");
  };

  const handleNotificationClick = () => {
    navigate("/tech/notifications");
  };

  const handleNotificationItemClick = async (notification: any) => {
    // Mark as read
    await supabase
      .from("notifications")
      .update({ read: true })
      .eq("id", notification.id);

    if (notification.notification_type === "task_assigned") {
      navigate("/tech/tasks");
    } else if (notification.notification_type === "report_approved" || notification.notification_type === "report_rejected") {
      navigate("/tech/reports");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard do Técnico</h1>
        <Button 
          variant="outline" 
          className="gap-2"
          onClick={handleNotificationClick}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="bg-destructive text-destructive-foreground rounded-full px-2 py-0.5 text-xs">
              {unreadCount}
            </span>
          )}
        </Button>
      </div>

      {/* Personal Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tarefas Atribuídas</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.assignedTasks}</div>
            <p className="text-xs text-muted-foreground">
              {stats.highPriorityTasks} alta prioridade
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tarefas Concluídas</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedThisWeek}</div>
            <p className="text-xs text-muted-foreground">esta semana</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Horas Trabalhadas</CardTitle>
            <Clock className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(stats.hoursThisWeek)}h</div>
            <p className="text-xs text-muted-foreground">esta semana</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avaliação</CardTitle>
            <Star className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</div>
            <p className="text-xs text-muted-foreground">média de satisfação</p>
          </CardContent>
        </Card>
      </div>

      {/* Productivity Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Produtividade Semanal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productivityData}>
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

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <Button 
              className="w-full gap-2" 
              onClick={handleViewTasks}
            >
              <ClipboardCheck className="h-4 w-4" />
              Ver Tarefas Atribuídas
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Button 
              className="w-full gap-2" 
              onClick={handleCreateReport}
            >
              <FileText className="h-4 w-4" />
              Preencher Relatório
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Button 
              className="w-full gap-2" 
              variant="outline" 
              onClick={handleRequestSupport}
            >
              <HelpCircle className="h-4 w-4" />
              Solicitar Suporte
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Notifications */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Notificações Recentes</CardTitle>
          <Button 
            variant="ghost" 
            size="sm" 
            className="gap-2"
            onClick={handleViewAllNotifications}
          >
            <Bell className="h-4 w-4" />
            Ver Todas
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma notificação recente
              </p>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={`flex items-start gap-4 p-2 rounded-lg hover:bg-accent cursor-pointer ${
                    !notification.read ? "bg-accent/50" : ""
                  }`}
                  onClick={() => handleNotificationItemClick(notification)}
                >
                  <div className="bg-primary/10 p-2 rounded-full">
                    {notification.notification_type === "task_assigned" ? (
                      <Plus className="h-4 w-4 text-primary" />
                    ) : (
                      <FileText className="h-4 w-4 text-primary" />
                    )}
                  </div>
                  <div className="flex-1">
                    <h4 className="text-sm font-semibold">{notification.title}</h4>
                    <p className="text-sm text-muted-foreground">
                      {notification.message}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(notification.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TechDashboard;