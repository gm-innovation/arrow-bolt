import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const ManagerSettings = () => {
  const { toast } = useToast();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [criticalAlertsNotif, setCriticalAlertsNotif] = useState(true);
  const [dailyDigestNotif, setDailyDigestNotif] = useState(true);
  const [coordinatorReportsNotif, setCoordinatorReportsNotif] = useState(true);
  const [defaultDashboardView, setDefaultDashboardView] = useState("overview");
  const [dataRefreshInterval, setDataRefreshInterval] = useState("5min");

  const handleToggle = (setter: (value: boolean) => void, currentValue: boolean, name: string) => {
    setter(!currentValue);
    toast({
      title: "Configuração atualizada",
      description: `${name} ${!currentValue ? "ativado" : "desativado"}`,
    });
  };

  const handleSelectChange = (value: string, name: string) => {
    toast({
      title: "Preferência atualizada",
      description: `${name} alterado com sucesso`,
    });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground mt-1">
          Gerencie suas preferências e configurações do sistema
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notificações</CardTitle>
          <CardDescription>
            Configure como você deseja receber notificações
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="email-notifications">Notificações por Email</Label>
              <p className="text-sm text-muted-foreground">
                Receba atualizações importantes por email
              </p>
            </div>
            <Switch
              id="email-notifications"
              checked={emailNotifications}
              onCheckedChange={() => handleToggle(setEmailNotifications, emailNotifications, "Notificações por email")}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="push-notifications">Notificações Push</Label>
              <p className="text-sm text-muted-foreground">
                Receba notificações push no navegador
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
          <CardTitle>Alertas Gerenciais</CardTitle>
          <CardDescription>
            Configure os tipos de alertas que você deseja receber como gerente
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="critical-alerts">Alertas Críticos</Label>
              <p className="text-sm text-muted-foreground">
                Notificar sobre OSs atrasadas ou problemas críticos
              </p>
            </div>
            <Switch
              id="critical-alerts"
              checked={criticalAlertsNotif}
              onCheckedChange={() => handleToggle(setCriticalAlertsNotif, criticalAlertsNotif, "Alertas críticos")}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="daily-digest">Resumo Diário</Label>
              <p className="text-sm text-muted-foreground">
                Receba um resumo diário das operações
              </p>
            </div>
            <Switch
              id="daily-digest"
              checked={dailyDigestNotif}
              onCheckedChange={() => handleToggle(setDailyDigestNotif, dailyDigestNotif, "Resumo diário")}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="coordinator-reports">Relatórios de Coordenadores</Label>
              <p className="text-sm text-muted-foreground">
                Notificar quando coordenadores enviarem relatórios
              </p>
            </div>
            <Switch
              id="coordinator-reports"
              checked={coordinatorReportsNotif}
              onCheckedChange={() => handleToggle(setCoordinatorReportsNotif, coordinatorReportsNotif, "Relatórios de coordenadores")}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferências do Dashboard</CardTitle>
          <CardDescription>
            Personalize a aparência e comportamento do seu dashboard
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid gap-2">
            <Label htmlFor="default-view">Visualização Padrão</Label>
            <Select 
              value={defaultDashboardView} 
              onValueChange={(value) => {
                setDefaultDashboardView(value);
                handleSelectChange(value, "Visualização padrão");
              }}
            >
              <SelectTrigger id="default-view">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="overview">Visão Geral</SelectItem>
                <SelectItem value="charts">Gráficos</SelectItem>
                <SelectItem value="calendar">Calendário</SelectItem>
                <SelectItem value="coordinators">Coordenadores</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Escolha qual visualização aparece primeiro no dashboard
            </p>
          </div>

          <Separator />

          <div className="grid gap-2">
            <Label htmlFor="refresh-interval">Intervalo de Atualização</Label>
            <Select 
              value={dataRefreshInterval} 
              onValueChange={(value) => {
                setDataRefreshInterval(value);
                handleSelectChange(value, "Intervalo de atualização");
              }}
            >
              <SelectTrigger id="refresh-interval">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1min">1 minuto</SelectItem>
                <SelectItem value="5min">5 minutos</SelectItem>
                <SelectItem value="15min">15 minutos</SelectItem>
                <SelectItem value="30min">30 minutos</SelectItem>
                <SelectItem value="manual">Manual</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Com que frequência os dados do dashboard devem ser atualizados
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Preferências de Relatórios</CardTitle>
          <CardDescription>
            Configure como você prefere visualizar e exportar relatórios
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label>Formato de Exportação Padrão</Label>
              <p className="text-sm text-muted-foreground">
                CSV é o formato atual suportado
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ManagerSettings;
