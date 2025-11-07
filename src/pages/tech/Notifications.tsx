import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bell, CheckCircle2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

type Notification = {
  id: string;
  title: string;
  message: string | null;
  notification_type: string;
  read: boolean;
  created_at: string;
  reference_id: string | null;
};

const TechNotifications = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchNotifications();
    
    // Subscribe to real-time notifications
    const channel = supabase
      .channel("notifications-changes")
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "notifications",
        },
        () => {
          fetchNotifications();
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [typeFilter, statusFilter]);

  const fetchNotifications = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      let query = supabase
        .from("notifications")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });

      if (typeFilter) {
        query = query.eq("notification_type", typeFilter as any);
      }

      if (statusFilter) {
        query = query.eq("read", statusFilter === "read");
      }

      const { data } = await query;
      setNotifications(data || []);
    } catch (error) {
      console.error("Error fetching notifications:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      await supabase
        .from("notifications")
        .update({ read: true })
        .eq("user_id", user.id)
        .eq("read", false);

      toast({
        title: "Sucesso",
        description: "Todas as notificações foram marcadas como lidas",
      });

      fetchNotifications();
    } catch (error) {
      console.error("Error marking notifications as read:", error);
      toast({
        title: "Erro",
        description: "Erro ao marcar notificações como lidas",
        variant: "destructive",
      });
    }
  };

  const handleNotificationClick = async (notification: Notification) => {
    try {
      // Mark as read
      if (!notification.read) {
        await supabase
          .from("notifications")
          .update({ read: true })
          .eq("id", notification.id);
      }

      // Navigate based on type
      if (notification.notification_type === "task_assigned") {
        navigate(`/tech/tasks`);
      } else if (notification.notification_type === "report_approved" || notification.notification_type === "report_rejected") {
        navigate(`/tech/reports`);
      }
    } catch (error) {
      console.error("Error handling notification click:", error);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Notificações</h2>
        <Button variant="outline" onClick={handleMarkAllAsRead}>
          <CheckCircle2 className="h-4 w-4 mr-2" />
          Marcar Todas como Lidas
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label>Tipo</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todos</SelectItem>
                  <SelectItem value="task_assigned">Tarefas</SelectItem>
                  <SelectItem value="report_approved">Relatórios Aprovados</SelectItem>
                  <SelectItem value="report_rejected">Relatórios Rejeitados</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label>Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="">Todas</SelectItem>
                  <SelectItem value="read">Lidas</SelectItem>
                  <SelectItem value="unread">Não Lidas</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <p className="text-center text-muted-foreground">Carregando...</p>
          ) : notifications.length === 0 ? (
            <p className="text-center text-muted-foreground">Nenhuma notificação encontrada</p>
          ) : (
            <div className="space-y-4">
              {notifications.map((notification) => (
                <div
                  key={notification.id}
                  className="flex items-start gap-4 p-4 rounded-lg hover:bg-accent/50 cursor-pointer"
                  onClick={() => handleNotificationClick(notification)}
                >
                  <div
                    className={`p-2 rounded-full ${
                      notification.notification_type === "task_assigned"
                        ? "bg-blue-100"
                        : "bg-green-100"
                    }`}
                  >
                    <Bell
                      className={`h-4 w-4 ${
                        notification.notification_type === "task_assigned"
                          ? "text-blue-600"
                          : "text-green-600"
                      }`}
                    />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold">
                        {notification.title}
                      </h4>
                      {!notification.read && (
                        <span className="h-2 w-2 rounded-full bg-blue-500" />
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {notification.message}
                    </p>
                    <span className="text-xs text-muted-foreground">
                      {new Date(notification.created_at).toLocaleDateString("pt-BR")}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default TechNotifications;