import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface QualityDocumentType {
  id: string;
  company_id: string;
  code_prefix: string;
  name: string;
  description: string | null;
  default_classification: string | null;
  default_review_interval_months: number | null;
  default_control_mode: "controlled" | "uncontrolled" | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const useQualityDocumentTypes = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: types = [], isLoading } = useQuery({
    queryKey: ["quality_document_types"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_document_types")
        .select("*")
        .order("code_prefix");
      if (error) throw error;
      return data as QualityDocumentType[];
    },
    enabled: !!user,
  });

  const create = useMutation({
    mutationFn: async (
      input: Omit<QualityDocumentType, "id" | "company_id" | "created_at" | "updated_at" | "is_active"> &
        Partial<Pick<QualityDocumentType, "is_active">>
    ) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user!.id)
        .maybeSingle();
      if (!profile?.company_id) throw new Error("Empresa não encontrada");
      const { data, error } = await supabase
        .from("quality_document_types")
        .insert({ ...input, company_id: profile.company_id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_document_types"] });
      toast({ title: "Tipo de documento criado" });
    },
    onError: (e: any) => toast({ title: "Erro ao criar tipo", description: e.message, variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...changes }: Partial<QualityDocumentType> & { id: string }) => {
      const { data, error } = await supabase
        .from("quality_document_types")
        .update(changes)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_document_types"] });
      toast({ title: "Tipo de documento atualizado" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quality_document_types").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_document_types"] });
      toast({ title: "Tipo removido" });
    },
    onError: (e: any) => toast({ title: "Erro ao remover", description: e.message, variant: "destructive" }),
  });

  return { types, isLoading, create, update, remove };
};
