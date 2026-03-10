import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Bell, Smartphone, Palette, Shield, Loader2 } from "lucide-react";
import { useSystemSettings } from "@/hooks/useSystemSettings";
import { OmieSettingsTab } from "@/components/admin/settings/OmieSettingsTab";

const Settings = () => {
  const { settings, isLoading, updateSetting, exportAuditLogs } = useSystemSettings();

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Configurações</h1>
        <p className="text-muted-foreground">
          Gerencie as configurações globais do sistema
        </p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Bell className="h-5 w-5" />
              Notificações
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="notifications">Notificações do Sistema</Label>
              <Switch 
                id="notifications" 
                checked={settings.notifications_enabled?.enabled || false}
                onCheckedChange={(checked) => 
                  updateSetting({ key: 'notifications_enabled', value: { enabled: checked } })
                }
              />
            </div>
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="email-notifications">Notificações por Email</Label>
              <Switch 
                id="email-notifications" 
                checked={settings.email_notifications_enabled?.enabled || false}
                onCheckedChange={(checked) => 
                  updateSetting({ key: 'email_notifications_enabled', value: { enabled: checked } })
                }
              />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Smartphone className="h-5 w-5" />
              Integração WhatsApp
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>API Key WhatsApp</Label>
              <Input 
                type="password" 
                placeholder="Digite a API key"
                value={settings.whatsapp_api_key?.key || ''}
                onChange={(e) => 
                  updateSetting({ key: 'whatsapp_api_key', value: { key: e.target.value } })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Horário de Envio</Label>
              <Select 
                value={settings.whatsapp_schedule?.schedule || 'anytime'}
                onValueChange={(value) => 
                  updateSetting({ key: 'whatsapp_schedule', value: { schedule: value } })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o horário" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="morning">Manhã (8h-12h)</SelectItem>
                  <SelectItem value="afternoon">Tarde (13h-18h)</SelectItem>
                  <SelectItem value="anytime">Qualquer horário</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Palette className="h-5 w-5" />
              Personalização
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Tema do Sistema</Label>
              <Select 
                value={settings.theme?.theme || 'system'}
                onValueChange={(value) => 
                  updateSetting({ key: 'theme', value: { theme: value } })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o tema" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="light">Claro</SelectItem>
                  <SelectItem value="dark">Escuro</SelectItem>
                  <SelectItem value="system">Sistema</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Cor Principal</Label>
              <Select 
                value={settings.primary_color?.color || 'blue'}
                onValueChange={(value) => 
                  updateSetting({ key: 'primary_color', value: { color: value } })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione a cor" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="blue">Azul Naval</SelectItem>
                  <SelectItem value="green">Verde Oceano</SelectItem>
                  <SelectItem value="gray">Cinza Neutro</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Shield className="h-5 w-5" />
              Auditoria
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between space-x-2">
              <Label htmlFor="audit-logs">Registrar Logs de Auditoria</Label>
              <Switch 
                id="audit-logs" 
                checked={settings.audit_logs_enabled?.enabled || false}
                onCheckedChange={(checked) => 
                  updateSetting({ key: 'audit_logs_enabled', value: { enabled: checked } })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>Período de Retenção</Label>
              <Select 
                value={settings.audit_retention_period?.days?.toString() || '90'}
                onValueChange={(value) => 
                  updateSetting({ key: 'audit_retention_period', value: { days: parseInt(value) } })
                }
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione o período" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="30">30 dias</SelectItem>
                  <SelectItem value="60">60 dias</SelectItem>
                  <SelectItem value="90">90 dias</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button variant="outline" className="w-full" onClick={exportAuditLogs}>
              Exportar Logs
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Settings;