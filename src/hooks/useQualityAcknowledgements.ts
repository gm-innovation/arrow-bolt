import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface AcknowledgementAssignment {
  id: string;
  document_id: string;
  version_id: string;
  user_id: string;
  assigned_by: string | null;
  assigned_at: string;
  due_date: string | null;
  status: "pending" | "acknowledged" | "cancelled";
  acknowledged_at: string | null;
  signature_event_id: string | null;
}

export interface AcknowledgementViewRow extends AcknowledgementAssignment {
  company_id: string;
  document_code: string;
  document_title: string;
  requires_strong_acknowledgement: boolean;
  revision_label: string;
  version_status: string;
}

export const useMyAcknowledgements = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["my_acknowledgements", user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_acknowledgements_v" as any)
        .select("*")
        .eq("user_id", user!.id)
        .order("assigned_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as AcknowledgementViewRow[];
    },
  });

  const acknowledge = useMutation({
    mutationFn: async (assignmentId: string) => {
      const ua = navigator.userAgent;
      const { data, error } = await supabase.rpc(
        "quality_register_acknowledgement" as any,
        { p_assignment_id: assignmentId, p_ip: null, p_user_agent: ua } as any,
      );
      if (error) throw error;
      return data as unknown as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["my_acknowledgements"] });
      qc.invalidateQueries({ queryKey: ["document_acknowledgements"] });
      qc.invalidateQueries({ queryKey: ["company_acknowledgements_pending"] });
      toast({ title: "Ciência registrada" });
    },
    onError: (e: any) => {
      const map: Record<string, string> = {
        signature_required_but_missing:
          "Este documento exige assinatura eletrônica. Cadastre sua assinatura em 'Minha Assinatura' antes de confirmar.",
        forbidden_not_assignee: "Esta atribuição não é sua.",
        assignment_cancelled: "Atribuição cancelada pelo Master.",
        assignment_not_found: "Atribuição não encontrada.",
      };
      const raw = e?.message || "";
      const key = Object.keys(map).find((k) => raw.includes(k));
      toast({
        title: "Não foi possível registrar",
        description: key ? map[key] : raw || "Falha ao registrar ciência",
        variant: "destructive",
      });
    },
  });

  const pending = items.filter((i) => i.status === "pending");
  const history = items.filter((i) => i.status !== "pending");

  return { items, pending, history, isLoading, acknowledge };
};

export const useDocumentAcknowledgements = (
  documentId: string | undefined,
  versionId?: string | null,
) => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["document_acknowledgements", documentId, versionId],
    enabled: !!documentId,
    queryFn: async () => {
      let q = supabase
        .from("quality_document_acknowledgement_assignments" as any)
        .select("*")
        .eq("document_id", documentId!)
        .order("assigned_at", { ascending: false });
      if (versionId) q = q.eq("version_id", versionId);
      const { data, error } = await q;
      if (error) throw error;
      const rows = (data ?? []) as any[];
      const ids = Array.from(new Set(rows.map((r) => r.user_id)));
      if (ids.length === 0) return rows;
      const { data: profs } = await supabase
        .from("profiles")
        .select("id, full_name, email")
        .in("id", ids);
      const byId = new Map((profs ?? []).map((p: any) => [p.id, p]));
      return rows.map((r) => ({ ...r, user: byId.get(r.user_id) || null }));
    },
  });

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["document_acknowledgements", documentId] });

  const assign = useMutation({
    mutationFn: async (params: {
      user_ids: string[];
      version_id: string;
      due_date?: string | null;
    }) => {
      const rows = params.user_ids.map((uid) => ({
        document_id: documentId!,
        version_id: params.version_id,
        user_id: uid,
        assigned_by: user!.id,
        due_date: params.due_date || null,
        status: "pending",
      }));
      const { error } = await supabase
        .from("quality_document_acknowledgement_assignments" as any)
        .insert(rows as any);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Atribuições criadas" });
    },
    onError: (e: any) =>
      toast({ title: "Erro ao atribuir", description: e.message, variant: "destructive" }),
  });

  const cancel = useMutation({
    mutationFn: async (assignmentId: string) => {
      const { error } = await supabase
        .from("quality_document_acknowledgement_assignments" as any)
        .update({ status: "cancelled" } as any)
        .eq("id", assignmentId);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Atribuição cancelada" });
    },
    onError: (e: any) =>
      toast({ title: "Erro ao cancelar", description: e.message, variant: "destructive" }),
  });

  const setRequiresStrong = useMutation({
    mutationFn: async (value: boolean) => {
      const { error } = await supabase
        .from("quality_documents")
        .update({ requires_strong_acknowledgement: value } as any)
        .eq("id", documentId!);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_document", documentId] });
      qc.invalidateQueries({ queryKey: ["quality_documents"] });
      toast({ title: "Atualizado" });
    },
    onError: (e: any) =>
      toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const list = items as any[];
  const cancelled = list.filter((i) => i.status === "cancelled").length;
  const acknowledged = list.filter((i) => i.status === "acknowledged").length;
  const pending = list.filter((i) => i.status === "pending").length;
  const total = list.length;
  const effective = total - cancelled;
  const progress = effective > 0 ? Math.round((acknowledged / effective) * 100) : 0;

  return {
    items: list,
    isLoading,
    assign,
    cancel,
    setRequiresStrong,
    total,
    acknowledged,
    pending,
    cancelled,
    progress,
  };
};

export const useCompanyPendingAcknowledgements = () => {
  const { profile } = useAuth();
  const { data: count = 0 } = useQuery({
    queryKey: ["company_acknowledgements_pending", profile?.company_id],
    enabled: !!profile?.company_id,
    queryFn: async () => {
      const { count, error } = await supabase
        .from("quality_acknowledgements_v" as any)
        .select("assignment_id", { count: "exact", head: true })
        .eq("company_id", profile!.company_id)
        .eq("status", "pending");
      if (error) return 0;
      return count ?? 0;
    },
  });
  return count;
};
