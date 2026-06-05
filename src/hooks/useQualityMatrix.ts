import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { CompetencyLevel } from "./useQualityRoleRequirements";

export interface MatrixRow {
  company_id: string;
  user_id: string;
  full_name: string | null;
  role: string;
  competency_id: string;
  competency_name: string;
  category: string;
  required_level: CompetencyLevel;
  current_level: CompetencyLevel;
  manual_override: boolean;
  auto_suggested_level: CompetencyLevel;
  gap: number;
  is_mandatory: boolean;
}

export interface MatrixFilters {
  role?: string;
  category?: string;
  onlyGaps?: boolean;
  userId?: string;
}

export const useQualityMatrix = (filters: MatrixFilters = {}) => {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const companyId = profile?.company_id;

  const list = useQuery({
    queryKey: ["quality_matrix", companyId, filters],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase
        .from("quality_competency_matrix_v" as any)
        .select("*")
        .eq("company_id", companyId!);
      if (filters.role) q = q.eq("role", filters.role);
      if (filters.category) q = q.eq("category", filters.category);
      if (filters.userId) q = q.eq("user_id", filters.userId);
      const { data, error } = await q.order("full_name");
      if (error) throw error;
      let rows = (data ?? []) as unknown as MatrixRow[];
      if (filters.onlyGaps) rows = rows.filter((r) => r.gap > 0);
      return rows;
    },
  });

  const setManualLevel = useMutation({
    mutationFn: async (p: { user_id: string; competency_id: string; level: CompetencyLevel; notes?: string }) => {
      const { error } = await supabase.rpc("quality_set_manual_level" as any, {
        p_user_id: p.user_id, p_competency_id: p.competency_id, p_level: p.level, p_notes: p.notes ?? null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_matrix"] });
      qc.invalidateQueries({ queryKey: ["quality_user_competency"] });
      toast({ title: "Nível atualizado" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const acceptAutoSuggestion = useMutation({
    mutationFn: async (p: { user_id: string; competency_id: string }) => {
      const { error } = await supabase.rpc("quality_accept_auto_suggestion" as any, {
        p_user_id: p.user_id, p_competency_id: p.competency_id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_matrix"] });
      qc.invalidateQueries({ queryKey: ["quality_user_competency"] });
      toast({ title: "Auto-sugestão aceita" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const recompute = useMutation({
    mutationFn: async (user_id: string) => {
      const { error } = await supabase.rpc("quality_recompute_user_competencies_all" as any, { p_user_id: user_id } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_matrix"] });
      toast({ title: "Matriz recalculada" });
    },
  });

  return { ...list, items: list.data ?? [], setManualLevel, acceptAutoSuggestion, recompute };
};

export const useUserCompetencyDetail = (userId?: string, competencyId?: string) => {
  return useQuery({
    queryKey: ["quality_user_competency", userId, competencyId],
    enabled: !!userId && !!competencyId,
    queryFn: async () => {
      const { data: uc, error } = await supabase
        .from("quality_user_competencies" as any)
        .select("*")
        .eq("user_id", userId!)
        .eq("competency_id", competencyId!)
        .maybeSingle();
      if (error) throw error;
      let evidences: any[] = [];
      if (uc) {
        const { data: ev } = await supabase
          .from("quality_competency_evidences" as any)
          .select("*")
          .eq("user_competency_id", (uc as any).id)
          .order("evidence_date", { ascending: false });
        evidences = ev ?? [];
      }
      return { competency: uc as any, evidences };
    },
  });
};
