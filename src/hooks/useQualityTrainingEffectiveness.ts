import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export type EffectivenessResult = "eficaz" | "parcial" | "nao_eficaz";

export interface TrainingEffectiveness {
  id: string;
  company_id: string;
  training_id: string;
  evaluator_id: string | null;
  evaluation_date: string;
  result: EffectivenessResult;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const useQualityTrainingEffectiveness = (trainingId?: string | null) => {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const key = ["quality_training_effectiveness", trainingId];

  const { data: evaluations = [], isLoading } = useQuery({
    queryKey: key,
    enabled: !!trainingId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_training_effectiveness" as any)
        .select("*")
        .eq("training_id", trainingId!)
        .order("evaluation_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as TrainingEffectiveness[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: {
      training_id: string;
      result: EffectivenessResult;
      evaluation_date?: string;
      notes?: string;
    }) => {
      if (!profile?.company_id) throw new Error("Empresa não encontrada");
      const { data, error } = await supabase
        .from("quality_training_effectiveness" as any)
        .insert({
          company_id: profile.company_id,
          training_id: input.training_id,
          evaluator_id: user?.id ?? null,
          evaluation_date: input.evaluation_date || new Date().toISOString().slice(0, 10),
          result: input.result,
          notes: input.notes || null,
        } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      qc.invalidateQueries({ queryKey: ["quality_training_effectiveness_all"] });
      toast({ title: "Avaliação registrada" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return { evaluations, isLoading, create, latest: evaluations[0] ?? null };
};

export const useAllTrainingEffectiveness = () => {
  const { profile } = useAuth();
  return useQuery({
    queryKey: ["quality_training_effectiveness_all", profile?.company_id],
    enabled: !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_training_effectiveness" as any)
        .select("*")
        .eq("company_id", profile!.company_id!)
        .order("evaluation_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as TrainingEffectiveness[];
    },
  });
};
