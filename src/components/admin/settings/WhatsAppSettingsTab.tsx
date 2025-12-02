import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel } from "@/components/ui/form";
import { Card } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { useWhatsAppSettings } from "@/hooks/useWhatsAppSettings";
import { Loader2, MessageCircle, CheckCircle, AlertCircle } from "lucide-react";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";

const settingsSchema = z.object({
  enabled: z.boolean(),
  notify_task_assignment: z.boolean(),
  notify_schedule_change: z.boolean(),
  notify_critical_orders: z.boolean(),
  notify_report_submitted: z.boolean(),
});

export const WhatsAppSettingsTab = () => {
  const { settings, isLoading, updateSettings } = useWhatsAppSettings();
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'unknown' | 'connected' | 'error'>('unknown');

  const form = useForm({
    resolver: zodResolver(settingsSchema),
    defaultValues: {
      enabled: false,
      notify_task_assignment: true,
      notify_schedule_change: true,
      notify_critical_orders: true,
      notify_report_submitted: true,
    },
  });

  useEffect(() => {
    if (settings) {
      form.reset({
        enabled: settings.enabled ?? false,
        notify_task_assignment: settings.notify_task_assignment ?? true,
        notify_schedule_change: settings.notify_schedule_change ?? true,
        notify_critical_orders: settings.notify_critical_orders ?? true,
        notify_report_submitted: settings.notify_report_submitted ?? true,
      });
    }
  }, [settings]);

  const testConnection = async () => {
    setTestingConnection(true);
    try {
      const { data, error } = await supabase.functions.invoke("send-whatsapp", {
        body: {
          to: "test",
          message: "test",
          dryRun: true,
        },
      });

      if (error) {
        setConnectionStatus('error');
      } else if (data?.error) {
        setConnectionStatus('error');
      } else {
        setConnectionStatus('connected');
      }
    } catch {
      setConnectionStatus('error');
    } finally {
      setTestingConnection(false);
    }
  };

  const onSubmit = async (data: z.infer<typeof settingsSchema>) => {
    await updateSettings.mutateAsync(data);
  };

  const enabled = form.watch("enabled");

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card className="p-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <MessageCircle className="h-6 w-6 text-green-600" />
              <div>
                <h3 className="font-semibold text-lg">Integração WhatsApp</h3>
                <p className="text-sm text-muted-foreground">
                  Envie notificações automáticas via WhatsApp
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {connectionStatus === 'connected' && (
                <Badge variant="default" className="bg-green-600">
                  <CheckCircle className="h-3 w-3 mr-1" />
                  Conectado
                </Badge>
              )}
              {connectionStatus === 'error' && (
                <Badge variant="destructive">
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Erro na conexão
                </Badge>
              )}
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={testConnection}
                disabled={testingConnection}
              >
                {testingConnection && <Loader2 className="h-4 w-4 mr-1 animate-spin" />}
                Testar Conexão
              </Button>
            </div>
          </div>

          <FormField
            control={form.control}
            name="enabled"
            render={({ field }) => (
              <FormItem className="flex items-center justify-between rounded-lg border p-4">
                <div>
                  <FormLabel className="font-medium">Ativar WhatsApp</FormLabel>
                  <FormDescription>
                    Habilita o envio de notificações via WhatsApp para técnicos
                  </FormDescription>
                </div>
                <FormControl>
                  <Switch checked={field.value} onCheckedChange={field.onChange} />
                </FormControl>
              </FormItem>
            )}
          />
        </Card>

        {enabled && (
          <Card className="p-6">
            <h3 className="font-semibold text-lg mb-4">Tipos de Notificação</h3>
            <div className="space-y-4">
              <FormField
                control={form.control}
                name="notify_task_assignment"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <FormLabel className="font-medium">Atribuição de Tarefas</FormLabel>
                      <FormDescription>
                        Notificar técnicos quando são atribuídos a novas tarefas
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notify_schedule_change"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <FormLabel className="font-medium">Mudança de Agendamento</FormLabel>
                      <FormDescription>
                        Notificar quando a data de uma OS é alterada
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notify_critical_orders"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <FormLabel className="font-medium">OS Críticas</FormLabel>
                      <FormDescription>
                        Notificar administradores sobre OS em atraso
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="notify_report_submitted"
                render={({ field }) => (
                  <FormItem className="flex items-center justify-between rounded-lg border p-4">
                    <div>
                      <FormLabel className="font-medium">Relatório Enviado</FormLabel>
                      <FormDescription>
                        Notificar supervisores quando técnicos enviam relatórios
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </div>
          </Card>
        )}

        <Card className="p-6 bg-muted/50">
          <h3 className="font-semibold text-lg mb-2">Requisitos</h3>
          <ul className="text-sm text-muted-foreground space-y-1">
            <li>• Conta Twilio configurada com WhatsApp Sandbox</li>
            <li>• Secrets configurados: TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WHATSAPP_NUMBER</li>
            <li>• Técnicos devem ter telefone cadastrado no perfil</li>
          </ul>
        </Card>

        <div className="flex justify-end">
          <Button type="submit" disabled={updateSettings.isPending}>
            {updateSettings.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Salvar Configurações
          </Button>
        </div>
      </form>
    </Form>
  );
};