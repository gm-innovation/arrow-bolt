import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type ReviewEntityType =
  | "org_context"
  | "document"
  | "reference_norm"
  | "term"
  | "interested_party"
  | "risk";

export type ReviewComputedStatus = "overdue" | "due_soon" | "up_to_date" | "no_cycle";

export interface ReviewStatusRow {
  entity_type: ReviewEntityType;
  entity_id: string;
  company_id: string;
  entity_label: string;
  next_review_due_at: string | null;
  computed_status: ReviewComputedStatus;
}

export const ENTITY_LABEL: Record<ReviewEntityType, string> = {
  org_context: "Contexto",
  document: "Documento",
  reference_norm: "Norma",
  term: "Termo",
  interested_party: "Parte interessada",
  risk: "Risco",
};

export const ENTITY_LINK: Record<ReviewEntityType, string> = {
  org_context: "/quality/org-context",
  document: "/quality/documents",
  reference_norm: "/quality/iso-structure",
  term: "/quality/iso-structure",
  interested_party: "/quality/interested-parties",
  risk: "/quality/risks",
};

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
  const overdue = rows.filter((r) => r.computed_status === "overdue");
  const dueSoon = rows.filter((r) => r.computed_status === "due_soon");
  return { rows, overdue, dueSoon, isLoading };
};
