import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

/**
 * CRUD das entidades do cadastro de colaborador (contatos, emergência,
 * endereços, dependentes, documentos de identificação, histórico e auditoria).
 */

export interface EmployeeContact {
  id: string;
  company_id: string;
  employee_id: string;
  kind: string;
  category: string;
  value: string;
  is_primary: boolean;
  verified: boolean;
  verified_at: string | null;
  notes: string | null;
}

export interface EmergencyContact {
  id: string;
  company_id: string;
  employee_id: string;
  name: string;
  relationship: string | null;
  phone: string;
  alt_phone: string | null;
  email: string | null;
  is_primary: boolean;
  notes: string | null;
}

export interface EmployeeAddress {
  id: string;
  company_id: string;
  employee_id: string;
  kind: string;
  street: string | null;
  number: string | null;
  complement: string | null;
  district: string | null;
  city: string | null;
  state: string | null;
  zip_code: string | null;
  country: string;
  raw_address: string | null;
  is_primary: boolean;
}

export interface EmployeeDependent {
  id: string;
  company_id: string;
  employee_id: string;
  name: string;
  relationship: string;
  birth_date: string | null;
  cpf: string | null;
  has_disability: boolean;
  for_benefit: boolean;
  for_income_tax: boolean;
  for_health_plan: boolean;
  included_at: string | null;
  ended_at: string | null;
  notes: string | null;
}

export interface EmployeeIdentityDocument {
  id: string;
  company_id: string;
  employee_id: string;
  doc_type: string;
  number: string | null;
  issuer: string | null;
  issuer_state: string | null;
  issue_date: string | null;
  expiry_date: string | null;
  category: string | null;
  status: string;
  verified: boolean;
  verified_by: string | null;
  verified_at: string | null;
  notes: string | null;
}

export interface EmployeeAssignment {
  id: string;
  employee_id: string;
  previous_department_id: string | null;
  new_department_id: string | null;
  previous_position_id: string | null;
  new_position_id: string | null;
  previous_position_text: string | null;
  new_position_text: string | null;
  previous_manager_id: string | null;
  new_manager_id: string | null;
  valid_from: string;
  valid_to: string | null;
  change_reason: string | null;
  changed_by: string | null;
  created_at: string;
}

export interface SensitiveAuditEntry {
  id: string;
  employee_id: string;
  entity: string;
  field_name: string;
  old_value: string | null;
  new_value: string | null;
  changed_by: string | null;
  change_reason: string | null;
  origin: string;
  created_at: string;
}

type Table =
  | "hr_employee_contacts"
  | "hr_emergency_contacts"
  | "hr_employee_addresses"
  | "hr_employee_dependents"
  | "hr_employee_identity_documents";

const useList = <T,>(table: Table, employeeId: string | undefined, order = "created_at") =>
  useQuery({
    queryKey: [table, employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("employee_id", employeeId!)
        .order(order, { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as T[];
    },
  });

export const useEmployeeContacts = (employeeId?: string) =>
  useList<EmployeeContact>("hr_employee_contacts", employeeId);
export const useEmergencyContacts = (employeeId?: string) =>
  useList<EmergencyContact>("hr_emergency_contacts", employeeId);
export const useEmployeeAddresses = (employeeId?: string) =>
  useList<EmployeeAddress>("hr_employee_addresses", employeeId);
export const useEmployeeDependents = (employeeId?: string) =>
  useList<EmployeeDependent>("hr_employee_dependents", employeeId);
export const useEmployeeIdentityDocuments = (employeeId?: string) =>
  useList<EmployeeIdentityDocument>("hr_employee_identity_documents", employeeId);

export function useSaveRegistryRow(table: Table) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: Record<string, unknown> & { id?: string }) => {
      if (payload.id) {
        const { id, ...rest } = payload;
        const { error } = await supabase.from(table).update(rest as any).eq("id", id as string);
        if (error) throw error;
        return id as string;
      }
      const { data, error } = await supabase.from(table).insert(payload as any).select("id").single();
      if (error) throw error;
      return (data as any).id as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [table] });
      qc.invalidateQueries({ queryKey: ["hr_sensitive_data_audit"] });
      toast({ title: "Registro salvo" });
    },
    onError: (e: Error) => toast({ title: "Erro ao salvar", description: e.message, variant: "destructive" }),
  });
}

export function useDeleteRegistryRow(table: Table) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(table).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: [table] });
      toast({ title: "Registro removido" });
    },
    onError: (e: Error) => toast({ title: "Erro ao remover", description: e.message, variant: "destructive" }),
  });
}

export function useEmployeeAssignments(employeeId?: string) {
  return useQuery({
    queryKey: ["hr_employee_assignments", employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_employee_assignments")
        .select("*")
        .eq("employee_id", employeeId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as EmployeeAssignment[];
    },
  });
}

export function useSensitiveAudit(employeeId?: string) {
  return useQuery({
    queryKey: ["hr_sensitive_data_audit", employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("hr_sensitive_data_audit")
        .select("*")
        .eq("employee_id", employeeId!)
        .order("created_at", { ascending: false })
        .limit(200);
      if (error) throw error;
      return (data ?? []) as unknown as SensitiveAuditEntry[];
    },
  });
}

/** Dados cadastrais completos do colaborador (profiles estendido). */
export function useEmployeeProfile(employeeId?: string) {
  return useQuery({
    queryKey: ["hr-employee-profile", employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select(
          "id, company_id, full_name, social_name, email, phone, cpf, rg, rg_issuer, rg_issuer_state, birth_date, birth_place, gender, nationality, marital_status, education_level, hire_date, position, position_id, position_level, position_start_date, department_id, employment_type, registration_number, source_code, termination_date, termination_reason, employee_status, has_dependents, dependents_count, hr_notes, direct_manager_id, status",
        )
        .eq("id", employeeId!)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });
}

export function useUpdateEmployeeProfile() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ employeeId, patch }: { employeeId: string; patch: Record<string, unknown> }) => {
      const { error } = await supabase.from("profiles").update(patch as any).eq("id", employeeId);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["hr-employee-profile", vars.employeeId] });
      qc.invalidateQueries({ queryKey: ["hr-employees"] });
      qc.invalidateQueries({ queryKey: ["hr_employee_assignments", vars.employeeId] });
      qc.invalidateQueries({ queryKey: ["hr_sensitive_data_audit", vars.employeeId] });
      toast({ title: "Cadastro atualizado" });
    },
    onError: (e: Error) => toast({ title: "Erro ao atualizar", description: e.message, variant: "destructive" }),
  });
}
