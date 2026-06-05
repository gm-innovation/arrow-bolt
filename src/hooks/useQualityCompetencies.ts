import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export type CompetencyCategory =
  | "technical" | "behavioral" | "regulatory" | "safety" | "management";

export interface Competency {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  category: CompetencyCategory;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export const useQualityCompetencies = () => {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const companyId = profile?.company_id;

  const list = useQuery({
    queryKey: ["quality_competencies", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_competencies" as any)
        .select("*")
        .eq("company_id", companyId!)
        .order("name");
      if (error) throw error;
      return (data ?? []) as unknown as Competency[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (input: Partial<Competency> & { name: string }) => {
      const payload: any = { ...input, company_id: companyId };
      const { error } = input.id
        ? await supabase.from("quality_competencies" as any).update(payload).eq("id", input.id)
        : await supabase.from("quality_competencies" as any).insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_competencies"] });
      toast({ title: "Competência salva" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quality_competencies" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_competencies"] });
      toast({ title: "Competência removida" });
    },
  });

  return { ...list, items: list.data ?? [], upsert, remove };
};
