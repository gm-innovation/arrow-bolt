import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface Competitor {
  id: string;
  company_id: string;
  name: string;
  market_segment: string | null;
  size_category: string | null;
  positioning: string | null;
  estimated_market_share: number | null;
  price_range: string | null;
  strengths: string | null;
  weaknesses: string | null;
  notes: string | null;
  website: string | null;
  interested_party_id: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CompetitorAnalysis {
  id: string;
  company_id: string;
  title: string;
  analysis_period: string | null;
  summary: string | null;
  methodology: string | null;
  conclusions: string | null;
  author_user_id: string | null;
  performed_at: string;
  next_review_at: string | null;
  status: "draft" | "published" | "archived";
  created_at: string;
  updated_at: string;
}

export type GapType = "advantage" | "disadvantage" | "parity" | "opportunity" | "threat";

export interface CompetitorAnalysisItem {
  id: string;
  analysis_id: string;
  competitor_id: string | null;
  dimension: string;
  our_position: string | null;
  competitor_position: string | null;
  gap_type: GapType | null;
  gap_description: string | null;
  recommended_action: string | null;
  linked_risk_id: string | null;
  linked_context_item_id: string | null;
  sort_order: number;
}

export function useQualityCompetitors() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const companyId = profile?.company_id;

  const competitors = useQuery({
    queryKey: ["quality_competitors", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_competitors")
        .select("*")
        .eq("company_id", companyId!)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Competitor[];
    },
  });

  const saveCompetitor = useMutation({
    mutationFn: async (payload: Partial<Competitor> & { id?: string }) => {
      if (!companyId) throw new Error("Sem empresa");
      if (payload.id) {
        const { id, ...rest } = payload;
        const { error } = await supabase.from("quality_competitors").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("quality_competitors")
          .insert({ ...payload, company_id: companyId, name: payload.name ?? "" } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_competitors"] });
      toast({ title: "Concorrente salvo" });
    },
    onError: (e: any) => toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" }),
  });

  const removeCompetitor = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quality_competitors").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_competitors"] });
      toast({ title: "Concorrente removido" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return {
    competitors: competitors.data ?? [],
    isLoading: competitors.isLoading,
    saveCompetitor,
    removeCompetitor,
  };
}

export function useQualityCompetitorAnalyses() {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const companyId = profile?.company_id;

  const analyses = useQuery({
    queryKey: ["quality_competitor_analyses", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_competitor_analyses")
        .select("*")
        .eq("company_id", companyId!)
        .order("performed_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as CompetitorAnalysis[];
    },
  });

  const saveAnalysis = useMutation({
    mutationFn: async (payload: Partial<CompetitorAnalysis> & { id?: string }) => {
      if (!companyId) throw new Error("Sem empresa");
      if (payload.id) {
        const { id, ...rest } = payload;
        const { error } = await supabase.from("quality_competitor_analyses").update(rest).eq("id", id);
        if (error) throw error;
        return id;
      } else {
        const { data, error } = await supabase
          .from("quality_competitor_analyses")
          .insert({ ...payload, company_id: companyId, title: payload.title ?? "Nova análise" } as any)
          .select("id")
          .single();
        if (error) throw error;
        return data.id as string;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_competitor_analyses"] });
      toast({ title: "Análise salva" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const removeAnalysis = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quality_competitor_analyses").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_competitor_analyses"] });
      toast({ title: "Análise removida" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return {
    analyses: analyses.data ?? [],
    isLoading: analyses.isLoading,
    saveAnalysis,
    removeAnalysis,
  };
}

export function useCompetitorAnalysisItems(analysisId: string | null) {
  const qc = useQueryClient();

  const items = useQuery({
    queryKey: ["quality_competitor_analysis_items", analysisId],
    enabled: !!analysisId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_competitor_analysis_items")
        .select("*")
        .eq("analysis_id", analysisId!)
        .order("sort_order")
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as CompetitorAnalysisItem[];
    },
  });

  const saveItem = useMutation({
    mutationFn: async (payload: Partial<CompetitorAnalysisItem> & { id?: string }) => {
      if (!analysisId) throw new Error("Sem análise");
      if (payload.id) {
        const { id, ...rest } = payload;
        const { error } = await supabase.from("quality_competitor_analysis_items").update(rest).eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("quality_competitor_analysis_items")
          .insert({ ...payload, analysis_id: analysisId, dimension: payload.dimension ?? "" } as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_competitor_analysis_items", analysisId] });
      toast({ title: "Item salvo" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quality_competitor_analysis_items").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () =>
      qc.invalidateQueries({ queryKey: ["quality_competitor_analysis_items", analysisId] }),
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return { items: items.data ?? [], isLoading: items.isLoading, saveItem, removeItem };
}
