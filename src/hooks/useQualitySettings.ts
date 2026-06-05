import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface QualityReviewCycles {
  org_context_months: number;
  interested_parties_months: number;
  critical_review_months: number;
  alert_window_days: number;
}

export interface QualitySettings {
  id: string;
  company_id: string;
  review_cycles: QualityReviewCycles;
  critical_review_required_topics: { key: string; label: string }[];
  created_at: string;
  updated_at: string;
}

const DEFAULTS: QualityReviewCycles = {
  org_context_months: 12,
  interested_parties_months: 12,
  critical_review_months: 12,
  alert_window_days: 30,
};

export const useQualitySettings = () => {
  const { user, profile } = useAuth();
  const qc = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["quality_settings", profile?.company_id],
    enabled: !!user && !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_settings" as any)
        .select("*")
        .eq("company_id", profile!.company_id)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown) as QualitySettings | null;
    },
  });

  const upsert = useMutation({
    mutationFn: async (patch: {
      review_cycles?: Partial<QualityReviewCycles>;
      critical_review_required_topics?: { key: string; label: string }[];
    }) => {
      if (!profile?.company_id) throw new Error("Empresa não encontrada");
      const merged = {
        company_id: profile.company_id,
        review_cycles: { ...DEFAULTS, ...(settings?.review_cycles ?? {}), ...(patch.review_cycles ?? {}) },
        critical_review_required_topics:
          patch.critical_review_required_topics ?? settings?.critical_review_required_topics ?? [],
      };
      const { data, error } = await supabase
        .from("quality_settings" as any)
        .upsert(merged, { onConflict: "company_id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_settings"] });
      toast({ title: "Configurações atualizadas" });
    },
    onError: (e: any) =>
      toast({ title: "Erro ao atualizar configurações", description: e.message, variant: "destructive" }),
  });

  return {
    settings,
    isLoading,
    cycles: (settings?.review_cycles as QualityReviewCycles) ?? DEFAULTS,
    upsert,
  };
};
