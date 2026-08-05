import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface NotificationPreferences {
  id: string;
  user_id: string;
  in_app_enabled: boolean;
  push_enabled: boolean;
  email_enabled: boolean;
  whatsapp_enabled: boolean;
  whatsapp_phone: string | null;
  quiet_hours_start: number | null;
  quiet_hours_end: number | null;
  muted_types: string[];
}

export const NOTIFICATION_TYPE_LABELS: Record<string, string> = {
  task_assignment: "Atribuição de tarefas",
  task_update: "Atualização de tarefas",
  service_order: "Ordens de serviço",
  service_order_created: "Nova ordem de serviço",
  service_order_updated: "Ordem de serviço atualizada",
  schedule_change: "Alteração de agenda",
  report_submitted: "Relatório enviado",
  payment_overdue: "Vencimentos financeiros",
  request_created: "Solicitações criadas",
  request_approved: "Solicitações aprovadas",
  request_rejected: "Solicitações reprovadas",
  document_received: "Documentos recebidos",
  approval_pending: "Aprovações pendentes",
  quality_alert: "Alertas da qualidade",
  document_review: "Revisão de documentos",
  lead_received: "Novos leads",
  support_ticket_created: "Novos chamados",
  support_ticket_reply: "Respostas de chamados",
};

const DEFAULTS = {
  in_app_enabled: true,
  push_enabled: true,
  email_enabled: false,
  whatsapp_enabled: false,
  whatsapp_phone: null,
  quiet_hours_start: null,
  quiet_hours_end: null,
  muted_types: [] as string[],
};

export const useNotificationPreferences = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ["notification-preferences", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("notification_preferences")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return (data as NotificationPreferences | null) ?? null;
    },
  });

  const savePreferences = useMutation({
    mutationFn: async (values: Partial<Omit<NotificationPreferences, "id" | "user_id">>) => {
      const payload = {
        user_id: user!.id,
        ...DEFAULTS,
        ...(preferences ?? {}),
        ...values,
      };
      delete (payload as Record<string, unknown>).id;

      const { error } = await supabase
        .from("notification_preferences")
        .upsert(payload, { onConflict: "user_id" });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["notification-preferences"] });
      toast.success("Preferências de notificação salvas");
    },
    onError: (error: Error) => toast.error(`Erro ao salvar: ${error.message}`),
  });

  const effectivePreferences = useMemo(
    () => preferences ?? ({ ...DEFAULTS } as unknown as NotificationPreferences),
    [preferences],
  );

  return {
    preferences: effectivePreferences,
    hasRecord: !!preferences,
    isLoading,
    savePreferences,
  };
};
