import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface QualityActionPlan {
  id: string;
  company_id: string;
  ncr_id: string | null;
  title: string;
  description: string | null;
  plan_type: string;
  status: string;
  responsible_id: string | null;
  start_date: string | null;
  target_date: string | null;
  completed_date: string | null;
  effectiveness_verified: boolean;
  effectiveness_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  responsible?: { full_name: string } | null;
  ncr?: { title: string; ncr_number: number } | null;
  items?: QualityActionItem[];
}

export interface QualityActionItem {
  id: string;
  action_plan_id: string;
  what: string;
  why: string | null;
  where_location: string | null;
  who: string | null;
  when_date: string | null;
  how: string | null;
  how_much: number | null;
  status: string;
  completed_at: string | null;
  notes: string | null;
  item_order: number;
  who_profile?: { full_name: string } | null;
}

export const useQualityActionPlans = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["quality-action-plans"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_action_plans")
        .select("*, responsible:profiles!quality_action_plans_responsible_id_fkey(full_name), ncr:quality_ncrs!quality_action_plans_ncr_id_fkey(title, ncr_number)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as QualityActionPlan[];
    },
    enabled: !!user,
  });

  const createPlan = useMutation({
    mutationFn: async (values: {
      title: string;
      description?: string;
      plan_type: string;
      ncr_id?: string;
      responsible_id?: string;
      start_date?: string;
      target_date?: string;
      items?: { what: string; why?: string; where_location?: string; who?: string; when_date?: string; how?: string; how_much?: number }[];
    }) => {
      const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user!.id).single();
      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      const { data: plan, error } = await supabase.from("quality_action_plans").insert({
        company_id: profile.company_id,
        title: values.title,
        description: values.description || null,
        plan_type: values.plan_type,
        ncr_id: values.ncr_id || null,
        responsible_id: values.responsible_id || null,
        start_date: values.start_date || null,
        target_date: values.target_date || null,
        created_by: user!.id,
        status: "draft",
      }).select().single();

      if (error) throw error;

      if (values.items && values.items.length > 0) {
        const { error: itemsError } = await supabase.from("quality_action_items").insert(
          values.items.map((item, index) => ({
            action_plan_id: plan.id,
            what: item.what,
            why: item.why || null,
            where_location: item.where_location || null,
            who: item.who || null,
            when_date: item.when_date || null,
            how: item.how || null,
            how_much: item.how_much || null,
            item_order: index,
          }))
        );
        if (itemsError) throw itemsError;
      }

      return plan;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quality-action-plans"] });
      toast({ title: "Plano de Ação criado com sucesso" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar Plano de Ação", description: error.message, variant: "destructive" });
    },
  });

  const updatePlan = useMutation({
    mutationFn: async ({ id, ...values }: { id: string; [key: string]: unknown }) => {
      const { error } = await supabase.from("quality_action_plans").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quality-action-plans"] });
      toast({ title: "Plano atualizado" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    },
  });

  return { plans, isLoading, createPlan, updatePlan };
};

export const useQualityActionItems = (planId: string | null) => {
  const queryClient = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["quality-action-items", planId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_action_items")
        .select("*, who_profile:profiles!quality_action_items_who_fkey(full_name)")
        .eq("action_plan_id", planId!)
        .order("item_order");

      if (error) throw error;
      return data as unknown as QualityActionItem[];
    },
    enabled: !!planId,
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...values }: { id: string; [key: string]: unknown }) => {
      if (values.status === "completed") values.completed_at = new Date().toISOString();
      const { error } = await supabase.from("quality_action_items").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quality-action-items", planId] });
    },
  });

  return { items, isLoading, updateItem };
};
