import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { QualityReferenceNorm } from "@/hooks/useQualityIsoStructure";

export interface DocumentNormLink {
  document_id: string;
  norm_id: string;
  created_at: string;
}

const isExpired = (n: QualityReferenceNorm | any): boolean => {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  if (n.status && n.status !== "vigente") return true;
  if (n.valid_until && new Date(n.valid_until) < today) return true;
  if (n.next_review_due_at && new Date(n.next_review_due_at) < today) return true;
  return false;
};

export const useQualityDocumentNorms = (documentId?: string | null) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const key = ["quality_document_norms", documentId];

  const { data, isLoading } = useQuery({
    queryKey: key,
    enabled: !!documentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_document_norms" as any)
        .select("norm_id, document_id, created_at, norm:quality_reference_norms(*)")
        .eq("document_id", documentId!);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const links = data ?? [];
  const norms: any[] = links.map((l) => l.norm).filter(Boolean);
  const expiredNorms = norms.filter(isExpired);

  const setNorms = useMutation({
    mutationFn: async (normIds: string[]) => {
      if (!documentId) throw new Error("Documento não informado");
      const current = (links || []).map((l: any) => l.norm_id);
      const toAdd = normIds.filter((id) => !current.includes(id));
      const toRemove = current.filter((id) => !normIds.includes(id));

      if (toRemove.length) {
        const { error } = await supabase
          .from("quality_document_norms" as any)
          .delete()
          .eq("document_id", documentId)
          .in("norm_id", toRemove);
        if (error) throw error;
      }
      if (toAdd.length) {
        const { error } = await supabase
          .from("quality_document_norms" as any)
          .insert(toAdd.map((nid) => ({ document_id: documentId, norm_id: nid, created_by: user?.id })) as any);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast({ title: "Normas vinculadas atualizadas" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return { links, norms, expiredNorms, isLoading, setNorms };
};

export { isExpired as isNormExpired };
