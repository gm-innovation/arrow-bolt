import { useState, useEffect, useCallback } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { 
  ClipboardCheck, 
  Clock, 
  Star, 
  Bell,
  FileText,
  HelpCircle,
  TrendingUp,
  TrendingDown,
  Calendar,
  MapPin,
  ChevronRight,
  Play,
  CheckCircle2,
  AlertTriangle,
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
import { format, isToday, isTomorrow, parseISO, eachDayOfInterval, subDays, formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { usePushNotifications } from "@/hooks/usePushNotifications";
import { DateRangePicker } from "@/components/ui/date-range-picker";
import { DateRange } from "react-day-picker";
import MyScheduleCard from "@/components/tech/MyScheduleCard";
import { PushNotificationPrompt } from "@/components/notifications/PushNotificationPrompt";
import { useTechnicianStats } from "@/hooks/useTechnicianStats";

interface UpcomingTask {
  id: string;
  title: string;
  due_date: string | null;
  priority: number | null;
  status: string;
  service_order?: {
    order_number: string;
    location: string | null;
    client?: {
      name: string;
    };
  };
}

const TechDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { permission, requestPermission, isSupported } = usePushNotifications();
  const { stats, loading: statsLoading, technicianId } = useTechnicianStats();
  
  const [productivityData, setProductivityData] = useState<any[]>([]);
  const [productivityRange, setProductivityRange] = useState<DateRange>({
    from: subDays(new Date(), 13),
    to: new Date(),
  });
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [upcomingTasks, setUpcomingTasks] = useState<UpcomingTask[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    
    // Request notification permission if not already granted
    if (isSupported && permission === 'default') {
      // Small delay to not overwhelm user
      setTimeout(() => {
        requestPermission();
      }, 3000);
    }
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get technician ID for upcoming tasks
      const { data: technician } = await supabase
        .from("technicians")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (!technician) return;

      // Fetch assigned tasks with service order details
      const { data: assignedTasks } = await supabase
        .from("tasks")
        .select(`
          id, title, priority, status, due_date,
          service_order:service_orders (
            order_number,
            location,
            client:clients (name)
          )
        `)
        .eq("assigned_to", technician.id)
        .in("status", ["pending", "in_progress"])
        .order("due_date", { ascending: true, nullsFirst: false })
        .limit(5);

      setUpcomingTasks((assignedTasks || []) as UpcomingTask[]);

      // Fetch notifications
      const { data: notificationsData } = await supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(5);

      const unread = notificationsData?.filter(n => !n.read).length || 0;

      setNotifications(notificationsData || []);
      setUnreadCount(unread);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      toast({
        title: "Erro",
        description: "Não foi possível carregar os dados do dashboard.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Fetch productivity data based on date range
  const fetchProductivityData = useCallback(async () => {
    if (!technicianId || !productivityRange.from || !productivityRange.to) return;

    const days = eachDayOfInterval({
      start: productivityRange.from,
      end: productivityRange.to,
    });

    const productivityPromises = days.map(async (date) => {
      const dateStr = format(date, "yyyy-MM-dd");
      const { count } = await supabase
        .from("tasks")
        .select("id", { count: "exact", head: true })
        .eq("assigned_to", technicianId)
        .eq("status", "completed")
        .gte("completed_at", `${dateStr}T00:00:00`)
        .lte("completed_at", `${dateStr}T23:59:59`);

      return {
        name: format(date, "EEE dd", { locale: ptBR }),
        tasks: count || 0,
      };
    });

    const productivity = await Promise.all(productivityPromises);
    setProductivityData(productivity);
  }, [technicianId, productivityRange]);

  // Fetch productivity when technicianId or date range changes
  useEffect(() => {
    fetchProductivityData();
  }, [fetchProductivityData]);

  const getTaskDateLabel = (dueDate: string | null) => {
    if (!dueDate) return null;
    const date = parseISO(dueDate);
    if (isToday(date)) return "Hoje";
    if (isTomorrow(date)) return "Amanhã";
    return format(date, "dd/MM", { locale: ptBR });
  };

  const getPriorityColor = (priority: number | null) => {
    if (!priority) return "bg-muted";
    if (priority >= 4) return "bg-red-500";
    if (priority >= 3) return "bg-orange-500";
    if (priority >= 2) return "bg-yellow-500";
    return "bg-green-500";
  };

  const getTrendIndicator = (current: number, previous: number) => {
    if (current > previous) {
      return { icon: TrendingUp, color: "text-green-500", text: `+${Math.round(((current - previous) / (previous || 1)) * 100)}%` };
    } else if (current < previous) {
      return { icon: TrendingDown, color: "text-red-500", text: `${Math.round(((current - previous) / (previous || 1)) * 100)}%` };
    }
    return { icon: null, color: "text-muted-foreground", text: "0%" };
  };

  const tasksTrend = getTrendIndicator(stats.completedThisWeek, stats.completedLastWeek);
  const hoursTrend = getTrendIndicator(stats.hoursThisWeek, stats.hoursLastWeek);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Bem-vindo de volta!</p>
        </div>
        <Button 
          variant="outline" 
          className="gap-2"
          onClick={() => navigate("/tech/notifications")}
        >
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <Badge variant="destructive" className="h-5 w-5 p-0 flex items-center justify-center">
              {unreadCount}
            </Badge>
          )}
        </Button>
      </div>

      {/* Personal Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tarefas Ativas</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-primary" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.assignedTasks}</div>
            <div className="flex items-center gap-2 mt-1">
              {stats.highPriorityTasks > 0 && (
                <Badge variant="destructive" className="text-xs">
                  <AlertTriangle className="h-3 w-3 mr-1" />
                  {stats.highPriorityTasks} urgente{stats.highPriorityTasks > 1 ? 's' : ''}
                </Badge>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Concluídas</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.completedThisWeek}</div>
            <div className="flex items-center gap-1 text-xs">
              {tasksTrend.icon && <tasksTrend.icon className={cn("h-3 w-3", tasksTrend.color)} />}
              <span className={tasksTrend.color}>{tasksTrend.text}</span>
              <span className="text-muted-foreground">vs semana passada</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Horas Trabalhadas</CardTitle>
            <Clock className="h-4 w-4 text-blue-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{Math.round(stats.hoursThisWeek)}h</div>
            <div className="flex items-center gap-1 text-xs">
              {hoursTrend.icon && <hoursTrend.icon className={cn("h-3 w-3", hoursTrend.color)} />}
              <span className={hoursTrend.color}>{hoursTrend.text}</span>
              <span className="text-muted-foreground">vs semana passada</span>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avaliação</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            {stats.averageRating !== null ? (
              <>
                <div className="text-2xl font-bold">{stats.averageRating.toFixed(1)}</div>
                <div className="flex items-center gap-1">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={cn(
                        "h-3 w-3",
                        star <= Math.round(stats.averageRating!)
                          ? "text-yellow-500 fill-yellow-500"
                          : "text-muted"
                      )}
                    />
                  ))}
                  <span className="text-xs text-muted-foreground ml-1">
                    ({stats.totalRatings})
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="text-2xl font-bold text-muted-foreground">--</div>
                <p className="text-xs text-muted-foreground">Sem avaliações</p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Completion Rate and My Schedule */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Taxa de Conclusão</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-4">
              <Progress value={stats.completionRate} className="flex-1 h-3" />
              <span className="font-bold text-lg">{stats.completionRate.toFixed(0)}%</span>
            </div>
            <p className="text-sm text-muted-foreground mt-2">
              Baseado em todas as tarefas atribuídas a você
            </p>
          </CardContent>
        </Card>
        
        <MyScheduleCard />
      </div>

      {/* Upcoming Tasks Timeline */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Próximas Tarefas</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => navigate("/tech/tasks")}>
            Ver todas
            <ChevronRight className="h-4 w-4 ml-1" />
          </Button>
        </CardHeader>
        <CardContent>
          {upcomingTasks.length === 0 ? (
            <p className="text-center text-muted-foreground py-8">
              Nenhuma tarefa pendente
            </p>
          ) : (
            <div className="space-y-3">
              {upcomingTasks.map((task, index) => (
                <div
                  key={task.id}
                  className="flex items-center gap-4 p-3 rounded-lg border bg-card hover:bg-accent/50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/tech/tasks/${task.id}`)}
                >
                  <div className={cn("w-1 h-12 rounded-full", getPriorityColor(task.priority))} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-medium truncate">{task.title}</span>
                      {task.status === "in_progress" && (
                        <Badge variant="secondary" className="text-xs">
                          <Play className="h-3 w-3 mr-1" />
                          Em andamento
                        </Badge>
                      )}
                    </div>
                    <div className="flex items-center gap-3 text-sm text-muted-foreground mt-1">
                      {task.service_order && (
                        <>
                          <span>OS #{task.service_order.order_number}</span>
                          {task.service_order.client && (
                            <span>• {task.service_order.client.name}</span>
                          )}
                        </>
                      )}
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-1">
                    {task.due_date && (
                      <div className="flex items-center gap-1 text-sm">
                        <Calendar className="h-3 w-3" />
                        <span className={cn(
                          isToday(parseISO(task.due_date)) && "text-orange-500 font-medium"
                        )}>
                          {getTaskDateLabel(task.due_date)}
                        </span>
                      </div>
                    )}
                    {task.service_order?.location && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground">
                        <MapPin className="h-3 w-3" />
                        <span className="truncate max-w-[100px]">{task.service_order.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Productivity Chart */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Produtividade</CardTitle>
          <DateRangePicker
            value={productivityRange}
            onChange={(range) => range && setProductivityRange(range)}
            className="w-auto"
          />
        </CardHeader>
        <CardContent>
          <div className="h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productivityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" tick={{ fontSize: 12 }} />
                <YAxis allowDecimals={false} />
                <Tooltip />
                <Bar dataKey="tasks" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
          {productivityData.length > 0 && (
            <p className="text-xs text-muted-foreground mt-2 text-center">
              Total no período: {productivityData.reduce((acc, d) => acc + d.tasks, 0)} tarefas concluídas
            </p>
          )}
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate("/tech/tasks")}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <ClipboardCheck className="h-6 w-6 text-primary" />
              </div>
              <div>
                <h3 className="font-semibold">Ver Tarefas</h3>
                <p className="text-sm text-muted-foreground">
                  {stats.assignedTasks} tarefa{stats.assignedTasks !== 1 ? 's' : ''} ativa{stats.assignedTasks !== 1 ? 's' : ''}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => navigate("/tech/reports")}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-500/10">
                <FileText className="h-6 w-6 text-blue-500" />
              </div>
              <div>
                <h3 className="font-semibold">Relatórios</h3>
                <p className="text-sm text-muted-foreground">Ver meus relatórios</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="hover:shadow-md transition-shadow cursor-pointer" onClick={() => {
          toast({
            title: "Suporte solicitado",
            description: "Um administrador entrará em contato em breve.",
          });
        }}>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-orange-500/10">
                <HelpCircle className="h-6 w-6 text-orange-500" />
              </div>
              <div>
                <h3 className="font-semibold">Suporte</h3>
                <p className="text-sm text-muted-foreground">Solicitar ajuda</p>
              </div>
            </div>
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
            onClick={() => navigate("/tech/notifications")}
          >
            <Bell className="h-4 w-4" />
            Ver Todas
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {notifications.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-4">
                Nenhuma notificação recente
              </p>
            ) : (
              notifications.map((notification) => (
                <div
                  key={notification.id}
                  className={cn(
                    "flex items-start gap-3 p-3 rounded-lg cursor-pointer transition-colors",
                    !notification.read ? "bg-primary/5 border border-primary/10" : "hover:bg-accent"
                  )}
                  onClick={async () => {
                    await supabase
                      .from("notifications")
                      .update({ read: true })
                      .eq("id", notification.id);
                    navigate("/tech/tasks");
                  }}
                >
                  <div className={cn(
                    "p-2 rounded-full",
                    !notification.read ? "bg-primary/10" : "bg-muted"
                  )}>
                    <Bell className={cn(
                      "h-4 w-4",
                      !notification.read ? "text-primary" : "text-muted-foreground"
                    )} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-sm font-medium">{notification.title}</h4>
                    <p className="text-sm text-muted-foreground truncate">
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

      <PushNotificationPrompt delay={5000} />
    </div>
  );
};

export default TechDashboard;
