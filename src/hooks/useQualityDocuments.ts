import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export type QDocStatus = "draft" | "pending_approval" | "published" | "obsolete" | "archived";
export type QDocContentKind = "rich_text" | "file";

export interface QualityDocument {
  id: string;
  company_id: string;
  document_type_id: string | null;
  code: string;
  title: string;
  classification: string | null;
  normative_reference: string | null;
  status: QDocStatus;
  current_version_id: string | null;
  published_at: string | null;
  next_review_date: string | null;
  expires_at: string | null;
  widely_visible: boolean;
  obsolete_at: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface QualityDocumentVersion {
  id: string;
  document_id: string;
  revision_label: string;
  revision_number: number;
  content_kind: QDocContentKind;
  rich_content: any | null;
  file_path: string | null;
  file_name: string | null;
  file_mime: string | null;
  file_size: number | null;
  change_summary: string | null;
  prepared_by: string | null;
  approved_by: string | null;
  issued_at: string | null;
  approved_at: string | null;
  status: QDocStatus;
  created_at: string;
  updated_at: string;
}

export const useQualityDocuments = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["quality_documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_documents")
        .select("*, document_type:quality_document_types(id, code_prefix, name)")
        .order("code");
      if (error) throw error;
      return data as any[];
    },
    enabled: !!user,
  });

  const create = useMutation({
    mutationFn: async (input: {
      code: string;
      title: string;
      document_type_id?: string | null;
      classification?: string | null;
      normative_reference?: string | null;
      next_review_date?: string | null;
      widely_visible?: boolean;
    }) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user!.id)
        .maybeSingle();
      if (!profile?.company_id) throw new Error("Empresa não encontrada");
      const { data, error } = await supabase
        .from("quality_documents")
        .insert({ ...input, company_id: profile.company_id, created_by: user!.id, status: "draft" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_documents"] });
      toast({ title: "Documento criado" });
    },
    onError: (e: any) => toast({ title: "Erro ao criar", description: e.message, variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...changes }: Partial<QualityDocument> & { id: string }) => {
      const { data, error } = await supabase
        .from("quality_documents")
        .update(changes)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["quality_documents"] }),
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quality_documents").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_documents"] });
      toast({ title: "Documento removido" });
    },
    onError: (e: any) => toast({ title: "Erro ao remover", description: e.message, variant: "destructive" }),
  });

  return { documents, isLoading, create, update, remove };
};

export const useQualityDocument = (id: string | undefined) => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["quality_document", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_documents")
        .select("*, document_type:quality_document_types(*), current_version:quality_document_versions!quality_documents_current_version_fk(*)")
        .eq("id", id!)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
    enabled: !!id && !!user,
  });

  const { data: versions = [] } = useQuery({
    queryKey: ["quality_document_versions", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_document_versions")
        .select("*")
        .eq("document_id", id!)
        .order("revision_number", { ascending: false });
      if (error) throw error;
      return data as QualityDocumentVersion[];
    },
    enabled: !!id && !!user,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["quality_document", id] });
    qc.invalidateQueries({ queryKey: ["quality_document_versions", id] });
    qc.invalidateQueries({ queryKey: ["quality_documents"] });
  };

  const createVersion = useMutation({
    mutationFn: async (input: {
      revision_label: string;
      content_kind: QDocContentKind;
      rich_content?: any;
      file_path?: string;
      file_name?: string;
      file_mime?: string;
      file_size?: number;
      change_summary?: string;
    }) => {
      if (!id) throw new Error("Documento inválido");
      const lastRevision = versions[0]?.revision_number ?? 0;
      const { data, error } = await supabase
        .from("quality_document_versions")
        .insert({
          document_id: id,
          revision_label: input.revision_label,
          revision_number: lastRevision + 1,
          content_kind: input.content_kind,
          rich_content: input.rich_content ?? null,
          file_path: input.file_path ?? null,
          file_name: input.file_name ?? null,
          file_mime: input.file_mime ?? null,
          file_size: input.file_size ?? null,
          change_summary: input.change_summary ?? null,
          prepared_by: user!.id,
          issued_at: new Date().toISOString(),
          status: "draft",
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Nova versão criada" });
    },
    onError: (e: any) => toast({ title: "Erro ao criar versão", description: e.message, variant: "destructive" }),
  });

  const submitForApproval = useMutation({
    mutationFn: async (versionId: string) => {
      const { error: vErr } = await supabase
        .from("quality_document_versions")
        .update({ status: "pending_approval" })
        .eq("id", versionId);
      if (vErr) throw vErr;
      const { error: dErr } = await supabase
        .from("quality_documents")
        .update({ status: "pending_approval" })
        .eq("id", id!);
      if (dErr) throw dErr;

      // notifica os usuários Master da Qualidade
      try {
        const { data: masters } = await supabase
          .from("user_roles")
          .select("user_id")
          .eq("role", "qualidade" as any);
        if (masters && masters.length > 0 && data) {
          await supabase.from("notifications").insert(
            masters.map((m: any) => ({
              user_id: m.user_id,
              title: "Documento aguardando aprovação",
              message: `${data.code} — ${data.title} foi enviado para aprovação.`,
              notification_type: "quality_document",
              reference_id: id!,
            }))
          );
        }
      } catch (e) {
        console.warn("[quality] notify submit failed", e);
      }
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Enviado para aprovação" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const approveAndPublish = useMutation({
    mutationFn: async (input: { versionId: string; signatureEventId?: string | null }) => {
      const now = new Date().toISOString();
      // grava aprovação
      const { error: aErr } = await supabase.from("quality_document_approvals").insert({
        version_id: input.versionId,
        approver_user_id: user!.id,
        approver_role: "qualidade",
        decision: "approved",
        signature_event_id: input.signatureEventId ?? null,
      });
      if (aErr) throw aErr;

      // marca versões anteriores como obsoletas
      await supabase
        .from("quality_document_versions")
        .update({ status: "obsolete" })
        .eq("document_id", id!)
        .eq("status", "published");

      // publica versão atual
      const { error: vErr } = await supabase
        .from("quality_document_versions")
        .update({ status: "published", approved_by: user!.id, approved_at: now })
        .eq("id", input.versionId);
      if (vErr) throw vErr;

      // documento publicado, current_version aponta
      const { error: dErr } = await supabase
        .from("quality_documents")
        .update({ status: "published", current_version_id: input.versionId, published_at: now })
        .eq("id", id!);
      if (dErr) throw dErr;

      // notifica criador + colaboradores com permissão de visualização
      try {
        const targets = new Set<string>();
        if (data?.created_by && data.created_by !== user!.id) targets.add(data.created_by);
        const { data: perms } = await supabase
          .from("quality_document_permissions")
          .select("user_id")
          .eq("document_id", id!)
          .eq("can_view", true);
        perms?.forEach((p: any) => p.user_id && targets.add(p.user_id));
        if (targets.size > 0 && data) {
          await supabase.from("notifications").insert(
            Array.from(targets).map((uid) => ({
              user_id: uid,
              title: "Documento publicado",
              message: `${data.code} — ${data.title} foi aprovado e publicado.`,
              notification_type: "quality_document",
              reference_id: id!,
            }))
          );
        }
      } catch (e) {
        console.warn("[quality] notify approve failed", e);
      }
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Documento aprovado e publicado" });
    },
    onError: (e: any) => toast({ title: "Erro ao aprovar", description: e.message, variant: "destructive" }),
  });

  const markObsolete = useMutation({
    mutationFn: async () => {
      const now = new Date().toISOString();
      await supabase.from("quality_documents").update({ status: "obsolete", obsolete_at: now }).eq("id", id!);
      await supabase
        .from("quality_document_versions")
        .update({ status: "obsolete" })
        .eq("document_id", id!)
        .eq("status", "published");
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Documento marcado como obsoleto" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return { document: data, versions, isLoading, createVersion, submitForApproval, approveAndPublish, markObsolete };
};
