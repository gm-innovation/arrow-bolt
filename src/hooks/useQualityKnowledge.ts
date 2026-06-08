import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export type KnowledgeStatus = "draft" | "published" | "archived";

export interface KnowledgeArticle {
  id: string;
  company_id: string;
  title: string;
  body: string;
  category: string | null;
  tags: string[];
  source_type: string | null;
  source_id: string | null;
  author_id: string | null;
  status: KnowledgeStatus;
  version: number;
  published_at: string | null;
  review_period_months: number;
  reviewed_at: string | null;
  reviewed_by: string | null;
  review_due_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface KnowledgeInput {
  title: string;
  body?: string;
  category?: string | null;
  tags?: string[];
  source_type?: string | null;
  source_id?: string | null;
  status?: KnowledgeStatus;
  review_period_months?: number;
}

export const useQualityKnowledge = () => {
  const { user, profile } = useAuth();
  const qc = useQueryClient();

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["quality_knowledge", profile?.company_id],
    enabled: !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_knowledge_articles" as any)
        .select("*")
        .eq("company_id", profile!.company_id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown) as KnowledgeArticle[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: KnowledgeInput) => {
      if (!profile?.company_id || !user?.id) throw new Error("Sessão inválida");
      const payload: any = {
        company_id: profile.company_id,
        author_id: user.id,
        title: input.title,
        body: input.body ?? "",
        category: input.category ?? null,
        tags: input.tags ?? [],
        source_type: input.source_type ?? null,
        source_id: input.source_id ?? null,
        status: input.status ?? "draft",
        review_period_months: input.review_period_months ?? 12,
      };
      if (payload.status === "published") {
        payload.published_at = new Date().toISOString();
        payload.reviewed_at = new Date().toISOString();
        payload.reviewed_by = user.id;
      }
      const { data, error } = await supabase
        .from("quality_knowledge_articles" as any)
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_knowledge"] });
      toast({ title: "Artigo criado" });
    },
    onError: (e: any) =>
      toast({ title: "Erro ao criar artigo", description: e.message, variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async (input: Partial<KnowledgeArticle> & { id: string }) => {
      const { id, ...patch } = input;
      const { error } = await supabase
        .from("quality_knowledge_articles" as any)
        .update(patch as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_knowledge"] });
      toast({ title: "Artigo atualizado" });
    },
    onError: (e: any) =>
      toast({ title: "Erro ao atualizar", description: e.message, variant: "destructive" }),
  });

  const markReviewed = useMutation({
    mutationFn: async (id: string) => {
      if (!user?.id) throw new Error("Sessão inválida");
      const { error } = await supabase
        .from("quality_knowledge_articles" as any)
        .update({
          reviewed_at: new Date().toISOString(),
          reviewed_by: user.id,
        } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_knowledge"] });
      toast({ title: "Revisão registrada" });
    },
    onError: (e: any) =>
      toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("quality_knowledge_articles" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_knowledge"] });
      toast({ title: "Artigo removido" });
    },
  });

  return { articles, isLoading, create, update, markReviewed, remove };
};
