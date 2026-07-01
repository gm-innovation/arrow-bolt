import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export type ProcessDocRelationship = "input" | "output" | "reference" | "procedure";

export const RELATIONSHIP_TYPE_LABELS: Record<ProcessDocRelationship, string> = {
  input: "Entrada",
  output: "Saída",
  reference: "Referência",
  procedure: "Procedimento",
};

export interface ProcessDocumentLink {
  id: string;
  company_id: string;
  process_id: string;
  document_id: string;
  relationship_type: ProcessDocRelationship;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  document?: { id: string; code: string; title: string; status: string } | null;
}

export const useQualityProcessDocuments = (processId: string | null) => {
  const { profile, user } = useAuth();
  const qc = useQueryClient();
  const companyId = profile?.company_id;

  const list = useQuery({
    queryKey: ["quality_process_documents", processId],
    enabled: !!processId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_process_documents" as any)
        .select("*, document:quality_documents(id, code, title, status)")
        .eq("process_id", processId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as ProcessDocumentLink[];
    },
  });

  const link = useMutation({
    mutationFn: async (args: { documentId: string; relationshipType: ProcessDocRelationship; notes?: string }) => {
      if (!processId || !companyId) throw new Error("Sem processo ou empresa");
      const { error } = await supabase.from("quality_process_documents" as any).insert({
        company_id: companyId,
        process_id: processId,
        document_id: args.documentId,
        relationship_type: args.relationshipType,
        notes: args.notes ?? null,
        created_by: user?.id ?? null,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_process_documents", processId] });
      toast({ title: "Documento vinculado" });
    },
    onError: (e: any) => toast({ title: "Erro ao vincular", description: e.message, variant: "destructive" }),
  });

  const unlink = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quality_process_documents" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_process_documents", processId] });
      toast({ title: "Vínculo removido" });
    },
  });

  return { links: list.data ?? [], isLoading: list.isLoading, link, unlink };
};
