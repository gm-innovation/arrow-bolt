import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface AuditAttachment {
  id: string;
  audit_id: string;
  kind: "plan" | "evidence" | "report" | "photo" | "other";
  file_name: string;
  file_url: string;
  notes: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export const useQualityAuditAttachments = (auditId: string | null) => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: attachments = [] } = useQuery({
    queryKey: ["quality_audit_attachments", auditId],
    enabled: !!auditId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_audit_attachments" as any)
        .select("*")
        .eq("audit_id", auditId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown) as AuditAttachment[];
    },
  });

  const add = useMutation({
    mutationFn: async (a: { file_name: string; file_url: string; kind: AuditAttachment["kind"]; notes?: string }) => {
      if (!auditId) throw new Error("auditId obrigatório");
      const { error } = await supabase.from("quality_audit_attachments" as any).insert({
        ...a, audit_id: auditId, uploaded_by: user!.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_audit_attachments", auditId] });
      toast({ title: "Anexo adicionado" });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quality_audit_attachments" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quality_audit_attachments", auditId] }),
  });

  return { attachments, add, remove };
};
