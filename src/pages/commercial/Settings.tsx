import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Bell, Palette } from "lucide-react";

const CommercialSettings = () => {
  const { toast } = useToast();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [oppAlerts, setOppAlerts] = useState(true);
  const [recurrenceAlerts, setRecurrenceAlerts] = useState(true);

  const handleToggle = (setter: (v: boolean) => void, current: boolean, name: string) => {
    setter(!current);
    toast({ title: "Configuração atualizada", description: `${name} ${!current ? "ativado" : "desativado"}` });
  };

  return (
    <div className="space-y-6 max-w-4xl">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground mt-1">Gerencie as configurações do módulo comercial</p>
      </div>

      <Tabs defaultValue="notifications" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="notifications" className="flex items-center gap-2">
            <Bell className="h-4 w-4" /> Notificações
          </TabsTrigger>
          <TabsTrigger value="appearance" className="flex items-center gap-2">
            <Palette className="h-4 w-4" /> Aparência
          </TabsTrigger>
        </TabsList>

        <TabsContent value="notifications" className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Notificações</CardTitle>
              <CardDescription>Configure como você deseja receber notificações</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="email-notif">Notificações por Email</Label>
                  <p className="text-sm text-muted-foreground">Receba atualizações importantes por email</p>
                </div>
                <Switch id="email-notif" checked={emailNotifications} onCheckedChange={() => handleToggle(setEmailNotifications, emailNotifications, "Notificações por email")} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="push-notif">Notificações Push</Label>
                  <p className="text-sm text-muted-foreground">Receba notificações push no navegador</p>
                </div>
                <Switch id="push-notif" checked={pushNotifications} onCheckedChange={() => handleToggle(setPushNotifications, pushNotifications, "Notificações push")} />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Alertas Comerciais</CardTitle>
              <CardDescription>Configure os alertas específicos do módulo comercial</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="opp-alerts">Alertas de Oportunidades</Label>
                  <p className="text-sm text-muted-foreground">Notificar sobre mudanças em oportunidades e prazos próximos</p>
                </div>
                <Switch id="opp-alerts" checked={oppAlerts} onCheckedChange={() => handleToggle(setOppAlerts, oppAlerts, "Alertas de oportunidades")} />
              </div>
              <Separator />
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label htmlFor="rec-alerts">Alertas de Recorrências</Label>
                  <p className="text-sm text-muted-foreground">Notificar sobre serviços recorrentes próximos de vencer</p>
                </div>
                <Switch id="rec-alerts" checked={recurrenceAlerts} onCheckedChange={() => handleToggle(setRecurrenceAlerts, recurrenceAlerts, "Alertas de recorrências")} />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="appearance">
          <Card>
            <CardHeader>
              <CardTitle>Preferências de Visualização</CardTitle>
              <CardDescription>Personalize a aparência do sistema</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flex items-center justify-between">
                <div className="space-y-0.5">
                  <Label>Tema</Label>
                  <p className="text-sm text-muted-foreground">Em desenvolvimento - modo claro/escuro em breve</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CommercialSettings;
