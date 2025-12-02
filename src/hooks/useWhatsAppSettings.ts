import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Json } from "@/integrations/supabase/types";

export interface WhatsAppSettings {
  enabled: boolean;
  notify_task_assignment: boolean;
  notify_schedule_change: boolean;
  notify_critical_orders: boolean;
  notify_report_submitted: boolean;
}

const SETTINGS_KEY = "whatsapp_settings";

const defaultSettings: WhatsAppSettings = {
  enabled: false,
  notify_task_assignment: true,
  notify_schedule_change: true,
  notify_critical_orders: true,
  notify_report_submitted: true,
};

export const useWhatsAppSettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["whatsapp-settings"],
    queryFn: async () => {
      // Get user's company
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user?.id)
        .single();

      if (!profile?.company_id) return defaultSettings;

      // Try to get existing settings from system_settings
      const { data } = await supabase
        .from("system_settings")
        .select("value")
        .eq("key", `${SETTINGS_KEY}_${profile.company_id}`)
        .maybeSingle();

      if (data?.value && typeof data.value === 'object' && !Array.isArray(data.value)) {
        return data.value as unknown as WhatsAppSettings;
      }

      return defaultSettings;
    },
    enabled: !!user?.id,
  });

  const updateSettings = useMutation({
    mutationFn: async (newSettings: Partial<WhatsAppSettings>) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user?.id)
        .single();

      if (!profile?.company_id) throw new Error("Company not found");

      const key = `${SETTINGS_KEY}_${profile.company_id}`;

      // Check if settings exist
      const { data: existing } = await supabase
        .from("system_settings")
        .select("id")
        .eq("key", key)
        .maybeSingle();

      const mergedSettings = {
        ...(settings || defaultSettings),
        ...newSettings,
      };

      const jsonValue = mergedSettings as unknown as Json;

      if (existing) {
        const { error } = await supabase
          .from("system_settings")
          .update({ value: jsonValue })
          .eq("key", key);

        if (error) throw error;
      } else {
        const { error } = await supabase.from("system_settings").insert([{
          key,
          value: jsonValue,
        }]);

        if (error) throw error;
      }

      return mergedSettings;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["whatsapp-settings"] });
      toast.success("Configurações salvas com sucesso!");
    },
    onError: (error: Error) => {
      toast.error(`Erro ao salvar configurações: ${error.message}`);
    },
  });

  const isWhatsAppEnabled = settings?.enabled ?? false;

  const shouldNotify = (type: keyof Omit<WhatsAppSettings, 'enabled'>) => {
    if (!isWhatsAppEnabled) return false;
    return settings?.[type] ?? false;
  };

  return {
    settings,
    isLoading,
    updateSettings,
    isWhatsAppEnabled,
    shouldNotify,
  };
};