import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { CompetencyLevel } from "./useQualityRoleRequirements";

export type TrainingPlanStatus = "proposed" | "in_progress" | "completed" | "cancelled";

export interface TrainingPlan {
  id: string;
  company_id: string;
  user_id: string;
  competency_id: string;
  current_level: CompetencyLevel;
  required_level: CompetencyLevel;
  target_level: CompetencyLevel;
  status: TrainingPlanStatus;
  due_date: string | null;
  responsible_id: string | null;
  notes: string | null;
  linked_course_id: string | null;
  linked_trail_id: string | null;
  auto_generated: boolean;
  generated_at: string;
  completed_at: string | null;
}

export const useMyTrainingPlans = () => {
  const { user } = useAuth();
  return useQuery({
    queryKey: ["quality_training_plans", "mine", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_training_plans" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("generated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as TrainingPlan[];
    },
  });
};

export const useCompanyTrainingPlans = () => {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["quality_training_plans", "all", profile?.company_id],
    enabled: !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_training_plans" as any)
        .select("*")
        .eq("company_id", profile!.company_id!)
        .order("generated_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as TrainingPlan[];
    },
  });
};

export const useQualityTrainingPlanActions = () => {
  const qc = useQueryClient();

  const generate = useMutation({
    mutationFn: async (user_id: string) => {
      const { data, error } = await supabase.rpc("quality_generate_training_plans" as any, { p_user_id: user_id } as any);
      if (error) throw error;
      return data as unknown as number;
    },
    onSuccess: (count) => {
      qc.invalidateQueries({ queryKey: ["quality_training_plans"] });
      toast({ title: `${count ?? 0} plano(s) gerado(s)` });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const updateStatus = useMutation({
    mutationFn: async (p: { id: string; status: TrainingPlanStatus }) => {
      const patch: any = { status: p.status };
      if (p.status === "completed") patch.completed_at = new Date().toISOString();
      const { error } = await supabase.from("quality_training_plans" as any).update(patch).eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quality_training_plans"] }),
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const linkCourse = useMutation({
    mutationFn: async (p: { id: string; linked_course_id?: string | null; linked_trail_id?: string | null }) => {
      const { error } = await supabase.from("quality_training_plans" as any).update({
        linked_course_id: p.linked_course_id ?? null,
        linked_trail_id: p.linked_trail_id ?? null,
      }).eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quality_training_plans"] }),
  });

  return { generate, updateStatus, linkCourse };
};
