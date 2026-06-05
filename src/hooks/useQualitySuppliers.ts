import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export type SupplierCategory =
  | "material" | "service" | "calibration" | "training" | "software" | "logistics" | "other";
export type SupplierStatus = "pending" | "approved" | "conditional" | "suspended" | "disqualified";
export type SupplierCriticality = "low" | "medium" | "high" | "critical";
export type SupplierEvaluationKind = "initial" | "periodic" | "incident" | "requalification";
export type SupplierCriterionCode = "quality" | "delivery" | "price" | "support" | "compliance" | "safety";

export interface QualitySupplier {
  id: string;
  company_id: string;
  name: string;
  tax_id: string | null;
  category: SupplierCategory;
  criticality: SupplierCriticality;
  status: SupplierStatus;
  contact_name: string | null;
  contact_email: string | null;
  contact_phone: string | null;
  scope_description: string | null;
  notes: string | null;
  requalification_frequency_months: number;
  last_evaluation_at: string | null;
  next_evaluation_due: string | null;
  current_score: number | null;
  current_grade: string | null;
  owner_user_id: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupplierFilters {
  category?: SupplierCategory | "all";
  status?: SupplierStatus | "all";
  criticality?: SupplierCriticality | "all";
  onlyOverdue?: boolean;
  search?: string;
}

export const useQualitySuppliers = (filters: SupplierFilters = {}) => {
  const { profile, user } = useAuth();
  const qc = useQueryClient();
  const companyId = profile?.company_id;

  const list = useQuery({
    queryKey: ["quality_suppliers", companyId, filters],
    enabled: !!companyId,
    queryFn: async () => {
      let q = (supabase.from("quality_suppliers" as any) as any)
        .select("*")
        .eq("company_id", companyId!)
        .order("name", { ascending: true });
      if (filters.category && filters.category !== "all") q = q.eq("category", filters.category);
      if (filters.status && filters.status !== "all") q = q.eq("status", filters.status);
      if (filters.criticality && filters.criticality !== "all") q = q.eq("criticality", filters.criticality);
      if (filters.search) q = q.ilike("name", `%${filters.search}%`);
      const { data, error } = await q;
      if (error) throw error;
      let items = (data ?? []) as unknown as QualitySupplier[];
      if (filters.onlyOverdue) {
        const today = new Date().toISOString().slice(0, 10);
        items = items.filter((s) => s.next_evaluation_due && s.next_evaluation_due < today);
      }
      return items;
    },
  });

  const upsert = useMutation({
    mutationFn: async (input: Partial<QualitySupplier> & { name: string }) => {
      const payload: any = { ...input };
      if (!input.id) {
        payload.company_id = companyId;
        payload.created_by = user?.id ?? null;
      }
      const { data, error } = input.id
        ? await (supabase.from("quality_suppliers" as any) as any).update(payload).eq("id", input.id).select().single()
        : await (supabase.from("quality_suppliers" as any) as any).insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_suppliers"] });
      toast({ title: "Fornecedor salvo" });
    },
    onError: (e: any) => toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("quality_suppliers" as any) as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_suppliers"] });
      toast({ title: "Fornecedor removido" });
    },
  });

  return { ...list, items: list.data ?? [], upsert, remove };
};

export const useQualitySupplier = (id?: string) => {
  return useQuery({
    queryKey: ["quality_supplier", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await (supabase.from("quality_suppliers" as any) as any)
        .select("*").eq("id", id!).maybeSingle();
      if (error) throw error;
      return data as unknown as QualitySupplier | null;
    },
  });
};

// ============= Evaluations =============
export interface SupplierEvaluation {
  id: string;
  company_id: string;
  supplier_id: string;
  kind: SupplierEvaluationKind;
  evaluation_date: string;
  period_start: string | null;
  period_end: string | null;
  score: number | null;
  grade: string | null;
  status_after: SupplierStatus | null;
  evaluator_id: string | null;
  summary: string | null;
  recommendations: string | null;
  next_due_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface SupplierCriterion {
  id: string;
  evaluation_id: string;
  criterion_code: SupplierCriterionCode;
  weight: number;
  score: number;
  notes: string | null;
}

export const useQualitySupplierEvaluations = (supplierId?: string) => {
  const { profile, user } = useAuth();
  const qc = useQueryClient();
  const companyId = profile?.company_id;

  const list = useQuery({
    queryKey: ["quality_supplier_evaluations", supplierId],
    enabled: !!supplierId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("quality_supplier_evaluations" as any) as any)
        .select("*")
        .eq("supplier_id", supplierId!)
        .order("evaluation_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SupplierEvaluation[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: {
      supplier_id: string;
      kind: SupplierEvaluationKind;
      evaluation_date: string;
      period_start?: string | null;
      period_end?: string | null;
      summary?: string | null;
      recommendations?: string | null;
      criteria: { criterion_code: SupplierCriterionCode; weight: number; score: number; notes?: string | null }[];
    }) => {
      const { data: evalRow, error: e1 } = await (supabase.from("quality_supplier_evaluations" as any) as any)
        .insert({
          company_id: companyId,
          supplier_id: input.supplier_id,
          kind: input.kind,
          evaluation_date: input.evaluation_date,
          period_start: input.period_start ?? null,
          period_end: input.period_end ?? null,
          summary: input.summary ?? null,
          recommendations: input.recommendations ?? null,
          evaluator_id: user?.id ?? null,
        })
        .select().single();
      if (e1) throw e1;

      if (input.criteria.length > 0) {
        const rows = input.criteria.map((c) => ({
          company_id: companyId,
          evaluation_id: evalRow.id,
          criterion_code: c.criterion_code,
          weight: c.weight,
          score: c.score,
          notes: c.notes ?? null,
        }));
        const { error: e2 } = await (supabase.from("quality_supplier_evaluation_criteria" as any) as any).insert(rows);
        if (e2) throw e2;
      }
      return evalRow;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["quality_supplier_evaluations", vars.supplier_id] });
      qc.invalidateQueries({ queryKey: ["quality_suppliers"] });
      qc.invalidateQueries({ queryKey: ["quality_supplier", vars.supplier_id] });
      toast({ title: "Avaliação registrada" });
    },
    onError: (e: any) => toast({ title: "Erro ao avaliar", description: e.message, variant: "destructive" }),
  });

  return { ...list, items: list.data ?? [], create };
};

export const useQualitySupplierCriteria = (evaluationId?: string) =>
  useQuery({
    queryKey: ["quality_supplier_evaluation_criteria", evaluationId],
    enabled: !!evaluationId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("quality_supplier_evaluation_criteria" as any) as any)
        .select("*").eq("evaluation_id", evaluationId!);
      if (error) throw error;
      return (data ?? []) as unknown as SupplierCriterion[];
    },
  });

// ============= Incidents =============
export interface SupplierIncident {
  id: string;
  company_id: string;
  supplier_id: string;
  incident_date: string;
  severity: "low" | "medium" | "high" | "critical";
  description: string;
  linked_ncr_id: string | null;
  resolved_at: string | null;
  resolved_by: string | null;
  reported_by: string | null;
  created_at: string;
}

export const useQualitySupplierIncidents = (supplierId?: string) => {
  const { profile, user } = useAuth();
  const qc = useQueryClient();
  const companyId = profile?.company_id;

  const list = useQuery({
    queryKey: ["quality_supplier_incidents", supplierId],
    enabled: !!supplierId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("quality_supplier_incidents" as any) as any)
        .select("*").eq("supplier_id", supplierId!).order("incident_date", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SupplierIncident[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: Partial<SupplierIncident> & { supplier_id: string; description: string }) => {
      const { error } = await (supabase.from("quality_supplier_incidents" as any) as any).insert({
        company_id: companyId,
        supplier_id: input.supplier_id,
        incident_date: input.incident_date ?? new Date().toISOString().slice(0, 10),
        severity: input.severity ?? "medium",
        description: input.description,
        linked_ncr_id: input.linked_ncr_id ?? null,
        reported_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["quality_supplier_incidents", vars.supplier_id] });
      qc.invalidateQueries({ queryKey: ["quality_suppliers"] });
      toast({ title: "Incidente registrado" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const resolve = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("quality_supplier_incidents" as any) as any)
        .update({ resolved_at: new Date().toISOString(), resolved_by: user?.id }).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_supplier_incidents"] });
      qc.invalidateQueries({ queryKey: ["quality_suppliers"] });
      toast({ title: "Incidente resolvido" });
    },
  });

  return { ...list, items: list.data ?? [], create, resolve };
};

// ============= Documents =============
export interface SupplierDocument {
  id: string;
  supplier_id: string;
  document_type: string;
  file_url: string;
  file_name: string;
  valid_until: string | null;
  uploaded_by: string | null;
  created_at: string;
}

export const useQualitySupplierDocuments = (supplierId?: string) => {
  const { profile, user } = useAuth();
  const qc = useQueryClient();
  const companyId = profile?.company_id;

  const list = useQuery({
    queryKey: ["quality_supplier_documents", supplierId],
    enabled: !!supplierId,
    queryFn: async () => {
      const { data, error } = await (supabase.from("quality_supplier_documents" as any) as any)
        .select("*").eq("supplier_id", supplierId!).order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as SupplierDocument[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: { supplier_id: string; document_type: string; file_url: string; file_name: string; valid_until?: string | null }) => {
      const { error } = await (supabase.from("quality_supplier_documents" as any) as any).insert({
        company_id: companyId,
        supplier_id: input.supplier_id,
        document_type: input.document_type,
        file_url: input.file_url,
        file_name: input.file_name,
        valid_until: input.valid_until ?? null,
        uploaded_by: user?.id ?? null,
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["quality_supplier_documents", vars.supplier_id] });
      toast({ title: "Documento adicionado" });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase.from("quality_supplier_documents" as any) as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_supplier_documents"] });
      toast({ title: "Documento removido" });
    },
  });

  return { ...list, items: list.data ?? [], create, remove };
};
