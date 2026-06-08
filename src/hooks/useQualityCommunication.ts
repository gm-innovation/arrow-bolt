import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export type CommunicationType =
  | "training"
  | "quality_policy"
  | "meeting"
  | "campaign"
  | "alert"
  | "management_review"
  | "other";

export const COMMUNICATION_TYPE_LABELS: Record<CommunicationType, string> = {
  training: "Treinamento",
  quality_policy: "Política da Qualidade",
  meeting: "Reunião",
  campaign: "Campanha",
  alert: "Alerta",
  management_review: "Análise Crítica",
  other: "Outro",
};

export type CommunicationStatus = "active" | "paused" | "archived";

export interface CommunicationPlan {
  id: string;
  company_id: string;
  subject: string;
  communication_type: CommunicationType;
  target_audience: string;
  channel: string;
  frequency: string;
  owner_id: string | null;
  next_scheduled_at: string | null;
  status: CommunicationStatus;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface CommunicationLogEntry {
  id: string;
  plan_id: string;
  company_id: string;
  executed_at: string;
  executed_by: string | null;
  evidence_url: string | null;
  notes: string | null;
  created_at: string;
}

export const useQualityCommunication = () => {
  const { user, profile } = useAuth();
  const qc = useQueryClient();

  const { data: plans = [], isLoading } = useQuery({
    queryKey: ["quality_communication_plan", profile?.company_id],
    enabled: !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_communication_plan" as any)
        .select("*")
        .eq("company_id", profile!.company_id)
        .order("next_scheduled_at", { ascending: true, nullsFirst: false });
      if (error) throw error;
      return ((data ?? []) as unknown) as CommunicationPlan[];
    },
  });

  const createPlan = useMutation({
    mutationFn: async (input: Partial<CommunicationPlan> & { subject: string }) => {
      if (!profile?.company_id) throw new Error("Sessão inválida");
      const payload: any = {
        company_id: profile.company_id,
        subject: input.subject,
        communication_type: input.communication_type ?? "other",
        target_audience: input.target_audience ?? "",
        channel: input.channel ?? "",
        frequency: input.frequency ?? "",
        owner_id: input.owner_id ?? user?.id ?? null,
        next_scheduled_at: input.next_scheduled_at ?? null,
        status: input.status ?? "active",
        notes: input.notes ?? null,
      };
      const { data, error } = await supabase
        .from("quality_communication_plan" as any)
        .insert(payload)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_communication_plan"] });
      toast({ title: "Plano criado" });
    },
    onError: (e: any) =>
      toast({ title: "Erro ao criar plano", description: e.message, variant: "destructive" }),
  });

  const updatePlan = useMutation({
    mutationFn: async (input: Partial<CommunicationPlan> & { id: string }) => {
      const { id, ...patch } = input;
      const { error } = await supabase
        .from("quality_communication_plan" as any)
        .update(patch as any)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_communication_plan"] });
      toast({ title: "Plano atualizado" });
    },
    onError: (e: any) =>
      toast({ title: "Erro ao atualizar", description: e.message, variant: "destructive" }),
  });

  const removePlan = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("quality_communication_plan" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_communication_plan"] });
      toast({ title: "Plano removido" });
    },
  });

  const logExecution = useMutation({
    mutationFn: async (input: {
      plan_id: string;
      evidence_url?: string | null;
      notes?: string | null;
    }) => {
      if (!profile?.company_id || !user?.id) throw new Error("Sessão inválida");
      const { error } = await supabase
        .from("quality_communication_log" as any)
        .insert({
          plan_id: input.plan_id,
          company_id: profile.company_id,
          executed_by: user.id,
          evidence_url: input.evidence_url ?? null,
          notes: input.notes ?? null,
        } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_communication_plan"] });
      qc.invalidateQueries({ queryKey: ["quality_communication_log"] });
      toast({ title: "Execução registrada" });
    },
    onError: (e: any) =>
      toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return { plans, isLoading, createPlan, updatePlan, removePlan, logExecution };
};

export const useQualityCommunicationLog = (planId?: string) => {
  return useQuery({
    queryKey: ["quality_communication_log", planId],
    enabled: !!planId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_communication_log" as any)
        .select("*")
        .eq("plan_id", planId!)
        .order("executed_at", { ascending: false });
      if (error) throw error;
      return ((data ?? []) as unknown) as CommunicationLogEntry[];
    },
  });
};
