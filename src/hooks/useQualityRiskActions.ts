import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export type RiskActionStatus = "open" | "in_progress" | "done" | "cancelled";

export interface QualityRiskAction {
  id: string;
  risk_id: string;
  company_id: string;
  description: string;
  responsible_id: string | null;
  due_date: string | null;
  status: RiskActionStatus;
  completed_at: string | null;
  evidence_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const useQualityRiskActions = (riskId?: string) => {
  const { profile, user } = useAuth();
  const qc = useQueryClient();
  const companyId = profile?.company_id;

  const list = useQuery({
    queryKey: ["quality_risk_actions", riskId],
    enabled: !!riskId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_risk_actions" as any)
        .select("*")
        .eq("risk_id", riskId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as QualityRiskAction[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (input: Partial<QualityRiskAction> & { description: string }) => {
      const payload: any = { ...input };
      if (!input.id) {
        payload.risk_id = riskId;
        payload.company_id = companyId;
        payload.created_by = user?.id ?? null;
      }
      const { error } = input.id
        ? await supabase.from("quality_risk_actions" as any).update(payload).eq("id", input.id)
        : await supabase.from("quality_risk_actions" as any).insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_risk_actions", riskId] });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quality_risk_actions" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quality_risk_actions", riskId] }),
  });

  return { ...list, items: list.data ?? [], upsert, remove };
};
