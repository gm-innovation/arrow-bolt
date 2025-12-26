import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Bell, MapPin, Eye } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TechSettings = () => {
  const { toast } = useToast();
  const [pushNotifications, setPushNotifications] = useState(true);
  const [taskAssignedNotif, setTaskAssignedNotif] = useState(true);
  const [taskUpdatedNotif, setTaskUpdatedNotif] = useState(true);
  const [messageNotif, setMessageNotif] = useState(true);
  const [geolocationEnabled, setGeolocationEnabled] = useState(true);
  const [autoCheckIn, setAutoCheckIn] = useState(false);
  const [showCompletedTasks, setShowCompletedTasks] = useState(true);

  const handleToggle = (setter: (value: boolean) => void, currentValue: boolean, name: string) => {
    setter(!currentValue);
    toast({
      title: "Configuração atualizada",
      description: `${name} ${!currentValue ? "ativado" : "desativado"}`,
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie suas preferências e configurações do aplicativo
        </p>
      </div>

      <Tabs defaultValue="notifications" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="location" className="flex items-center gap-2">
            <MapPin className="h-4 w-4" />
            Localização
          </TabsTrigger>
          <TabsTrigger value="display" className="flex items-center gap-2">
            <Eye className="h-4 w-4" />
            Exibição
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notificações Push</CardTitle>
              <CardDescription>
                Configure como você deseja receber notificações no seu dispositivo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="push-notifications">Ativar Notificações Push</Label>
                  <p className="text-sm text-muted-foreground">
                    Receba alertas em tempo real no seu dispositivo
                  </p>
                </div>
                <Switch
                  id="push-notifications"
                  checked={pushNotifications}
                  onCheckedChange={() => handleToggle(setPushNotifications, pushNotifications, "Notificações push")}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Tipos de Notificação</CardTitle>
              <CardDescription>
                Escolha quais eventos devem gerar notificações
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="task-assigned">Nova Tarefa Atribuída</Label>
                  <p className="text-sm text-muted-foreground">
                    Notificar quando uma nova tarefa for designada a você
                  </p>
                </div>
                <Switch
                  id="task-assigned"
                  checked={taskAssignedNotif}
                  onCheckedChange={() => handleToggle(setTaskAssignedNotif, taskAssignedNotif, "Notificação de nova tarefa")}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="task-updated">Atualização de Tarefa</Label>
                  <p className="text-sm text-muted-foreground">
                    Notificar quando uma tarefa for atualizada ou modificada
                  </p>
                </div>
                <Switch
                  id="task-updated"
                  checked={taskUpdatedNotif}
                  onCheckedChange={() => handleToggle(setTaskUpdatedNotif, taskUpdatedNotif, "Notificação de atualização")}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="message-notif">Mensagens</Label>
                  <p className="text-sm text-muted-foreground">
                    Notificar quando receber novas mensagens
                  </p>
                </div>
                <Switch
                  id="message-notif"
                  checked={messageNotif}
                  onCheckedChange={() => handleToggle(setMessageNotif, messageNotif, "Notificação de mensagens")}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="location" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Geolocalização</CardTitle>
              <CardDescription>
                Configure como sua localização é utilizada no aplicativo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="geolocation">Permitir Geolocalização</Label>
                  <p className="text-sm text-muted-foreground">
                    Permite que o app registre sua localização ao iniciar/finalizar tarefas
                  </p>
                </div>
                <Switch
                  id="geolocation"
                  checked={geolocationEnabled}
                  onCheckedChange={() => handleToggle(setGeolocationEnabled, geolocationEnabled, "Geolocalização")}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="auto-checkin">Check-in Automático</Label>
                  <p className="text-sm text-muted-foreground">
                    Registrar automaticamente quando você chegar ao local da tarefa
                  </p>
                </div>
                <Switch
                  id="auto-checkin"
                  checked={autoCheckIn}
                  onCheckedChange={() => handleToggle(setAutoCheckIn, autoCheckIn, "Check-in automático")}
                  disabled={!geolocationEnabled}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="display" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Preferências de Exibição</CardTitle>
              <CardDescription>
                Personalize como as informações são exibidas no aplicativo
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="show-completed">Mostrar Tarefas Concluídas</Label>
                  <p className="text-sm text-muted-foreground">
                    Exibir tarefas já finalizadas na lista de tarefas
                  </p>
                </div>
                <Switch
                  id="show-completed"
                  checked={showCompletedTasks}
                  onCheckedChange={() => handleToggle(setShowCompletedTasks, showCompletedTasks, "Exibir tarefas concluídas")}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Tema</Label>
                  <p className="text-sm text-muted-foreground">
                    Em desenvolvimento - modo claro/escuro em breve
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TechSettings;
