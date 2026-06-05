import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import type { ManagementReviewRow, ReviewStatus } from "./useManagementReviews";

export type ReviewInputType =
  | "previous_actions_status"
  | "external_internal_changes"
  | "qms_performance"
  | "resources_adequacy"
  | "stakeholder_feedback"
  | "improvement_opportunities"
  | "risks_opportunities";

export const INPUT_LABELS: Record<ReviewInputType, string> = {
  previous_actions_status: "Status de ações anteriores",
  external_internal_changes: "Mudanças externas e internas",
  qms_performance: "Desempenho do SGQ",
  resources_adequacy: "Adequação de recursos",
  stakeholder_feedback: "Feedback de partes interessadas",
  improvement_opportunities: "Oportunidades de melhoria",
  risks_opportunities: "Riscos e oportunidades",
};

export type ReviewOutputType =
  | "improvement_opportunity"
  | "qms_change"
  | "resource_need"
  | "decision";

export const OUTPUT_LABELS: Record<ReviewOutputType, string> = {
  improvement_opportunity: "Oportunidade de melhoria",
  qms_change: "Mudança no SGQ",
  resource_need: "Necessidade de recursos",
  decision: "Decisão",
};

export interface ReviewInput {
  id: string;
  review_id: string;
  input_type: ReviewInputType;
  content: any;
  notes: string | null;
  is_snapshot: boolean;
  snapshot_at: string | null;
}

export interface ReviewOutput {
  id: string;
  review_id: string;
  output_type: ReviewOutputType;
  description: string;
  responsible_user_id: string | null;
  due_date: string | null;
  linked_action_plan_id: string | null;
  status: "open" | "in_progress" | "done";
  responsible?: { full_name: string } | null;
}

export interface ReviewParticipant {
  id: string;
  review_id: string;
  user_id: string;
  role_in_meeting: "chair" | "member" | "guest";
  attended: boolean;
  confirmed_at: string | null;
  signature_event_id: string | null;
  profile?: { full_name: string; email: string } | null;
}

export const useManagementReview = (reviewId: string | undefined) => {
  const { user } = useAuth();
  const qc = useQueryClient();
  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["management_review", reviewId] });
    qc.invalidateQueries({ queryKey: ["management_reviews"] });
  };

  const { data: review, isLoading: loadingReview } = useQuery({
    queryKey: ["management_review", reviewId],
    enabled: !!reviewId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_management_reviews" as any)
        .select("*, chair:profiles!quality_management_reviews_chair_user_id_fkey(full_name)")
        .eq("id", reviewId!)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as ManagementReviewRow | null;
    },
  });

  const { data: inputs = [] } = useQuery({
    queryKey: ["management_review_inputs", reviewId],
    enabled: !!reviewId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_management_review_inputs" as any)
        .select("*")
        .eq("review_id", reviewId!)
        .order("input_type");
      if (error) throw error;
      return ((data as any[]) ?? []) as ReviewInput[];
    },
  });

  const { data: outputs = [] } = useQuery({
    queryKey: ["management_review_outputs", reviewId],
    enabled: !!reviewId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_management_review_outputs" as any)
        .select("*, responsible:profiles!quality_management_review_outputs_responsible_user_id_fkey(full_name)")
        .eq("review_id", reviewId!)
        .order("created_at");
      if (error) throw error;
      return ((data as any[]) ?? []) as ReviewOutput[];
    },
  });

  const { data: participants = [] } = useQuery({
    queryKey: ["management_review_participants", reviewId],
    enabled: !!reviewId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_management_review_participants" as any)
        .select("*, profile:profiles!quality_management_review_participants_user_id_fkey(full_name,email)")
        .eq("review_id", reviewId!);
      if (error) throw error;
      return ((data as any[]) ?? []) as ReviewParticipant[];
    },
  });

  const buildInputs = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("quality_build_review_inputs" as any, { p_review_id: reviewId });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      qc.invalidateQueries({ queryKey: ["management_review_inputs", reviewId] });
      toast({ title: "Entradas geradas" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const updateInputNotes = useMutation({
    mutationFn: async (p: { id: string; notes: string }) => {
      const { error } = await supabase
        .from("quality_management_review_inputs" as any)
        .update({ notes: p.notes })
        .eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["management_review_inputs", reviewId] }),
  });

  const updateStatus = useMutation({
    mutationFn: async (status: ReviewStatus) => {
      const { error } = await supabase
        .from("quality_management_reviews" as any)
        .update({ status })
        .eq("id", reviewId!);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Status atualizado" });
    },
    onError: (e: any) => toast({ title: "Erro ao atualizar", description: e.message, variant: "destructive" }),
  });

  const updateSummary = useMutation({
    mutationFn: async (summary: string) => {
      const { error } = await supabase
        .from("quality_management_reviews" as any)
        .update({ summary })
        .eq("id", reviewId!);
      if (error) throw error;
    },
    onSuccess: () => invalidate(),
  });

  const addOutput = useMutation({
    mutationFn: async (p: Omit<ReviewOutput, "id" | "review_id" | "linked_action_plan_id" | "status" | "responsible">) => {
      const { error } = await supabase.from("quality_management_review_outputs" as any).insert({
        review_id: reviewId,
        output_type: p.output_type,
        description: p.description,
        responsible_user_id: p.responsible_user_id,
        due_date: p.due_date,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["management_review_outputs", reviewId] });
      toast({ title: "Saída adicionada" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const updateOutput = useMutation({
    mutationFn: async (p: { id: string; status: "open" | "in_progress" | "done" }) => {
      const { error } = await supabase
        .from("quality_management_review_outputs" as any)
        .update({ status: p.status })
        .eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["management_review_outputs", reviewId] }),
  });

  const removeOutput = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quality_management_review_outputs" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["management_review_outputs", reviewId] }),
  });

  const addParticipant = useMutation({
    mutationFn: async (p: { user_id: string; role_in_meeting: "chair" | "member" | "guest" }) => {
      const { error } = await supabase.from("quality_management_review_participants" as any).insert({
        review_id: reviewId,
        user_id: p.user_id,
        role_in_meeting: p.role_in_meeting,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["management_review_participants", reviewId] });
      toast({ title: "Participante adicionado" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const updateParticipant = useMutation({
    mutationFn: async (p: { id: string; attended?: boolean; confirmed_at?: string | null }) => {
      const patch: any = {};
      if (p.attended !== undefined) patch.attended = p.attended;
      if (p.confirmed_at !== undefined) patch.confirmed_at = p.confirmed_at;
      const { error } = await supabase
        .from("quality_management_review_participants" as any)
        .update(patch)
        .eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["management_review_participants", reviewId] }),
  });

  const removeParticipant = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quality_management_review_participants" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["management_review_participants", reviewId] }),
  });

  const attachMinutes = useMutation({
    mutationFn: async (p: { minutes_document_id: string; signed_event_id?: string | null }) => {
      const { error } = await supabase
        .from("quality_management_reviews" as any)
        .update({ minutes_document_id: p.minutes_document_id, signed_event_id: p.signed_event_id ?? null })
        .eq("id", reviewId!);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Ata vinculada" });
    },
  });

  return {
    review,
    inputs,
    outputs,
    participants,
    isLoading: loadingReview,
    buildInputs,
    updateInputNotes,
    updateStatus,
    updateSummary,
    addOutput,
    updateOutput,
    removeOutput,
    addParticipant,
    updateParticipant,
    removeParticipant,
    attachMinutes,
  };
};
