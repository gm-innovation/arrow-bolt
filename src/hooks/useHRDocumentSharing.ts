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

// Retorna BLOQUEIOS ativos (exceções) para o funcionário.
export const useEmployeeBlocks = (employeeId?: string) => {
  return useQuery({
    queryKey: ["hr-blocks", employeeId],
    enabled: !!employeeId,
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("hr_coordinator_document_grants")
        .select("*")
        .eq("employee_id", employeeId)
        .eq("is_block", true)
        .is("revoked_at", null);
      if (error) throw error;
      return (data ?? []) as Grant[];
    },
  });
};

// Retrocompat: alias antigo continua exportado
export const useEmployeeGrants = useEmployeeBlocks;

export const useAllActiveGrants = () => {
  return useQuery({
    queryKey: ["hr-grants-all"],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from("hr_coordinator_document_grants")
        .select("id, employee_id, catalog_id, granted_at, granted_by, note, is_block")
        .is("revoked_at", null);
      if (error) throw error;
      return (data ?? []) as Grant[];
    },
  });
};

// Bloquear (true) ou liberar (false) um tipo específico para um funcionário.
// Semântica nova: liberação é o PADRÃO; a tabela guarda apenas exceções (bloqueios).
export const useSetBlock = () => {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { employee_id: string; catalog_id: string; block: boolean; note?: string }) => {
      if (!user || !profile?.company_id) throw new Error("Sessão inválida");
      if (p.block) {
        const { data: existing } = await (supabase as any)
          .from("hr_coordinator_document_grants")
          .select("id")
          .eq("employee_id", p.employee_id)
          .eq("catalog_id", p.catalog_id)
          .maybeSingle();
        if (existing?.id) {
          const { error } = await (supabase as any)
            .from("hr_coordinator_document_grants")
            .update({ is_block: true, revoked_at: null, revoked_by: null, granted_by: user.id, granted_at: new Date().toISOString(), note: p.note ?? null })
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
              is_block: true,
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
      qc.invalidateQueries({ queryKey: ["hr-blocks"] });
      qc.invalidateQueries({ queryKey: ["hr-grants"] });
      qc.invalidateQueries({ queryKey: ["hr-grants-all"] });
      qc.invalidateQueries({ queryKey: ["coord-employee-docs"] });
    },
    onError: (e: any) => toast.error("Erro", { description: e.message }),
  });
};

// Retrocompat: adapta a chamada antiga { grant: boolean } -> { block: !grant }
export const useSetGrant = () => {
  const setBlock = useSetBlock();
  return {
    ...setBlock,
    mutate: (p: { employee_id: string; catalog_id: string; grant: boolean; note?: string }, opts?: any) =>
      setBlock.mutate({ employee_id: p.employee_id, catalog_id: p.catalog_id, block: !p.grant, note: p.note }, opts),
    mutateAsync: (p: { employee_id: string; catalog_id: string; grant: boolean; note?: string }) =>
      setBlock.mutateAsync({ employee_id: p.employee_id, catalog_id: p.catalog_id, block: !p.grant, note: p.note }),
  } as any;
};

// Libera/bloqueia em massa TODOS os tipos compartilháveis de UM funcionário.
export const useBulkSetEmployee = () => {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (p: { employee_id: string; action: "release_all" | "block_all" }) => {
      if (!user || !profile?.company_id) throw new Error("Sessão inválida");
      if (p.action === "release_all") {
        const { error } = await (supabase as any)
          .from("hr_coordinator_document_grants")
          .update({ revoked_at: new Date().toISOString(), revoked_by: user.id })
          .eq("employee_id", p.employee_id)
          .eq("is_block", true)
          .is("revoked_at", null);
        if (error) throw error;
        return { released: true };
      } else {
        const { data: cats } = await (supabase as any)
          .from("hr_document_catalog")
          .select("id")
          .eq("company_id", profile.company_id)
          .eq("coordinator_shareable", true)
          .eq("is_active", true);
        const rows = ((cats ?? []) as any[]).map((c) => ({
          company_id: profile.company_id,
          employee_id: p.employee_id,
          catalog_id: c.id,
          granted_by: user.id,
          is_block: true,
        }));
        // Reative bloqueios existentes primeiro
        await (supabase as any)
          .from("hr_coordinator_document_grants")
          .update({ is_block: true, revoked_at: null, revoked_by: null, granted_by: user.id, granted_at: new Date().toISOString() })
          .eq("employee_id", p.employee_id);
        // Insere os que faltam
        for (const r of rows) {
          const { data: exists } = await (supabase as any)
            .from("hr_coordinator_document_grants")
            .select("id").eq("employee_id", r.employee_id).eq("catalog_id", r.catalog_id).maybeSingle();
          if (!exists) await (supabase as any).from("hr_coordinator_document_grants").insert(r);
        }
        return { blocked: rows.length };
      }
    },
    onSuccess: (_res, vars) => {
      toast.success(vars.action === "release_all" ? "Todos os documentos foram liberados" : "Todos os documentos foram bloqueados");
      qc.invalidateQueries({ queryKey: ["hr-blocks"] });
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

// ============ Coordinator view: uses RPC hr_coordinator_visible_docs ============
export const useCoordinatorEmployeeDocs = () => {
  const { profile } = useAuth();
  const companyId = profile?.company_id;
  return useQuery({
    queryKey: ["coord-employee-docs", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await (supabase as any).rpc("hr_coordinator_visible_docs", { _company_id: companyId });
      if (error) throw error;
      const rows = (data ?? []) as any[];

      const byEmp = new Map<string, any>();
      for (const r of rows) {
        if (!byEmp.has(r.employee_id)) {
          byEmp.set(r.employee_id, {
            id: r.employee_id,
            full_name: r.employee_name,
            position: r.employee_position,
            avatar_url: r.employee_avatar,
            items: [] as any[],
          });
        }
        byEmp.get(r.employee_id).items.push({
          catalog: {
            id: r.catalog_id,
            name: r.catalog_name,
            category: r.catalog_category,
            code: null,
            has_expiry: !!r.expiry_date,
          },
          document: r.document_id
            ? {
                id: r.document_id,
                file_name: r.file_name,
                file_path: r.file_path,
                issue_date: r.issue_date,
                expiry_date: r.expiry_date,
                review_status: r.review_status,
                uploaded_at: r.uploaded_at,
              }
            : null,
        });
      }
      // Retorna só funcionários com pelo menos um documento realmente disponível
      return Array.from(byEmp.values()).filter((e) => e.items.some((i: any) => i.document));
    },
  });
};

// ============ Signed URL + log ============
export const getSignedDocUrl = async (opts: {
  document_id: string; file_path: string; storage_bucket?: string | null;
  action?: "view" | "download"; package_id?: string; employee_id?: string;
}) => {
  const signedUrl = await createHrDocSignedUrl({
    file_path: opts.file_path,
    storage_bucket: opts.storage_bucket,
  });

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
