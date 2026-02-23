import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const useKnowledgeBase = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: articles = [], isLoading } = useQuery({
    queryKey: ["crm-knowledge-base", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      const { data, error } = await supabase
        .from("crm_knowledge_base")
        .select("*, profiles(full_name), crm_products(name)")
        .eq("company_id", profile.company_id)
        .order("updated_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id,
  });

  const { data: documents = [] } = useQuery({
    queryKey: ["crm-reference-documents", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      const { data, error } = await supabase
        .from("crm_reference_documents")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id,
  });

  const createArticle = useMutation({
    mutationFn: async (article: Record<string, any>) => {
      const { target_segment, priority, version, notes, ...rest } = article;
      const { error } = await supabase.from("crm_knowledge_base" as any).insert({
        ...rest,
        target_segment: target_segment || null,
        priority: priority || null,
        version: version || null,
        notes: notes || null,
        company_id: profile?.company_id,
        author_id: profile?.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-knowledge-base"] });
      toast.success("Artigo criado");
    },
    onError: () => toast.error("Erro ao criar artigo"),
  });

  const updateArticle = useMutation({
    mutationFn: async ({ id, ...article }: Record<string, any>) => {
      const { error } = await supabase.from("crm_knowledge_base").update(article).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-knowledge-base"] });
      toast.success("Artigo atualizado");
    },
    onError: () => toast.error("Erro ao atualizar artigo"),
  });

  const deleteArticle = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_knowledge_base").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-knowledge-base"] });
      toast.success("Artigo removido");
    },
    onError: () => toast.error("Erro ao remover artigo"),
  });

  const uploadDocument = useMutation({
    mutationFn: async ({ file, category, knowledgeBaseId }: { file: File; category?: string; knowledgeBaseId?: string }) => {
      const sanitizedName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const path = `${profile?.company_id}/${Date.now()}_${sanitizedName}`;
      const { error: uploadError } = await supabase.storage.from("crm-documents").upload(path, file);
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from("crm-documents").getPublicUrl(path);

      const { error } = await supabase.from("crm_reference_documents").insert({
        company_id: profile?.company_id,
        knowledge_base_id: knowledgeBaseId || null,
        file_name: file.name,
        file_url: urlData.publicUrl,
        file_type: file.type,
        category,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-reference-documents"] });
      toast.success("Documento enviado");
    },
    onError: () => toast.error("Erro ao enviar documento"),
  });

  return { articles, documents, isLoading, createArticle, updateArticle, deleteArticle, uploadDocument };
};
