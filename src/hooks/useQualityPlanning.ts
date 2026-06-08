import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export type ObjectiveStatus = "rascunho" | "ativo" | "concluido" | "cancelado";
export type IndicatorStatus = "ativo" | "pausado" | "arquivado";
export type IndicatorFrequency = "mensal" | "trimestral" | "semestral" | "anual";
export type PlannedChangeStatus = "rascunho" | "em_analise" | "aprovada" | "implementada" | "rejeitada";
export type PlannedChangeType = "processo" | "documento" | "recurso" | "estrutura" | "sistema" | "outro";

export interface QualityObjective {
  id: string;
  company_id: string;
  code: string | null;
  title: string;
  description: string | null;
  owner_user_id: string | null;
  policy_version_id: string | null;
  period_start: string | null;
  period_end: string | null;
  status: ObjectiveStatus;
  target_value: number | null;
  unit: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface QualityIndicator {
  id: string;
  company_id: string;
  objective_id: string | null;
  code: string | null;
  name: string;
  unit: string | null;
  target_value: number | null;
  formula: string | null;
  frequency: IndicatorFrequency;
  responsible_user_id: string | null;
  status: IndicatorStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface QualityIndicatorMeasurement {
  id: string;
  company_id: string;
  indicator_id: string;
  period_label: string;
  period_start: string;
  period_end: string;
  value: number;
  note: string | null;
  measured_by: string | null;
  created_at: string;
}

export interface QualityPlannedChange {
  id: string;
  company_id: string;
  code: string | null;
  title: string;
  description: string | null;
  change_type: PlannedChangeType;
  justification: string | null;
  impact_assessment: string | null;
  planned_for: string | null;
  status: PlannedChangeStatus;
  requested_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  implemented_at: string | null;
  linked_risk_ids: string[];
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const useQualityObjectives = () => {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const key = ["quality_objectives", profile?.company_id];

  const { data = [], isLoading } = useQuery({
    queryKey: key,
    enabled: !!user && !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_objectives" as any)
        .select("*")
        .eq("company_id", profile!.company_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown) as QualityObjective[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (p: Partial<QualityObjective>) => {
      if (!profile?.company_id) throw new Error("Empresa não encontrada");
      const payload: any = { ...p, company_id: profile.company_id };
      if (!p.id) payload.created_by = user!.id;
      const { data, error } = p.id
        ? await supabase.from("quality_objectives" as any).update(payload).eq("id", p.id).select().maybeSingle()
        : await supabase.from("quality_objectives" as any).insert(payload).select().maybeSingle();
      if (error) throw error;
      return data as any;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_objectives"] });
      toast({ title: "Objetivo salvo" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quality_objectives" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_objectives"] });
      toast({ title: "Objetivo removido" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return { objectives: data, isLoading, upsert, remove };
};

export const useQualityIndicators = () => {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const key = ["quality_indicators", profile?.company_id];

  const { data = [], isLoading } = useQuery({
    queryKey: key,
    enabled: !!user && !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_indicators" as any)
        .select("*")
        .eq("company_id", profile!.company_id)
        .order("name");
      if (error) throw error;
      return (data as unknown) as QualityIndicator[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (p: Partial<QualityIndicator>) => {
      if (!profile?.company_id) throw new Error("Empresa não encontrada");
      const payload: any = { ...p, company_id: profile.company_id };
      if (!p.id) payload.created_by = user!.id;
      const { data, error } = p.id
        ? await supabase.from("quality_indicators" as any).update(payload).eq("id", p.id).select().maybeSingle()
        : await supabase.from("quality_indicators" as any).insert(payload).select().maybeSingle();
      if (error) throw error;
      return data as any;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_indicators"] });
      toast({ title: "Indicador salvo" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quality_indicators" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_indicators"] });
      toast({ title: "Indicador removido" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return { indicators: data, isLoading, upsert, remove };
};

export const useQualityIndicatorMeasurements = (indicatorId?: string) => {
  const { user, profile } = useAuth();
  const qc = useQueryClient();

  const { data = [], isLoading } = useQuery({
    queryKey: ["quality_indicator_measurements", profile?.company_id, indicatorId],
    enabled: !!user && !!profile?.company_id && !!indicatorId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_indicator_measurements" as any)
        .select("*")
        .eq("company_id", profile!.company_id)
        .eq("indicator_id", indicatorId!)
        .order("period_start", { ascending: false });
      if (error) throw error;
      return (data as unknown) as QualityIndicatorMeasurement[];
    },
  });

  const add = useMutation({
    mutationFn: async (p: Partial<QualityIndicatorMeasurement>) => {
      if (!profile?.company_id) throw new Error("Empresa não encontrada");
      const payload: any = { ...p, company_id: profile.company_id, indicator_id: indicatorId, measured_by: user!.id };
      const { data, error } = await supabase
        .from("quality_indicator_measurements" as any)
        .insert(payload)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_indicator_measurements"] });
      toast({ title: "Medição registrada" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quality_indicator_measurements" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quality_indicator_measurements"] }),
  });

  return { measurements: data, isLoading, add, remove };
};

export const useQualityPlannedChanges = () => {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const key = ["quality_planned_changes", profile?.company_id];

  const { data = [], isLoading } = useQuery({
    queryKey: key,
    enabled: !!user && !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_planned_changes" as any)
        .select("*")
        .eq("company_id", profile!.company_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown) as QualityPlannedChange[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (p: Partial<QualityPlannedChange>) => {
      if (!profile?.company_id) throw new Error("Empresa não encontrada");
      const payload: any = { ...p, company_id: profile.company_id };
      if (!p.id) {
        payload.created_by = user!.id;
        payload.requested_by = payload.requested_by ?? user!.id;
      }
      const { data, error } = p.id
        ? await supabase.from("quality_planned_changes" as any).update(payload).eq("id", p.id).select().maybeSingle()
        : await supabase.from("quality_planned_changes" as any).insert(payload).select().maybeSingle();
      if (error) throw error;
      return data as any;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_planned_changes"] });
      toast({ title: "Mudança salva" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const decide = useMutation({
    mutationFn: async ({ id, decision }: { id: string; decision: "aprovada" | "rejeitada" | "implementada" }) => {
      const payload: any = { status: decision };
      if (decision === "aprovada") {
        payload.approved_by = user!.id;
        payload.approved_at = new Date().toISOString();
      }
      if (decision === "implementada") {
        payload.implemented_at = new Date().toISOString();
      }
      const { error } = await supabase.from("quality_planned_changes" as any).update(payload).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_planned_changes"] });
      toast({ title: "Mudança atualizada" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quality_planned_changes" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_planned_changes"] });
      toast({ title: "Mudança removida" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return { changes: data, isLoading, upsert, decide, remove };
};
