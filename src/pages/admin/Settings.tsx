import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import ChangePasswordDialog from "@/components/admin/ChangePasswordDialog";

const AdminSettings = () => {
  const { toast } = useToast();
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [pushNotifications, setPushNotifications] = useState(false);
  const [reportApprovalNotif, setReportApprovalNotif] = useState(true);
  const [newOrderNotif, setNewOrderNotif] = useState(true);
  const [passwordDialogOpen, setPasswordDialogOpen] = useState(false);

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
          Gerencie as configurações do sistema
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
          <CardTitle>Alertas do Sistema</CardTitle>
          <CardDescription>
            Configure os tipos de alertas que você deseja receber
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="report-approval">Aprovação de Relatórios</Label>
              <p className="text-sm text-muted-foreground">
                Notificar quando houver relatórios pendentes de aprovação
              </p>
            </div>
            <Switch
              id="report-approval"
              checked={reportApprovalNotif}
              onCheckedChange={() => handleToggle(setReportApprovalNotif, reportApprovalNotif, "Alertas de aprovação")}
            />
          </div>

          <Separator />

          <div className="flex items-center justify-between">
            <div className="space-y-0.5">
              <Label htmlFor="new-order">Novas Ordens de Serviço</Label>
              <p className="text-sm text-muted-foreground">
                Notificar quando novas ordens forem criadas
              </p>
            </div>
            <Switch
              id="new-order"
              checked={newOrderNotif}
              onCheckedChange={() => handleToggle(setNewOrderNotif, newOrderNotif, "Alertas de novas OS")}
            />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Segurança</CardTitle>
          <CardDescription>
            Gerencie a segurança da sua conta
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-medium">Senha</h4>
              <p className="text-sm text-muted-foreground">
                Altere sua senha para manter sua conta segura
              </p>
            </div>
            <Button variant="outline" onClick={() => setPasswordDialogOpen(true)}>
              Alterar Senha
            </Button>
          </div>
        </CardContent>
      </Card>

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

      <ChangePasswordDialog 
        open={passwordDialogOpen} 
        onOpenChange={setPasswordDialogOpen} 
      />
    </div>
  );
};

export default AdminSettings;
