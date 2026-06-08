import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export type ApprovalEntityType =
  | "document" | "company_document" | "process" | "policy" | "context_official" | "ncr" | "deviation";

export interface CentralApproval {
  id: string;
  company_id: string;
  entity_type: ApprovalEntityType;
  entity_id: string;
  status: "pending" | "approved" | "rejected";
  requested_by: string | null;
  requested_at: string;
  approved_by: string | null;
  approved_at: string | null;
  notes: string | null;
  created_at: string;
}

export interface CentralApprovalEvent {
  id: string;
  approval_id: string;
  company_id: string;
  event_type: "requested" | "approved" | "rejected" | "commented" | "reassigned";
  actor_user_id: string | null;
  comment: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
}

const logEvent = async (
  approval: Pick<CentralApproval, "id" | "company_id">,
  event_type: CentralApprovalEvent["event_type"],
  actor: string,
  comment?: string | null,
  metadata?: Record<string, unknown>,
) => {
  await supabase.from("quality_central_approval_events" as any).insert({
    approval_id: approval.id,
    company_id: approval.company_id,
    event_type,
    actor_user_id: actor,
    comment: comment ?? null,
    metadata: metadata ?? {},
  });
};

export const useCentralApproval = (entity_type?: ApprovalEntityType, entity_id?: string) => {
  const { user, profile } = useAuth();
  const qc = useQueryClient();

  const { data: approval } = useQuery({
    queryKey: ["central_approval", entity_type, entity_id],
    enabled: !!entity_type && !!entity_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_central_approvals" as any)
        .select("*")
        .eq("entity_type", entity_type!)
        .eq("entity_id", entity_id!)
        .order("requested_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown) as CentralApproval | null;
    },
  });

  const request = useMutation({
    mutationFn: async (notes?: string) => {
      if (!profile?.company_id || !entity_type || !entity_id) throw new Error("Parâmetros faltando");
      const { data, error } = await supabase
        .from("quality_central_approvals" as any)
        .insert({
          company_id: profile.company_id,
          entity_type, entity_id,
          requested_by: user!.id,
          status: "pending",
          notes,
        } as any).select().maybeSingle();
      if (error) throw error;
      if (data) await logEvent(data as any, "requested", user!.id, notes);
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["central_approval"] });
      qc.invalidateQueries({ queryKey: ["central_approvals_queue"] });
      qc.invalidateQueries({ queryKey: ["central_approval_events"] });
      toast({ title: "Solicitação enviada ao Master" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return { approval, request };
};

export const useCentralApprovalsQueue = () => {
  const { user, profile } = useAuth();
  const qc = useQueryClient();

  const { data: pending = [], isLoading } = useQuery({
    queryKey: ["central_approvals_queue", profile?.company_id],
    enabled: !!user && !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_central_approvals" as any)
        .select("*")
        .eq("company_id", profile!.company_id)
        .eq("status", "pending")
        .order("requested_at", { ascending: true });
      if (error) throw error;
      return (data as unknown) as CentralApproval[];
    },
  });

  const decide = useMutation({
    mutationFn: async ({ id, status, notes }: { id: string; status: "approved" | "rejected"; notes?: string }) => {
      const { data: updated, error } = await supabase
        .from("quality_central_approvals" as any)
        .update({
          status,
          approved_by: user!.id,
          approved_at: new Date().toISOString(),
          notes: notes ?? null,
        } as any)
        .eq("id", id)
        .select()
        .maybeSingle();
      if (error) throw error;
      if (updated) await logEvent(updated as any, status, user!.id, notes);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["central_approvals_queue"] });
      qc.invalidateQueries({ queryKey: ["central_approval"] });
      qc.invalidateQueries({ queryKey: ["central_approval_events"] });
      toast({ title: "Decisão registrada" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const comment = useMutation({
    mutationFn: async ({ approval, text }: { approval: CentralApproval; text: string }) => {
      if (!text.trim()) return;
      await logEvent(approval, "commented", user!.id, text.trim());
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["central_approval_events"] });
      toast({ title: "Comentário registrado" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return { pending, isLoading, decide, comment };
};

export const useCentralApprovalEvents = (approvalId?: string) => {
  const { data, isLoading } = useQuery({
    queryKey: ["central_approval_events", approvalId],
    enabled: !!approvalId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_central_approval_events" as any)
        .select("*")
        .eq("approval_id", approvalId!)
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data as unknown) as CentralApprovalEvent[];
    },
  });
  return { events: data ?? [], isLoading };
};
