import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export type ReviewStatus = "draft" | "in_progress" | "closed";

export interface ManagementReviewRow {
  id: string;
  company_id: string;
  review_date: string;
  period_start: string;
  period_end: string;
  status: ReviewStatus;
  chair_user_id: string | null;
  summary: string | null;
  minutes_document_id: string | null;
  signed_event_id: string | null;
  next_due_date: string | null;
  closed_at: string | null;
  closed_by: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  chair?: { full_name: string } | null;
  open_outputs_count?: number;
}

export const useManagementReviews = () => {
  const { user, profile } = useAuth();
  const qc = useQueryClient();

  const { data: reviews = [], isLoading } = useQuery({
    queryKey: ["management_reviews", profile?.company_id],
    enabled: !!user && !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_management_reviews" as any)
        .select("*, chair:profiles!quality_management_reviews_chair_user_id_fkey(full_name)")
        .eq("company_id", profile!.company_id)
        .order("review_date", { ascending: false });
      if (error) throw error;

      const ids = ((data as any[]) ?? []).map((r) => r.id);
      let openCounts: Record<string, number> = {};
      if (ids.length) {
        const { data: outs } = await supabase
          .from("quality_management_review_outputs" as any)
          .select("review_id,status")
          .in("review_id", ids);
        ((outs as any[]) ?? []).forEach((o) => {
          if (o.status !== "done") openCounts[o.review_id] = (openCounts[o.review_id] ?? 0) + 1;
        });
      }
      return ((data as any[]) ?? []).map((r) => ({
        ...r,
        open_outputs_count: openCounts[r.id] ?? 0,
      })) as ManagementReviewRow[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: {
      review_date: string;
      period_start: string;
      period_end: string;
      chair_user_id?: string | null;
    }) => {
      if (!profile?.company_id) throw new Error("Empresa não encontrada");
      const { data, error } = await supabase
        .from("quality_management_reviews" as any)
        .insert({
          company_id: profile.company_id,
          review_date: input.review_date,
          period_start: input.period_start,
          period_end: input.period_end,
          chair_user_id: input.chair_user_id ?? null,
          created_by: user!.id,
          status: "draft",
        })
        .select()
        .single();
      if (error) throw error;
      return data as any;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["management_reviews"] });
      toast({ title: "Reunião criada" });
    },
    onError: (e: any) => toast({ title: "Erro ao criar reunião", description: e.message, variant: "destructive" }),
  });

  return { reviews, isLoading, create };
};
