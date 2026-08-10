import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

/** Buckets onde documentos de colaborador podem estar (legado: ficha do técnico). */
export const HR_DOC_BUCKETS = ["corp-documents", "technician-documents"] as const;
export type HrDocBucket = (typeof HR_DOC_BUCKETS)[number];
export const DEFAULT_HR_DOC_BUCKET: HrDocBucket = "corp-documents";

export interface HrStoredDoc {
  file_path: string;
  storage_bucket?: string | null;
}

/**
 * Gera um link assinado para um documento de colaborador, usando o bucket
 * registrado e caindo para o outro bucket quando o registro é legado.
 */
export const createHrDocSignedUrl = async (
  doc: HrStoredDoc,
  expiresIn = 60 * 10,
): Promise<string> => {
  const preferred = (doc.storage_bucket as HrDocBucket) || DEFAULT_HR_DOC_BUCKET;
  const order = [preferred, ...HR_DOC_BUCKETS.filter((b) => b !== preferred)];
  let lastError: any = null;
  for (const bucket of order) {
    const { data, error } = await supabase.storage
      .from(bucket)
      .createSignedUrl(doc.file_path, expiresIn);
    if (!error && data?.signedUrl) return data.signedUrl;
    lastError = error;
  }
  throw new Error(hrDocErrorMessage(lastError));
};

/** Baixa o arquivo (blob) do bucket correto, com fallback para registros legados. */
export const downloadHrDoc = async (doc: HrStoredDoc): Promise<Blob> => {
  const preferred = (doc.storage_bucket as HrDocBucket) || DEFAULT_HR_DOC_BUCKET;
  const order = [preferred, ...HR_DOC_BUCKETS.filter((b) => b !== preferred)];
  let lastError: any = null;
  for (const bucket of order) {
    const { data, error } = await supabase.storage.from(bucket).download(doc.file_path);
    if (!error && data) return data;
    lastError = error;
  }
  throw new Error(hrDocErrorMessage(lastError));
};

/** Remove o arquivo do bucket registrado (e do alternativo, para registros legados). */
export const removeHrDocFile = async (doc: HrStoredDoc): Promise<void> => {
  const preferred = (doc.storage_bucket as HrDocBucket) || DEFAULT_HR_DOC_BUCKET;
  const order = [preferred, ...HR_DOC_BUCKETS.filter((b) => b !== preferred)];
  for (const bucket of order) {
    const { error } = await supabase.storage.from(bucket).remove([doc.file_path]);
    if (!error) return;
  }
};

/** Mensagem de erro em pt-BR conforme a causa conhecida. */
export const hrDocErrorMessage = (error: any): string => {
  const raw = `${error?.message ?? ""} ${error?.error ?? ""}`.toLowerCase();
  if (raw.includes("not found") || raw.includes("does not exist")) {
    return "Arquivo não encontrado no armazenamento.";
  }
  if (raw.includes("unauthorized") || raw.includes("permission") || raw.includes("policy")) {
    return "Você não tem permissão para acessar este documento.";
  }
  return error?.message || "Não foi possível abrir o documento.";
};

/** Mensagem de erro em pt-BR para falhas de envio de documento. */
export const hrDocUploadErrorMessage = (error: any): string => {
  const raw = `${error?.message ?? ""} ${error?.error ?? ""}`.toLowerCase();
  if (raw.includes("unauthorized") || raw.includes("permission") || raw.includes("policy") || raw.includes("row-level")) {
    return "Você não tem permissão para enviar documentos deste colaborador.";
  }
  if (raw.includes("already exists") || raw.includes("duplicate")) {
    return "Já existe um arquivo com este nome. Renomeie o arquivo e tente novamente.";
  }
  if (raw.includes("payload too large") || raw.includes("maximum allowed size")) {
    return "Arquivo muito grande para o envio.";
  }
  return error?.message || "Não foi possível enviar o documento.";
};



export type ComplianceStatus =
  | "missing"
  | "pending_review"
  | "valid"
  | "expiring_soon"
  | "expired";

export interface ComplianceRow {
  employee_id: string;
  employee_name: string;
  employee_position: string | null;
  direct_manager_id: string | null;
  catalog_id: string;
  catalog_name: string;
  catalog_category: string;
  responsible_role: string;
  renewal_warning_days: number;
  document_id: string | null;
  expiry_date: string | null;
  due_in_days: number | null;
  status: ComplianceStatus;
}

export interface EmployeeAggregate {
  employee_id: string;
  employee_name: string;
  employee_position: string | null;
  direct_manager_id: string | null;
  total: number;
  missing: number;
  pending_review: number;
  expiring_soon: number;
  expired: number;
  valid: number;
  worstStatus: ComplianceStatus;
  rows: ComplianceRow[];
}

const sanitizeFileName = (name: string) =>
  name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/\s+/g, "_")
    .replace(/[^a-zA-Z0-9._-]/g, "");

const statusRank: Record<ComplianceStatus, number> = {
  expired: 5,
  missing: 4,
  expiring_soon: 3,
  pending_review: 2,
  valid: 1,
};

export const useComplianceOverview = () => {
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  return useQuery({
    queryKey: ["hr-compliance-overview", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<{ rows: ComplianceRow[]; byEmployee: EmployeeAggregate[] }> => {
      const { data, error } = await (supabase as any).rpc("hr_employee_document_status", {
        _company_id: companyId,
      });
      if (error) throw error;
      const rows = (data ?? []) as ComplianceRow[];

      const map = new Map<string, EmployeeAggregate>();
      for (const r of rows) {
        const agg = map.get(r.employee_id) ?? {
          employee_id: r.employee_id,
          employee_name: r.employee_name,
          employee_position: r.employee_position,
          direct_manager_id: r.direct_manager_id,
          total: 0,
          missing: 0,
          pending_review: 0,
          expiring_soon: 0,
          expired: 0,
          valid: 0,
          worstStatus: "valid" as ComplianceStatus,
          rows: [] as ComplianceRow[],
        };
        agg.total += 1;
        agg[r.status] += 1;
        agg.rows.push(r);
        if (statusRank[r.status] > statusRank[agg.worstStatus]) agg.worstStatus = r.status;
        map.set(r.employee_id, agg);
      }
      const byEmployee = [...map.values()].sort((a, b) =>
        a.employee_name.localeCompare(b.employee_name, "pt-BR"),
      );
      return { rows, byEmployee };
    },
  });
};

export const useEmployeeDocuments = (employeeId?: string) => {
  return useQuery({
    queryKey: ["hr-employee-documents", employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("hr_employee_documents")
        .select("*")
        .eq("employee_id", employeeId)
        .order("uploaded_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useUploadEmployeeDocument = () => {
  const { user, profile } = useAuth();
  const qc = useQueryClient();

  return useMutation({
    mutationFn: async (input: {
      employee_id: string;
      catalog_id: string;
      catalog_code?: string | null;
      file: File;
      issue_date?: string | null;
      notes?: string | null;
    }) => {
      if (!user || !profile?.company_id) throw new Error("Sessão inválida");
      const safe = sanitizeFileName(input.file.name);
      const code = (input.catalog_code ?? input.catalog_id).toString().replace(/[^a-zA-Z0-9_-]/g, "_");
      // A primeira pasta precisa ser o id do colaborador (regras do armazenamento).
      const path = `${input.employee_id}/hr/${code}/${Date.now()}_${safe}`;
      const { error: upErr } = await supabase.storage
        .from(DEFAULT_HR_DOC_BUCKET)
        .upload(path, input.file);
      if (upErr) throw new Error(hrDocUploadErrorMessage(upErr));


      const { error: insErr } = await (supabase as any).from("hr_employee_documents").insert({
        company_id: profile.company_id,
        employee_id: input.employee_id,
        catalog_id: input.catalog_id,
        file_name: input.file.name,
        file_path: path,
        storage_bucket: DEFAULT_HR_DOC_BUCKET,
        uploaded_by: user.id,
        issue_date: input.issue_date ?? null,
        notes: input.notes ?? null,
        is_current: true,
      });

      if (insErr) throw insErr;
    },
    onSuccess: () => {
      toast.success("Documento enviado");
      qc.invalidateQueries({ queryKey: ["hr-compliance-overview"] });
      qc.invalidateQueries({ queryKey: ["hr-employee-documents"] });
    },
    onError: (err: any) => toast.error("Erro no envio", { description: err.message }),
  });
};

export const statusLabel = (s: ComplianceStatus) => {
  switch (s) {
    case "missing":
      return "Faltando";
    case "pending_review":
      return "Aguardando revisão";
    case "expiring_soon":
      return "A vencer";
    case "expired":
      return "Vencido";
    case "valid":
      return "Válido";
  }
};

export const statusVariant = (s: ComplianceStatus): "default" | "secondary" | "destructive" | "outline" => {
  switch (s) {
    case "valid":
      return "default";
    case "pending_review":
      return "secondary";
    case "expiring_soon":
      return "outline";
    case "missing":
    case "expired":
      return "destructive";
  }
};

// ===== Onda 2: revisão (aprovar/rejeitar) =====

export interface PendingReviewRow {
  document_id: string;
  employee_id: string;
  employee_name: string;
  employee_position: string | null;
  catalog_id: string;
  catalog_name: string;
  catalog_category: string;
  file_name: string;
  file_path: string;
  uploaded_at: string;
  uploaded_by: string | null;
  uploader_name: string | null;
  issue_date: string | null;
  notes: string | null;
}

export const usePendingReviews = () => {
  const { profile } = useAuth();
  const companyId = profile?.company_id;
  return useQuery({
    queryKey: ["hr-pending-reviews", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<PendingReviewRow[]> => {
      const { data, error } = await (supabase as any).rpc("hr_pending_reviews", {
        _company_id: companyId,
      });
      if (error) throw error;
      return (data ?? []) as PendingReviewRow[];
    },
  });
};

export const useReviewDocument = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (input: {
      document_id: string;
      decision: "approve" | "reject";
      rejection_reason?: string | null;
    }) => {
      const payload: any =
        input.decision === "approve"
          ? { review_status: "approved", rejection_reason: null }
          : { review_status: "rejected", rejection_reason: input.rejection_reason ?? null };
      const { error } = await (supabase as any)
        .from("hr_employee_documents")
        .update(payload)
        .eq("id", input.document_id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.decision === "approve" ? "Documento aprovado" : "Documento rejeitado");
      qc.invalidateQueries({ queryKey: ["hr-pending-reviews"] });
      qc.invalidateQueries({ queryKey: ["hr-compliance-overview"] });
      qc.invalidateQueries({ queryKey: ["hr-employee-documents"] });
      qc.invalidateQueries({ queryKey: ["hr-my-documents"] });
    },
    onError: (err: any) =>
      toast.error("Erro ao registrar revisão", { description: err.message }),
  });
};

export const useDocumentFileUrl = (filePath?: string | null, storageBucket?: string | null) => {
  return useQuery({
    queryKey: ["hr-doc-signed-url", filePath, storageBucket],
    enabled: !!filePath,
    staleTime: 60 * 1000 * 4,
    queryFn: async (): Promise<string | null> => {
      if (!filePath) return null;
      return await createHrDocSignedUrl({ file_path: filePath, storage_bucket: storageBucket });
    },
  });
};


export const useMyDocuments = () => {
  const { user, profile } = useAuth();
  const companyId = profile?.company_id;
  const userId = user?.id;
  return useQuery({
    queryKey: ["hr-my-documents", userId, companyId],
    enabled: !!userId && !!companyId,
    queryFn: async (): Promise<{ rows: ComplianceRow[]; history: any[] }> => {
      const { data: status, error: e1 } = await (supabase as any).rpc(
        "hr_employee_document_status",
        { _company_id: companyId },
      );
      if (e1) throw e1;
      const rows = ((status ?? []) as ComplianceRow[]).filter((r) => r.employee_id === userId);

      const { data: history, error: e2 } = await (supabase as any)
        .from("hr_employee_documents")
        .select("*")
        .eq("employee_id", userId)
        .order("uploaded_at", { ascending: false });
      if (e2) throw e2;

      return { rows, history: history ?? [] };
    },
  });
};

