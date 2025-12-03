import { useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { MessageSquare, Phone, Loader2 } from "lucide-react";

interface WhatsAppCompanySettingsProps {
  companyId: string;
}

interface WhatsAppSettings {
  enabled: boolean;
  notifyTaskAssignment: boolean;
  notifyScheduleChange: boolean;
  notifyCriticalOrders: boolean;
  notifyReportSubmitted: boolean;
  notifyTaskAutoCompleted: boolean;
}

const defaultSettings: WhatsAppSettings = {
  enabled: false,
  notifyTaskAssignment: true,
  notifyScheduleChange: true,
  notifyCriticalOrders: true,
  notifyReportSubmitted: true,
  notifyTaskAutoCompleted: true,
};

const SETTINGS_KEY = 'whatsapp_settings_';

export function WhatsAppCompanySettings({ companyId }: WhatsAppCompanySettingsProps) {
  const queryClient = useQueryClient();
  const [settings, setSettings] = useState<WhatsAppSettings>(defaultSettings);

  const { data: savedSettings, isLoading } = useQuery({
    queryKey: ['whatsapp-settings', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('system_settings')
        .select('value')
        .eq('key', SETTINGS_KEY + companyId)
        .maybeSingle();
      
      if (error) throw error;
      if (!data?.value) return null;
      return data.value as unknown as WhatsAppSettings;
    },
    enabled: !!companyId
  });

  useEffect(() => {
    if (savedSettings) {
      setSettings(savedSettings);
    }
  }, [savedSettings]);

  const updateMutation = useMutation({
    mutationFn: async (newSettings: WhatsAppSettings) => {
      const { data: existing } = await supabase
        .from('system_settings')
        .select('id')
        .eq('key', SETTINGS_KEY + companyId)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('system_settings')
          .update({ value: newSettings as any })
          .eq('key', SETTINGS_KEY + companyId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('system_settings')
          .insert({ key: SETTINGS_KEY + companyId, value: newSettings as any });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['whatsapp-settings', companyId] });
      toast.success("Configurações salvas com sucesso");
    },
    onError: () => {
      toast.error("Erro ao salvar configurações");
    }
  });

  const handleToggle = (key: keyof WhatsAppSettings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    updateMutation.mutate(settings);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Main Toggle */}
      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <MessageSquare className="h-5 w-5 text-green-600" />
              <CardTitle className="text-base">WhatsApp</CardTitle>
            </div>
            <Switch
              checked={settings.enabled}
              onCheckedChange={() => handleToggle('enabled')}
            />
          </div>
          <CardDescription>
            Ativar notificações via WhatsApp para esta empresa
          </CardDescription>
        </CardHeader>
      </Card>

      {/* Notification Types */}
      {settings.enabled && (
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Tipos de Notificação</CardTitle>
            <CardDescription>
              Selecione quais notificações enviar
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="taskAssignment" className="flex-1">
                Atribuição de Tarefas
              </Label>
              <Switch
                id="taskAssignment"
                checked={settings.notifyTaskAssignment}
                onCheckedChange={() => handleToggle('notifyTaskAssignment')}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="scheduleChange" className="flex-1">
                Mudança de Agendamento
              </Label>
              <Switch
                id="scheduleChange"
                checked={settings.notifyScheduleChange}
                onCheckedChange={() => handleToggle('notifyScheduleChange')}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="criticalOrders" className="flex-1">
                OS Críticas
              </Label>
              <Switch
                id="criticalOrders"
                checked={settings.notifyCriticalOrders}
                onCheckedChange={() => handleToggle('notifyCriticalOrders')}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="reportSubmitted" className="flex-1">
                Relatório Enviado
              </Label>
              <Switch
                id="reportSubmitted"
                checked={settings.notifyReportSubmitted}
                onCheckedChange={() => handleToggle('notifyReportSubmitted')}
              />
            </div>

            <div className="flex items-center justify-between">
              <Label htmlFor="taskAutoCompleted" className="flex-1">
                Tarefa Auto-Completada
              </Label>
              <Switch
                id="taskAutoCompleted"
                checked={settings.notifyTaskAutoCompleted}
                onCheckedChange={() => handleToggle('notifyTaskAutoCompleted')}
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Save Button */}
      <Button 
        onClick={handleSave} 
        className="w-full"
        disabled={updateMutation.isPending}
      >
        {updateMutation.isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Salvando...
          </>
        ) : (
          'Salvar Configurações'
        )}
      </Button>
    </div>
  );
}
