import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export type DeviationOrigin = "document" | "process" | "product" | "ncr" | "other";
export type DeviationStatus = "open" | "approved" | "rejected" | "expired" | "closed";

export interface Deviation {
  id: string;
  company_id: string;
  origin_type: DeviationOrigin;
  origin_ref_id: string | null;
  title: string;
  description: string;
  justification: string | null;
  requested_by: string | null;
  approved_by: string | null;
  approved_at: string | null;
  expires_at: string | null;
  status: DeviationStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const useQualityDeviations = (filters?: { origin_type?: DeviationOrigin; origin_ref_id?: string }) => {
  const { profile, user } = useAuth();
  const qc = useQueryClient();
  const companyId = profile?.company_id;

  const list = useQuery({
    queryKey: ["quality_deviations", companyId, filters],
    enabled: !!companyId,
    queryFn: async () => {
      let q = supabase.from("quality_deviations" as any).select("*").eq("company_id", companyId!).order("created_at", { ascending: false });
      if (filters?.origin_type) q = q.eq("origin_type", filters.origin_type);
      if (filters?.origin_ref_id) q = q.eq("origin_ref_id", filters.origin_ref_id);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as Deviation[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: Partial<Deviation> & { title: string; description: string; origin_type: DeviationOrigin }) => {
      const payload: any = { ...input, company_id: companyId, requested_by: user?.id ?? null };
      const { data, error } = await supabase.from("quality_deviations" as any).insert(payload).select().maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_deviations"] });
      toast({ title: "Desvio registrado" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<Deviation> }) => {
      const { data, error } = await supabase.from("quality_deviations" as any).update(patch as any).eq("id", id).select().maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_deviations"] });
      toast({ title: "Desvio atualizado" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quality_deviations" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_deviations"] });
      toast({ title: "Desvio removido" });
    },
  });

  return { deviations: list.data ?? [], isLoading: list.isLoading, create, update, remove };
};
