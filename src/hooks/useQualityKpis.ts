import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface KpiCards {
  company_id: string;
  ncrs_open: number;
  ncrs_overdue: number;
  plans_overdue: number;
  plans_effective: number;
  plans_evaluated: number;
  documents_published: number;
  documents_expiring_30d: number;
  documents_pending_approval: number;
  avg_approval_days: number | null;
  avg_ncr_resolution_days: number | null;
  reviews_closed_12m: number;
  review_outputs_open: number;
  findings_major_12m: number;
  findings_minor_12m: number;
  findings_observation_12m: number;
  findings_opportunity_12m: number;
}

export interface KpiSeriesPoint {
  company_id: string;
  month: string;
  ncrs_opened: number;
  ncrs_closed: number;
  plans_effective: number;
  plans_ineffective: number;
  audits_planned: number;
  audits_executed: number;
  documents_published: number;
}

export interface KpiRecurrence {
  root_cause_sample: string;
  occurrences: number;
}

export interface KpiOverview {
  cards: KpiCards | null;
  series: KpiSeriesPoint[];
  recurrence: KpiRecurrence[];
  generated_at: string;
}

export const useQualityKpis = () => {
  const { user, profile } = useAuth();

  const query = useQuery({
    queryKey: ["quality_kpis", profile?.company_id],
    enabled: !!user && !!profile?.company_id,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: true,
    queryFn: async (): Promise<KpiOverview> => {
      const { data, error } = await supabase.rpc(
        "quality_kpi_get_overview" as any,
        { p_company_id: profile!.company_id }
      );
      if (error) throw error;
      const o = (data ?? {}) as any;
      return {
        cards: o.cards ?? null,
        series: o.series ?? [],
        recurrence: o.recurrence ?? [],
        generated_at: o.generated_at,
      };
    },
  });

  return {
    overview: query.data,
    cards: query.data?.cards ?? null,
    series: query.data?.series ?? [],
    recurrence: query.data?.recurrence ?? [],
    isLoading: query.isLoading,
    refetch: query.refetch,
  };
};
