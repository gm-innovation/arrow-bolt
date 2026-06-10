import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface HRDocumentCatalogItem {
  id: string;
  company_id: string;
  name: string;
  code: string | null;
  description: string | null;
  category: string;
  is_required: boolean;
  has_expiry: boolean;
  default_validity_months: number | null;
  renewal_warning_days: number;
  responsible_role: string;
  applies_to_all: boolean;
  is_active: boolean;
  positions: string[];
}

export interface CatalogInput {
  name: string;
  code?: string | null;
  description?: string | null;
  category: string;
  is_required: boolean;
  has_expiry: boolean;
  default_validity_months: number | null;
  renewal_warning_days: number;
  responsible_role: string;
  applies_to_all: boolean;
  is_active: boolean;
  positions: string[];
}

export const useHRDocumentCatalog = () => {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const companyId = profile?.company_id;

  const list = useQuery({
    queryKey: ["hr-document-catalog", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<HRDocumentCatalogItem[]> => {
      const { data: rows, error } = await (supabase as any)
        .from("hr_document_catalog")
        .select("*")
        .eq("company_id", companyId)
        .order("name");
      if (error) throw error;
      const ids = (rows ?? []).map((r: any) => r.id);
      let posMap = new Map<string, string[]>();
      if (ids.length) {
        const { data: pos } = await (supabase as any)
          .from("hr_document_catalog_positions")
          .select("catalog_id, position")
          .in("catalog_id", ids);
        (pos ?? []).forEach((p: any) => {
          const arr = posMap.get(p.catalog_id) ?? [];
          arr.push(p.position);
          posMap.set(p.catalog_id, arr);
        });
      }
      return (rows ?? []).map((r: any) => ({
        ...r,
        positions: (posMap.get(r.id) ?? []).sort(),
      }));
    },
  });

  const invalidate = () => qc.invalidateQueries({ queryKey: ["hr-document-catalog"] });

  const create = useMutation({
    mutationFn: async (input: CatalogInput) => {
      if (!companyId) throw new Error("Empresa não encontrada");
      const { positions, ...rest } = input;
      const { data, error } = await (supabase as any)
        .from("hr_document_catalog")
        .insert({ ...rest, company_id: companyId })
        .select()
        .single();
      if (error) throw error;
      if (!input.applies_to_all && positions.length) {
        const { error: pErr } = await (supabase as any)
          .from("hr_document_catalog_positions")
          .insert(positions.map((p) => ({ catalog_id: data.id, position: p })));
        if (pErr) throw pErr;
      }
      return data;
    },
    onSuccess: () => {
      toast.success("Documento adicionado ao catálogo");
      invalidate();
    },
    onError: (e: any) => toast.error("Erro ao criar", { description: e.message }),
  });

  const update = useMutation({
    mutationFn: async ({ id, input }: { id: string; input: CatalogInput }) => {
      const { positions, ...rest } = input;
      const { error } = await (supabase as any)
        .from("hr_document_catalog")
        .update(rest)
        .eq("id", id);
      if (error) throw error;
      // sync positions
      const { data: existing } = await (supabase as any)
        .from("hr_document_catalog_positions")
        .select("id, position")
        .eq("catalog_id", id);
      const current = new Set((existing ?? []).map((r: any) => r.position));
      const wanted = new Set(input.applies_to_all ? [] : positions);
      const toAdd = [...wanted].filter((p) => !current.has(p));
      const toRemove = (existing ?? []).filter((r: any) => !wanted.has(r.position));
      if (toRemove.length) {
        await (supabase as any)
          .from("hr_document_catalog_positions")
          .delete()
          .in(
            "id",
            toRemove.map((r: any) => r.id),
          );
      }
      if (toAdd.length) {
        await (supabase as any)
          .from("hr_document_catalog_positions")
          .insert(toAdd.map((p) => ({ catalog_id: id, position: p })));
      }
    },
    onSuccess: () => {
      toast.success("Documento atualizado");
      invalidate();
    },
    onError: (e: any) => toast.error("Erro ao atualizar", { description: e.message }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from("hr_document_catalog")
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Documento removido");
      invalidate();
    },
    onError: (e: any) => toast.error("Erro ao remover", { description: e.message }),
  });

  return { ...list, create, update, remove };
};

export const useHRPositions = () => {
  const { profile } = useAuth();
  const companyId = profile?.company_id;
  return useQuery({
    queryKey: ["hr-positions", companyId],
    enabled: !!companyId,
    queryFn: async (): Promise<string[]> => {
      const { data, error } = await (supabase as any)
        .from("profiles")
        .select("position")
        .eq("company_id", companyId)
        .not("position", "is", null);
      if (error) throw error;
      const set = new Set<string>();
      (data ?? []).forEach((r: any) => {
        const v = (r.position ?? "").trim();
        if (v) set.add(v);
      });
      return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
    },
  });
};
