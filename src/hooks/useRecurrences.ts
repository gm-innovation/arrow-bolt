import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const useRecurrences = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: recurrences = [], isLoading } = useQuery({
    queryKey: ["crm-recurrences", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      const { data, error } = await supabase
        .from("crm_client_recurrences")
        .select("*, clients(name), crm_products(name), profiles(full_name)")
        .eq("company_id", profile.company_id)
        .order("next_date");
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id,
  });

  const { data: templates = [] } = useQuery({
    queryKey: ["crm-recurrence-templates", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      const { data, error } = await supabase
        .from("crm_recurrence_templates")
        .select("*, crm_products(name)")
        .eq("company_id", profile.company_id)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id,
  });

  const createRecurrence = useMutation({
    mutationFn: async (rec: Record<string, any>) => {
      const { error } = await supabase.from("crm_client_recurrences").insert({
        ...rec,
        company_id: profile?.company_id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-recurrences"] });
      toast.success("Recorrência criada");
    },
    onError: () => toast.error("Erro ao criar recorrência"),
  });

  const updateRecurrence = useMutation({
    mutationFn: async ({ id, ...rec }: Record<string, any>) => {
      const { error } = await supabase.from("crm_client_recurrences").update(rec).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-recurrences"] });
      toast.success("Recorrência atualizada");
    },
    onError: () => toast.error("Erro ao atualizar recorrência"),
  });

  const deleteRecurrence = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_client_recurrences").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-recurrences"] });
      toast.success("Recorrência removida");
    },
    onError: () => toast.error("Erro ao remover recorrência"),
  });

  const createTemplate = useMutation({
    mutationFn: async (tpl: Record<string, any>) => {
      const { error } = await supabase.from("crm_recurrence_templates").insert({
        ...tpl,
        company_id: profile?.company_id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-recurrence-templates"] });
      toast.success("Template criado");
    },
    onError: () => toast.error("Erro ao criar template"),
  });

  return { recurrences, templates, isLoading, createRecurrence, updateRecurrence, deleteRecurrence, createTemplate };
};
