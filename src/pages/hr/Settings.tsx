import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Bell, FileText, Palette } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

const HRSettings = () => {
  const { toast } = useToast();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [absenceRequestNotif, setAbsenceRequestNotif] = useState(true);
  const [timeAnomalyNotif, setTimeAnomalyNotif] = useState(true);
  const [overtimeAlertNotif, setOvertimeAlertNotif] = useState(true);
  const [defaultExportFormat, setDefaultExportFormat] = useState("xlsx");
  const [defaultReportPeriod, setDefaultReportPeriod] = useState("month");

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

      <Tabs defaultValue="notifications" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" />
            Notificações
          </TabsTrigger>
          <TabsTrigger value="reports" className="flex items-center gap-2">
            <FileText className="h-4 w-4" />
            Relatórios
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="h-4 w-4" />
            Aparência
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Canais de Notificação</CardTitle>
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
              <CardTitle>Alertas de RH</CardTitle>
              <CardDescription>
                Configure os tipos de alertas que você deseja receber
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="absence-request">Solicitações de Ausência</Label>
                  <p className="text-sm text-muted-foreground">
                    Notificar quando houver novas solicitações de férias ou folga
                  </p>
                </div>
                <Switch
                  id="absence-request"
                  checked={absenceRequestNotif}
                  onCheckedChange={() => handleToggle(setAbsenceRequestNotif, absenceRequestNotif, "Alertas de ausência")}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="time-anomaly">Anomalias de Ponto</Label>
                  <p className="text-sm text-muted-foreground">
                    Notificar sobre inconsistências nos registros de ponto
                  </p>
                </div>
                <Switch
                  id="time-anomaly"
                  checked={timeAnomalyNotif}
                  onCheckedChange={() => handleToggle(setTimeAnomalyNotif, timeAnomalyNotif, "Alertas de anomalia")}
                />
              </div>

              <Separator />

              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="overtime-alert">Alertas de Hora Extra</Label>
                  <p className="text-sm text-muted-foreground">
                    Notificar quando técnicos excederem limite de horas extras
                  </p>
                </div>
                <Switch
                  id="overtime-alert"
                  checked={overtimeAlertNotif}
                  onCheckedChange={() => handleToggle(setOvertimeAlertNotif, overtimeAlertNotif, "Alertas de hora extra")}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="reports" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Preferências de Relatórios</CardTitle>
              <CardDescription>
                Configure como você prefere visualizar e exportar relatórios
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-2">
                <Label htmlFor="export-format">Formato de Exportação Padrão</Label>
                <Select 
                  value={defaultExportFormat} 
                  onValueChange={(value) => {
                    setDefaultExportFormat(value);
                    handleSelectChange(value, "Formato de exportação");
                  }}
                >
                  <SelectTrigger id="export-format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="xlsx">Excel (.xlsx)</SelectItem>
                    <SelectItem value="csv">CSV (.csv)</SelectItem>
                    <SelectItem value="pdf">PDF (.pdf)</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Formato padrão ao exportar relatórios de ponto e folha
                </p>
              </div>

              <Separator />

              <div className="grid gap-2">
                <Label htmlFor="report-period">Período Padrão de Relatório</Label>
                <Select 
                  value={defaultReportPeriod} 
                  onValueChange={(value) => {
                    setDefaultReportPeriod(value);
                    handleSelectChange(value, "Período de relatório");
                  }}
                >
                  <SelectTrigger id="report-period">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="week">Última Semana</SelectItem>
                    <SelectItem value="fortnight">Última Quinzena</SelectItem>
                    <SelectItem value="month">Último Mês</SelectItem>
                    <SelectItem value="quarter">Último Trimestre</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Período inicial ao abrir relatórios de controle de ponto
                </p>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Preferências de Visualização</CardTitle>
              <CardDescription>
                Personalize a aparência do sistema
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
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

export default HRSettings;
