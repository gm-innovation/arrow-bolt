import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface AuditAttachment {
  id: string;
  audit_id: string;
  kind: "plan" | "evidence" | "report" | "photo" | "other";
  file_name: string;
  file_url: string | null;
  storage_path: string | null;
  notes: string | null;
  uploaded_by: string | null;
  created_at: string;
}

const BUCKET = "quality-evidences";

const sanitizeFilename = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9.\-_]/g, "_")
    .replace(/_+/g, "_")
    .toLowerCase();

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
    mutationFn: async (a: {
      file: File;
      kind: AuditAttachment["kind"];
      notes?: string;
    }) => {
      if (!auditId) throw new Error("auditId obrigatório");
      if (!user?.id) throw new Error("Sessão não encontrada. Faça login novamente.");

      const safeName = sanitizeFilename(a.file.name);
      const path = `audits/${auditId}/${Date.now()}_${safeName}`;

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, a.file, {
          contentType: a.file.type || undefined,
          upsert: false,
        });
      if (upErr) throw upErr;

      const { error } = await supabase
        .from("quality_audit_attachments" as any)
        .insert({
          audit_id: auditId,
          file_name: a.file.name,
          storage_path: path,
          kind: a.kind,
          notes: a.notes ?? null,
          uploaded_by: user.id,
        } as any);
      if (error) {
        // rollback storage
        await supabase.storage.from(BUCKET).remove([path]);
        throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_audit_attachments", auditId] });
      toast({ title: "Anexo adicionado" });
    },
    onError: (e: any) => {
      toast({
        title: "Falha no upload",
        description: e?.message ?? "Tente novamente.",
        variant: "destructive",
      });
    },
  });

  const remove = useMutation({
    mutationFn: async (att: AuditAttachment) => {
      if (att.storage_path) {
        await supabase.storage.from(BUCKET).remove([att.storage_path]);
      }
      const { error } = await supabase
        .from("quality_audit_attachments" as any)
        .delete()
        .eq("id", att.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_audit_attachments", auditId] });
      toast({ title: "Anexo removido" });
    },
    onError: (e: any) =>
      toast({ title: "Falha ao remover", description: e?.message, variant: "destructive" }),
  });

  const openAttachment = async (att: AuditAttachment) => {
    if (att.storage_path) {
      const { data, error } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(att.storage_path, 60 * 60);
      if (error || !data?.signedUrl) {
        toast({ title: "Não foi possível abrir o arquivo", variant: "destructive" });
        return;
      }
      window.open(data.signedUrl, "_blank", "noopener,noreferrer");
      return;
    }
    if (att.file_url) window.open(att.file_url, "_blank", "noopener,noreferrer");
  };

  return { attachments, add, remove, openAttachment };
};
