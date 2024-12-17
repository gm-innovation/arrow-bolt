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
import { Bell, CheckCircle2 } from "lucide-react";

// Mock data - replace with real API calls
const mockNotifications = [
  {
    id: 1,
    title: "Nova tarefa atribuída",
    description: "Manutenção preventiva - Navio Alpha",
    type: "task",
    status: "unread",
    createdAt: new Date(),
  },
  {
    id: 2,
    title: "Relatório aprovado",
    description: "OS #123 - Navio Beta",
    type: "report",
    status: "read",
    createdAt: new Date(Date.now() - 86400000),
  },
];

const TechNotifications = () => {
  const navigate = useNavigate();
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const handleMarkAllAsRead = () => {
    console.log("Marking all notifications as read...");
  };

  const handleNotificationClick = (notification: typeof mockNotifications[0]) => {
    if (notification.type === "task") {
      navigate(`/tech/tasks/${notification.id}`);
    } else if (notification.type === "report") {
      navigate(`/tech/reports/${notification.id}`);
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
                  <SelectItem value="task">Tarefas</SelectItem>
                  <SelectItem value="report">Relatórios</SelectItem>
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
          <div className="space-y-4">
            {mockNotifications.map((notification) => (
              <div
                key={notification.id}
                className="flex items-start gap-4 p-4 rounded-lg hover:bg-slate-50 cursor-pointer"
                onClick={() => handleNotificationClick(notification)}
              >
                <div
                  className={`p-2 rounded-full ${
                    notification.type === "task"
                      ? "bg-blue-100"
                      : "bg-green-100"
                  }`}
                >
                  <Bell
                    className={`h-4 w-4 ${
                      notification.type === "task"
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
                    {notification.status === "unread" && (
                      <span className="h-2 w-2 rounded-full bg-blue-500" />
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {notification.description}
                  </p>
                  <span className="text-xs text-muted-foreground">
                    {notification.createdAt.toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TechNotifications;