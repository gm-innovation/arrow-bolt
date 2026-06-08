import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export type ContextCategory =
  | "swot_strength" | "swot_weakness" | "swot_opportunity" | "swot_threat"
  | "pestal_political" | "pestal_economic" | "pestal_social"
  | "pestal_technological" | "pestal_environmental" | "pestal_legal";

export type ImpactLevel = "low" | "medium" | "high";

export interface ContextItem {
  id: string;
  company_id: string;
  category: ContextCategory;
  title: string;
  description: string | null;
  impact_level: ImpactLevel | null;
  position: number;
  linked_risk_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface OrgContext {
  id: string;
  company_id: string;
  applicable_scope: string | null;
  internal_issues: string | null;
  external_issues: string | null;
  review_frequency_months: number | null;
  last_reviewed_at: string | null;
  last_reviewed_by: string | null;
  last_review_notes: string | null;
  next_review_due_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ContextVersion {
  id: string;
  company_id: string;
  version_number: number;
  scope: string | null;
  internal_issues: string | null;
  external_issues: string | null;
  items_snapshot: any[];
  reviewed_by: string | null;
  reviewed_at: string;
  review_notes: string | null;
  approved: boolean;
  approved_by: string | null;
  approved_at: string | null;
  created_at: string;
}

export const useQualityOrgContext = () => {
  const { profile, user } = useAuth();
  const qc = useQueryClient();
  const companyId = profile?.company_id;

  const context = useQuery({
    queryKey: ["quality_org_context", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_org_context" as any).select("*").eq("company_id", companyId!).maybeSingle();
      if (error) throw error;
      return (data ?? null) as unknown as OrgContext | null;
    },
  });

  const items = useQuery({
    queryKey: ["quality_context_items", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_context_items" as any).select("*").eq("company_id", companyId!)
        .order("category", { ascending: true }).order("position", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ContextItem[];
    },
  });

  const versions = useQuery({
    queryKey: ["quality_context_versions", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_context_versions" as any).select("*").eq("company_id", companyId!)
        .order("version_number", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ContextVersion[];
    },
  });

  const saveContext = useMutation({
    mutationFn: async (patch: Partial<OrgContext>) => {
      const payload: any = { ...patch, company_id: companyId };
      if (context.data?.id) {
        const { data, error } = await supabase
          .from("quality_org_context" as any).update(payload).eq("id", context.data.id).select().maybeSingle();
        if (error) throw error;
        return data;
      }
      const { data, error } = await supabase
        .from("quality_org_context" as any).insert(payload).select().maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_org_context"] });
      toast({ title: "Contexto salvo" });
    },
    onError: (e: any) => toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" }),
  });

  const upsertItem = useMutation({
    mutationFn: async (input: Partial<ContextItem> & { category: ContextCategory; title: string }) => {
      const payload: any = { ...input };
      if (!input.id) {
        payload.company_id = companyId;
        payload.created_by = user?.id ?? null;
      }
      const { data, error } = input.id
        ? await supabase.from("quality_context_items" as any).update(payload).eq("id", input.id).select().maybeSingle()
        : await supabase.from("quality_context_items" as any).insert(payload).select().maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_context_items"] });
      toast({ title: "Item salvo" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quality_context_items" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_context_items"] });
      toast({ title: "Item removido" });
    },
  });

  const linkItemRisk = useMutation({
    mutationFn: async (args: { itemId: string; riskId: string }) => {
      const { error } = await supabase
        .from("quality_context_items" as any)
        .update({ linked_risk_id: args.riskId } as any).eq("id", args.itemId);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quality_context_items"] }),
  });

  const createSnapshot = useMutation({
    mutationFn: async (notes: string) => {
      if (!companyId) throw new Error("Sem empresa");
      const itemsSnapshot = (items.data ?? []).map(i => ({
        category: i.category, title: i.title, description: i.description,
        impact_level: i.impact_level, linked_risk_id: i.linked_risk_id,
      }));
      const payload: any = {
        company_id: companyId,
        version_number: 0,
        scope: context.data?.applicable_scope ?? null,
        internal_issues: context.data?.internal_issues ?? null,
        external_issues: context.data?.external_issues ?? null,
        items_snapshot: itemsSnapshot,
        reviewed_by: user?.id ?? null,
        review_notes: notes || null,
        approved: true,
        approved_by: user?.id ?? null,
        approved_at: new Date().toISOString(),
      };
      const { data, error } = await supabase
        .from("quality_context_versions" as any).insert(payload).select().maybeSingle();
      if (error) throw error;

      if (context.data?.id) {
        const months = context.data.review_frequency_months ?? 12;
        const next = new Date();
        next.setMonth(next.getMonth() + months);
        await supabase.from("quality_org_context" as any).update({
          last_reviewed_at: new Date().toISOString(),
          last_reviewed_by: user?.id ?? null,
          last_review_notes: notes || null,
          next_review_due_at: next.toISOString().slice(0, 10),
        } as any).eq("id", context.data.id);
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_context_versions"] });
      qc.invalidateQueries({ queryKey: ["quality_org_context"] });
      toast({ title: "Revisão registrada" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return {
    context: context.data ?? null,
    items: items.data ?? [],
    versions: versions.data ?? [],
    isLoading: context.isLoading || items.isLoading,
    saveContext, upsertItem, removeItem, linkItemRisk, createSnapshot,
  };
};
