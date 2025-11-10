import { useState } from "react";
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
import { Bell, CheckCircle2, Loader2 } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/hooks/use-toast";
import { useNotifications } from "@/hooks/useNotifications";

const TechNotifications = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [typeFilter, setTypeFilter] = useState("all-types");
  const [statusFilter, setStatusFilter] = useState("all-status");
  
  const { 
    notifications, 
    isLoading, 
    markAsRead, 
    markAllAsRead,
    isMarkingAllAsRead 
  } = useNotifications(typeFilter, statusFilter);

  const handleMarkAllAsRead = () => {
    markAllAsRead(undefined, {
      onSuccess: () => {
        toast({
          title: "Sucesso",
          description: "Todas as notificações foram marcadas como lidas",
        });
      },
      onError: () => {
        toast({
          title: "Erro",
          description: "Erro ao marcar notificações como lidas",
          variant: "destructive",
        });
      },
    });
  };

  const handleNotificationClick = (notification: any) => {
    // Mark as read
    if (!notification.read) {
      markAsRead(notification.id);
    }

    // Navigate based on type
    if (notification.notification_type === "task_assigned") {
      navigate(`/tech/tasks`);
    } else if (notification.notification_type === "report_approved" || notification.notification_type === "report_rejected") {
      navigate(`/tech/reports`);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Notificações</h2>
        <Button 
          variant="outline" 
          onClick={handleMarkAllAsRead}
          disabled={isMarkingAllAsRead || notifications.filter(n => !n.read).length === 0}
        >
          {isMarkingAllAsRead ? (
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          ) : (
            <CheckCircle2 className="h-4 w-4 mr-2" />
          )}
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
                  <SelectItem value="all-types">Todos</SelectItem>
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
                  <SelectItem value="all-status">Todas</SelectItem>
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
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-12 text-center">
              <Bell className="h-16 w-16 text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium">Nenhuma notificação</h3>
              <p className="text-sm text-muted-foreground mt-2 max-w-md">
                Você está em dia! Não há notificações no momento.
              </p>
            </div>
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