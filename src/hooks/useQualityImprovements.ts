import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export type ImprovementSource =
  | "ncr"
  | "audit_finding"
  | "review_output"
  | "complaint"
  | "manual"
  | "risk"
  | "supplier"
  | "device";


export type ImprovementPriority = "high" | "medium" | "low";
export type ImprovementStatus = "open" | "in_progress" | "done" | "cancelled";

export type ImprovementEffectiveness = "pendente" | "eficaz" | "ineficaz" | "nao_aplicavel";

export interface ImprovementRow {
  id: string;
  company_id: string;
  source: ImprovementSource;
  source_label: string;
  title: string;
  description: string | null;
  priority: ImprovementPriority;
  status: ImprovementStatus;
  opened_at: string;
  due_date: string | null;
  owner_user_id: string | null;
  action_plan_id: string | null;
  source_url: string;
  effectiveness_status: ImprovementEffectiveness | null;
}


export interface ManualImprovementInput {
  title: string;
  description?: string;
  category?: string;
  priority?: ImprovementPriority;
  due_date?: string | null;
  responsible_id?: string | null;
}

export const useQualityImprovements = () => {
  const { user, profile } = useAuth();
  const qc = useQueryClient();

  const { data: items, isLoading } = useQuery({
    queryKey: ["quality_improvements", profile?.company_id],
    enabled: !!user && !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_improvements_v" as any)
        .select("*")
        .eq("company_id", profile!.company_id)
        .order("opened_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown) as ImprovementRow[];
    },
  });

  const createManual = useMutation({
    mutationFn: async (input: ManualImprovementInput) => {
      if (!profile?.company_id || !user?.id) throw new Error("Sessão inválida");
      const { data, error } = await supabase
        .from("quality_improvements_manual" as any)
        .insert({
          company_id: profile.company_id,
          submitted_by: user.id,
          title: input.title,
          description: input.description ?? null,
          category: input.category ?? null,
          priority: input.priority ?? "medium",
          due_date: input.due_date ?? null,
          responsible_id: input.responsible_id ?? null,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_improvements"] });
      toast({ title: "Melhoria registrada" });
    },
    onError: (e: any) =>
      toast({
        title: "Erro ao registrar melhoria",
        description: e.message,
        variant: "destructive",
      }),
  });

  const generateActionPlan = useMutation({
    mutationFn: async (row: ImprovementRow) => {
      if (!profile?.company_id || !user?.id) throw new Error("Sessão inválida");
      const { data: plan, error } = await supabase
        .from("quality_action_plans" as any)
        .insert({
          company_id: profile.company_id,
          title: row.title,
          description: row.description ?? null,
          plan_type: "corrective",
          status: "open",
          responsible_id: row.owner_user_id,
          target_date: row.due_date,
          source: row.source,
          source_id: row.id,
          ncr_id: row.source === "ncr" ? row.id : null,
          created_by: user.id,
        })
        .select()
        .single();
      if (error) throw error;

      // Best-effort back-link for manual improvements
      if (row.source === "manual" && (plan as any)?.id) {
        await supabase
          .from("quality_improvements_manual" as any)
          .update({ action_plan_id: (plan as any).id })
          .eq("id", row.id);
      }
      return plan;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_improvements"] });
      qc.invalidateQueries({ queryKey: ["quality_action_plans"] });
      toast({ title: "Plano de ação gerado" });
    },
    onError: (e: any) =>
      toast({
        title: "Erro ao gerar plano",
        description: e.message,
        variant: "destructive",
      }),
  });

  const verifyEffectiveness = useMutation({
    mutationFn: async (input: {
      id: string;
      status: ImprovementEffectiveness;
      notes?: string | null;
    }) => {
      if (!user?.id) throw new Error("Sessão inválida");
      const { error } = await supabase
        .from("quality_improvements_manual" as any)
        .update({
          effectiveness_status: input.status,
          effectiveness_notes: input.notes ?? null,
          effectiveness_verified_at: new Date().toISOString(),
          effectiveness_verified_by: user.id,
        })
        .eq("id", input.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_improvements"] });
      toast({ title: "Eficácia atualizada" });
    },
    onError: (e: any) =>
      toast({ title: "Erro ao registrar eficácia", description: e.message, variant: "destructive" }),
  });

  return { items: items ?? [], isLoading, createManual, generateActionPlan, verifyEffectiveness };
};

