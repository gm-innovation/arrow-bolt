import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface CompanyDocument {
  id: string;
  company_id: string;
  document_type: string;
  title: string;
  file_url: string | null;
  file_name: string | null;
  issued_at: string | null;
  expires_at: string | null;
  status: "active" | "expired" | "renewing" | "archived";
  owner_user_id: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const useQualityCompanyDocuments = () => {
  const { user, profile } = useAuth();
  const qc = useQueryClient();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["quality_company_documents", profile?.company_id],
    enabled: !!user && !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_company_documents" as any)
        .select("*")
        .eq("company_id", profile!.company_id)
        .order("expires_at", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return (data as unknown) as CompanyDocument[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (doc: Partial<CompanyDocument> & { document_type: string; title: string }) => {
      if (!profile?.company_id) throw new Error("Empresa não encontrada");
      const payload: any = {
        ...doc,
        company_id: profile.company_id,
      };
      if (!doc.id) payload.created_by = user!.id;
      const { data, error } = doc.id
        ? await supabase.from("quality_company_documents" as any).update(payload).eq("id", doc.id).select().maybeSingle()
        : await supabase.from("quality_company_documents" as any).insert(payload).select().maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_company_documents"] });
      toast({ title: "Documento salvo" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quality_company_documents" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_company_documents"] });
      toast({ title: "Documento removido" });
    },
  });

  return { documents, isLoading, upsert, remove };
};
