import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

// ============ Catalog: shareable flag ============
export const useShareableCatalog = () => {
  return useQuery({
    queryKey: ["hr-catalog-shareable"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("hr_document_catalog")
        .select("id, name, code, category, coordinator_shareable, is_active")
        .eq("is_active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string; name: string; code: string | null; category: string;
        coordinator_shareable: boolean; is_active: boolean;
      }>;
    },
  });
};

export const useToggleCatalogShareable = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { id: string; value: boolean }) => {
      const { error } = await (supabase as any)
        .from("hr_document_catalog")
        .update({ coordinator_shareable: p.value })
        .eq("id", p.id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Atualizado");
      qc.invalidateQueries({ queryKey: ["hr-catalog-shareable"] });
    },
    onError: (e: any) => toast.error("Falha ao atualizar", { description: e.message }),
  });
};

// ============ Grants ============
export type Grant = {
  id: string;
  company_id: string;
  employee_id: string;
  catalog_id: string;
  granted_by: string | null;
  granted_at: string;
  revoked_at: string | null;
  note: string | null;
};

export const useEmployeeGrants = (employeeId?: string) => {
  return useQuery({
    queryKey: ["hr-grants", employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("hr_coordinator_document_grants")
        .select("*")
        .eq("employee_id", employeeId)
        .is("revoked_at", null);
      if (error) throw error;
      return (data ?? []) as Grant[];
    },
  });
};

export const useAllActiveGrants = () => {
  return useQuery({
    queryKey: ["hr-grants-all"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("hr_coordinator_document_grants")
        .select("id, employee_id, catalog_id, granted_at, granted_by, note")
        .is("revoked_at", null);
      if (error) throw error;
      return (data ?? []) as Grant[];
    },
  });
};

export const useSetGrant = () => {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { employee_id: string; catalog_id: string; grant: boolean; note?: string }) => {
      if (!user || !profile?.company_id) throw new Error("Sessão inválida");
      if (p.grant) {
        // Reactivate any revoked row, else insert new
        const { data: existing } = await (supabase as any)
          .from("hr_coordinator_document_grants")
          .select("id, revoked_at")
          .eq("employee_id", p.employee_id)
          .eq("catalog_id", p.catalog_id)
          .maybeSingle();
        if (existing?.id) {
          const { error } = await (supabase as any)
            .from("hr_coordinator_document_grants")
            .update({ revoked_at: null, revoked_by: null, granted_by: user.id, granted_at: new Date().toISOString(), note: p.note ?? null })
            .eq("id", existing.id);
          if (error) throw error;
        } else {
          const { error } = await (supabase as any)
            .from("hr_coordinator_document_grants")
            .insert({
              company_id: profile.company_id,
              employee_id: p.employee_id,
              catalog_id: p.catalog_id,
              granted_by: user.id,
              note: p.note ?? null,
            });
          if (error) throw error;
        }
      } else {
        const { error } = await (supabase as any)
          .from("hr_coordinator_document_grants")
          .update({ revoked_at: new Date().toISOString(), revoked_by: user.id })
          .eq("employee_id", p.employee_id)
          .eq("catalog_id", p.catalog_id)
          .is("revoked_at", null);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["hr-grants"] });
      qc.invalidateQueries({ queryKey: ["hr-grants-all"] });
      qc.invalidateQueries({ queryKey: ["coord-employee-docs"] });
    },
    onError: (e: any) => toast.error("Erro", { description: e.message }),
  });
};

// ============ Company employees (for HR panel) ============
export const useCompanyEmployees = () => {
  return useQuery({
    queryKey: ["hr-sharing-employees"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("id, full_name, email, position, department_id, avatar_url")
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string; full_name: string | null; email: string | null;
        position: string | null; department_id: string | null; avatar_url: string | null;
      }>;
    },
  });
};

// ============ Coordinator view: shareable employees + their authorized docs ============
export const useCoordinatorEmployeeDocs = () => {
  return useQuery({
    queryKey: ["coord-employee-docs"],
    queryFn: async () => {
      const [{ data: grants, error: gErr }, { data: catalog, error: cErr }] = await Promise.all([
        (supabase as any)
          .from("hr_coordinator_document_grants")
          .select("employee_id, catalog_id")
          .is("revoked_at", null),
        (supabase as any)
          .from("hr_document_catalog")
          .select("id, name, code, category, has_expiry"),
      ]);
      if (gErr) throw gErr;
      if (cErr) throw cErr;

      const empIds = Array.from(new Set(((grants ?? []) as any[]).map((g: any) => g.employee_id)));
      if (empIds.length === 0) return [];

      const [{ data: profiles, error: pErr }, { data: docs, error: dErr }] = await Promise.all([
        (supabase as any)
          .from("profiles")
          .select("id, full_name, email, position, avatar_url")
          .in("id", empIds),
        (supabase as any)
          .from("hr_employee_documents")
          .select("id, employee_id, catalog_id, file_name, file_path, issue_date, expiry_date, review_status, is_current, uploaded_at")
          .in("employee_id", empIds)
          .eq("is_current", true),
      ]);
      if (pErr) throw pErr;
      if (dErr) throw dErr;

      const catById = new Map((catalog ?? []).map((c: any) => [c.id, c]));
      const docsByEmpCat = new Map<string, any>();
      (docs ?? []).forEach((d: any) => docsByEmpCat.set(`${d.employee_id}:${d.catalog_id}`, d));

      const byEmp = new Map<string, any>();
      (profiles ?? []).forEach((p: any) => {
        byEmp.set(p.id, { ...p, items: [] as any[] });
      });
      (grants ?? []).forEach((g: any) => {
        const emp = byEmp.get(g.employee_id);
        const cat = catById.get(g.catalog_id);
        if (!emp || !cat) return;
        emp.items.push({
          catalog: cat,
          document: docsByEmpCat.get(`${g.employee_id}:${g.catalog_id}`) ?? null,
        });
      });
      return Array.from(byEmp.values());
    },
  });
};

// ============ Signed URL + log ============
export const getSignedDocUrl = async (opts: {
  document_id: string; file_path: string; action?: "view" | "download"; package_id?: string; employee_id?: string;
}) => {
  const { data, error } = await supabase.storage
    .from("corp-documents")
    .createSignedUrl(opts.file_path, 60 * 10);
  if (error) throw error;
  // best-effort audit log
  try {
    const { data: u } = await supabase.auth.getUser();
    const uid = u?.user?.id;
    const { data: prof } = await (supabase as any).from("profiles").select("company_id").eq("id", uid).maybeSingle();
    if (uid && prof?.company_id) {
      await (supabase as any).from("hr_document_share_access_log").insert({
        company_id: prof.company_id,
        document_id: opts.document_id,
        package_id: opts.package_id ?? null,
        employee_id: opts.employee_id ?? null,
        accessed_by: uid,
        action: opts.action ?? "view",
      });
    }
  } catch { /* non-blocking */ }
  return data.signedUrl;
};

// ============ Share packages ============
export type SharePackageStatus = "active" | "pending_review" | "rejected" | "revoked" | "expired";

export const useMyPackages = () => {
  return useQuery({
    queryKey: ["hr-share-my-packages"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("hr_document_share_packages")
        .select("*, items:hr_document_share_items(id, document_id, employee_id, catalog_id, requires_grant)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });
};

export const useCreatePackage = () => {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: {
      recipient_name: string;
      purpose: string;
      justification?: string;
      expires_at?: string | null;
      items: Array<{ employee_id: string; document_id: string; catalog_id: string; requires_grant: boolean }>;
    }) => {
      if (!user || !profile?.company_id) throw new Error("Sessão inválida");
      const anyPending = p.items.some((i) => i.requires_grant);
      const { data: pkg, error: pErr } = await (supabase as any)
        .from("hr_document_share_packages")
        .insert({
          company_id: profile.company_id,
          requested_by: user.id,
          purpose: p.purpose,
          recipient_name: p.recipient_name,
          justification: p.justification ?? null,
          expires_at: p.expires_at ?? null,
          status: anyPending ? "pending_review" : "active",
        })
        .select("id")
        .single();
      if (pErr) throw pErr;
      const { error: iErr } = await (supabase as any)
        .from("hr_document_share_items")
        .insert(p.items.map((i) => ({ ...i, package_id: pkg.id })));
      if (iErr) throw iErr;
      return pkg.id as string;
    },
    onSuccess: () => {
      toast.success("Pacote criado");
      qc.invalidateQueries({ queryKey: ["hr-share-my-packages"] });
    },
    onError: (e: any) => toast.error("Erro ao criar pacote", { description: e.message }),
  });
};

export const PURPOSE_LABELS: Record<string, string> = {
  shipyard_entry: "Entrada em estaleiro",
  port_authorization: "Autorização portuária",
  vessel_boarding: "Embarque em navio",
  travel_booking: "Reserva de passagem",
  lodging_booking: "Reserva de hospedagem",
  other: "Outro",
};
