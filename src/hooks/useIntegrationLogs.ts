import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const useIntegrationLogs = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ["crm-integration-logs", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      const { data, error } = await supabase
        .from("crm_integration_logs")
        .select("*, profiles(full_name)")
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id,
  });

  const addLog = useMutation({
    mutationFn: async (log: Record<string, any>) => {
      const { error } = await supabase.from("crm_integration_logs").insert({
        ...log,
        company_id: profile?.company_id,
        user_id: profile?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["crm-integration-logs"] }),
  });

  return { logs, isLoading, addLog };
};
