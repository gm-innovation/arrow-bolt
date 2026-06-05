import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export type CompetencyLevel = "none" | "basic" | "intermediate" | "advanced" | "expert";

export interface RoleRequirement {
  id: string;
  company_id: string;
  role: string;
  competency_id: string;
  required_level: CompetencyLevel;
  is_mandatory: boolean;
  notes: string | null;
}

export const useQualityRoleRequirements = (role?: string) => {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const companyId = profile?.company_id;

  const list = useQuery({
    queryKey: ["quality_role_requirements", companyId, role ?? "all"],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase
        .from("quality_role_requirements" as any)
        .select("*")
        .eq("company_id", companyId!);
      if (role) q = q.eq("role", role);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as RoleRequirement[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (input: Partial<RoleRequirement> & { role: string; competency_id: string; required_level: CompetencyLevel }) => {
      const payload: any = { ...input, company_id: companyId };
      const { error } = input.id
        ? await supabase.from("quality_role_requirements" as any).update(payload).eq("id", input.id)
        : await supabase.from("quality_role_requirements" as any).insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_role_requirements"] });
      qc.invalidateQueries({ queryKey: ["quality_matrix"] });
      toast({ title: "Requisito salvo" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quality_role_requirements" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_role_requirements"] });
      qc.invalidateQueries({ queryKey: ["quality_matrix"] });
    },
  });

  return { ...list, items: list.data ?? [], upsert, remove };
};
