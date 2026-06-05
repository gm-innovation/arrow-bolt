import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { CompetencyLevel } from "./useQualityRoleRequirements";

export type EvidenceType =
  | "university_course" | "university_trail" | "hr_certificate" | "acknowledgement" | "manual";

export interface CompetencyMapping {
  id: string;
  company_id: string;
  competency_id: string;
  evidence_type: EvidenceType;
  source_id: string | null;
  source_label: string | null;
  grants_level: CompetencyLevel;
}

export const useQualityCompetencyMappings = (competencyId?: string) => {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const companyId = profile?.company_id;

  const list = useQuery({
    queryKey: ["quality_competency_mappings", companyId, competencyId ?? "all"],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase
        .from("quality_competency_mappings" as any)
        .select("*")
        .eq("company_id", companyId!);
      if (competencyId) q = q.eq("competency_id", competencyId);
      const { data, error } = await q.order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as CompetencyMapping[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (input: Partial<CompetencyMapping> & { competency_id: string; evidence_type: EvidenceType; grants_level: CompetencyLevel }) => {
      const payload: any = { ...input, company_id: companyId };
      const { error } = input.id
        ? await supabase.from("quality_competency_mappings" as any).update(payload).eq("id", input.id)
        : await supabase.from("quality_competency_mappings" as any).insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_competency_mappings"] });
      toast({ title: "Mapeamento salvo" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quality_competency_mappings" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quality_competency_mappings"] }),
  });

  return { ...list, items: list.data ?? [], upsert, remove };
};
