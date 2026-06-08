import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ReviewEntity = "norma" | "termo" | "parte_interessada" | "contexto" | "risco";

export interface ReviewStatusRow {
  entity_type: ReviewEntity;
  entity_id: string;
  company_id: string;
  entity_label: string;
  next_review_due_at: string | null;
  computed_status: "atrasada" | "vence_30d" | "ok" | "sem_ciclo";
}

export const useQualityReviewStatus = () => {
  const { profile, user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["quality_review_status", profile?.company_id],
    enabled: !!user && !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_review_status_v" as any)
        .select("*")
        .eq("company_id", profile!.company_id);
      if (error) throw error;
      return ((data ?? []) as unknown) as ReviewStatusRow[];
    },
  });

  const rows = data ?? [];
  const overdue = rows.filter((r) => r.computed_status === "atrasada");
  const dueSoon = rows.filter((r) => r.computed_status === "vence_30d");
  return { rows, overdue, dueSoon, isLoading };
};
