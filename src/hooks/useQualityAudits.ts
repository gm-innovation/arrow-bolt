import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface QualityAudit {
  id: string;
  company_id: string;
  audit_number: number;
  title: string;
  scope: string | null;
  audit_type: string;
  status: string;
  planned_date: string;
  actual_date: string | null;
  lead_auditor_id: string | null;
  department: string | null;
  standard_reference: string | null;
  conclusion: string | null;
  summary: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  lead_auditor?: { full_name: string } | null;
}

export interface QualityAuditFinding {
  id: string;
  audit_id: string;
  finding_type: string;
  description: string;
  evidence: string | null;
  clause_reference: string | null;
  corrective_action_required: boolean;
  action_plan_id: string | null;
  responsible_id: string | null;
  deadline: string | null;
  status: string;
  responsible?: { full_name: string } | null;
}

export const useQualityAudits = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: audits = [], isLoading } = useQuery({
    queryKey: ["quality-audits"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_audits")
        .select("*, lead_auditor:profiles!quality_audits_lead_auditor_id_fkey(full_name)")
        .order("planned_date", { ascending: false });

      if (error) throw error;
      return data as unknown as QualityAudit[];
    },
    enabled: !!user,
  });

  const createAudit = useMutation({
    mutationFn: async (values: {
      title: string;
      scope?: string;
      audit_type: string;
      planned_date: string;
      lead_auditor_id?: string;
      department?: string;
      standard_reference?: string;
    }) => {
      const { data: profile } = await supabase.from("profiles").select("company_id").eq("id", user!.id).single();
      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      const { error } = await supabase.from("quality_audits").insert({
        company_id: profile.company_id,
        title: values.title,
        scope: values.scope || null,
        audit_type: values.audit_type,
        planned_date: values.planned_date,
        lead_auditor_id: values.lead_auditor_id || null,
        department: values.department || null,
        standard_reference: values.standard_reference || null,
        created_by: user!.id,
        status: "planned",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quality-audits"] });
      toast({ title: "Auditoria agendada com sucesso" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar auditoria", description: error.message, variant: "destructive" });
    },
  });

  const updateAudit = useMutation({
    mutationFn: async ({ id, ...values }: { id: string; [key: string]: unknown }) => {
      const { error } = await supabase.from("quality_audits").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quality-audits"] });
      toast({ title: "Auditoria atualizada" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar", description: error.message, variant: "destructive" });
    },
  });

  return { audits, isLoading, createAudit, updateAudit };
};

export const useAuditFindings = (auditId: string | null) => {
  const queryClient = useQueryClient();

  const { data: findings = [], isLoading } = useQuery({
    queryKey: ["quality-audit-findings", auditId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_audit_findings")
        .select("*, responsible:profiles!quality_audit_findings_responsible_id_fkey(full_name)")
        .eq("audit_id", auditId!)
        .order("created_at");

      if (error) throw error;
      return data as unknown as QualityAuditFinding[];
    },
    enabled: !!auditId,
  });

  const createFinding = useMutation({
    mutationFn: async (values: { audit_id: string; finding_type: string; description: string; evidence?: string; clause_reference?: string; corrective_action_required?: boolean; responsible_id?: string; deadline?: string }) => {
      const { error } = await supabase.from("quality_audit_findings").insert({
        ...values,
        evidence: values.evidence || null,
        clause_reference: values.clause_reference || null,
        responsible_id: values.responsible_id || null,
        deadline: values.deadline || null,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quality-audit-findings", auditId] });
      toast({ title: "Achado registrado" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao registrar achado", description: error.message, variant: "destructive" });
    },
  });

  return { findings, isLoading, createFinding };
};
