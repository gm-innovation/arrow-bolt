import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export type RiskKind = "risk" | "opportunity";
export type RiskStatus = "identified" | "analyzing" | "treating" | "monitoring" | "accepted" | "closed";
export type RiskTreatment = "avoid" | "mitigate" | "transfer" | "accept" | "exploit" | "enhance" | "share" | "ignore";
export type RiskSource = "context" | "interested_party" | "process" | "audit" | "ncr" | "management_review" | "manual";
export type RiskSeverity = "low" | "medium" | "high" | "critical" | null;

export interface QualityRisk {
  id: string;
  company_id: string;
  code: string;
  kind: RiskKind;
  title: string;
  description: string | null;
  source: RiskSource;
  source_ref_id: string | null;
  category: string | null;
  owner_user_id: string | null;
  probability: number;
  impact: number;
  score: number;
  severity: RiskSeverity;
  residual_probability: number | null;
  residual_impact: number | null;
  residual_score: number | null;
  residual_severity: RiskSeverity;
  treatment: RiskTreatment | null;
  treatment_plan: string | null;
  treatment_due_date: string | null;
  status: RiskStatus;
  status_changed_at: string;
  review_frequency_months: number;
  last_reviewed_at: string | null;
  next_review_due_at: string | null;
  reviewed_by: string | null;
  closed_at: string | null;
  closure_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface RiskFilters {
  kind?: RiskKind | "all";
  status?: RiskStatus | "all";
  severity?: NonNullable<RiskSeverity> | "all";
  ownerId?: string | null;
  onlyOpen?: boolean;
}

export const useQualityRisks = (filters: RiskFilters = {}) => {
  const { profile, user } = useAuth();
  const qc = useQueryClient();
  const companyId = profile?.company_id;

  const list = useQuery({
    queryKey: ["quality_risks", companyId, filters],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase
        .from("quality_risks" as any)
        .select("*")
        .eq("company_id", companyId!)
        .order("created_at", { ascending: false });
      if (filters.kind && filters.kind !== "all") q = q.eq("kind", filters.kind);
      if (filters.status && filters.status !== "all") q = q.eq("status", filters.status);
      if (filters.severity && filters.severity !== "all") q = q.eq("severity", filters.severity);
      if (filters.ownerId) q = q.eq("owner_user_id", filters.ownerId);
      if (filters.onlyOpen) q = q.not("status", "in", "(closed,accepted)");
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as QualityRisk[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (input: Partial<QualityRisk> & { title: string; probability: number; impact: number }) => {
      const payload: any = { ...input };
      if (!input.id) {
        payload.company_id = companyId;
        payload.created_by = user?.id ?? null;
      }
      const { data, error } = input.id
        ? await supabase.from("quality_risks" as any).update(payload).eq("id", input.id).select().single()
        : await supabase.from("quality_risks" as any).insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_risks"] });
      toast({ title: "Salvo" });
    },
    onError: (e: any) => toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" }),
  });

  const review = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("quality_risks" as any)
        .update({ last_reviewed_at: new Date().toISOString(), reviewed_by: user?.id } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_risks"] });
      toast({ title: "Revisão registrada" });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quality_risks" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_risks"] });
      toast({ title: "Removido" });
    },
  });

  return { ...list, items: list.data ?? [], upsert, review, remove };
};

export const useQualityRiskEvents = (riskId?: string) => {
  return useQuery({
    queryKey: ["quality_risk_events", riskId],
    enabled: !!riskId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_risk_events" as any)
        .select("*")
        .eq("risk_id", riskId!)
        .order("at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });
};
