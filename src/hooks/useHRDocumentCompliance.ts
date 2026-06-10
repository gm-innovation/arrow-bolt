import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

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
      const path = `${profile.company_id}/employees/${input.employee_id}/${code}/${Date.now()}_${safe}`;
      const { error: upErr } = await supabase.storage
        .from("corp-documents")
        .upload(path, input.file);
      if (upErr) throw upErr;

      const { error: insErr } = await (supabase as any).from("hr_employee_documents").insert({
        company_id: profile.company_id,
        employee_id: input.employee_id,
        catalog_id: input.catalog_id,
        file_name: input.file.name,
        file_path: path,
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
