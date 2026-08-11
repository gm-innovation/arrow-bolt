import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface OpportunityProduct {
  id: string;
  opportunity_id: string;
  product_id: string | null;
  stock_product_id: string | null;
  item_name: string | null;
  item_code: string | null;
  list_unit_value: number | null;
  quantity: number;
  unit_value: number | null;
  total_value: number | null;
  product_name?: string;
  product_code?: string | null;
}

export const useOpportunityProducts = (opportunityId: string | null) => {
  const qc = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["crm-opportunity-products", opportunityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_opportunity_products")
        .select("*, crm_products:product_id (name), stock_products:stock_product_id (name, external_product_code)")
        .eq("opportunity_id", opportunityId!)
        .order("created_at");
      if (error) throw error;
      return (data || []).map((r: any) => ({
        ...r,
        product_name: r.stock_products?.name || r.item_name || r.crm_products?.name || "—",
        product_code: r.stock_products?.external_product_code || r.item_code || null,
      })) as OpportunityProduct[];
    },
    enabled: !!opportunityId,
  });

  const addItem = useMutation({
    mutationFn: async (input: {
      stock_product_id?: string | null;
      item_name: string;
      item_code?: string | null;
      list_unit_value?: number | null;
      quantity: number;
      unit_value: number | null;
    }) => {
      const total_value = input.unit_value != null ? input.unit_value * input.quantity : null;
      const { error } = await supabase.from("crm_opportunity_products").insert({
        opportunity_id: opportunityId!,
        stock_product_id: input.stock_product_id ?? null,
        item_name: input.item_name,
        item_code: input.item_code ?? null,
        list_unit_value: input.list_unit_value ?? null,
        quantity: input.quantity,
        unit_value: input.unit_value,
        total_value,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-opportunity-products", opportunityId] });
      toast.success("Item adicionado");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...patch }: { id: string; quantity?: number; unit_value?: number | null }) => {
      const updates: any = { ...patch };
      const current = items.find((i) => i.id === id);
      const qty = patch.quantity ?? current?.quantity ?? 1;
      const uv = patch.unit_value !== undefined ? patch.unit_value : current?.unit_value ?? null;
      updates.total_value = uv != null ? uv * qty : null;
      const { error } = await supabase.from("crm_opportunity_products").update(updates).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["crm-opportunity-products", opportunityId] }),
    onError: (e: any) => toast.error(e.message),
  });

  const removeItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_opportunity_products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["crm-opportunity-products", opportunityId] });
      toast.success("Item removido");
    },
    onError: (e: any) => toast.error(e.message),
  });

  const total = items.reduce((s, i) => s + (Number(i.total_value) || 0), 0);
  const pendingCount = items.filter((i) => !i.stock_product_id && !i.product_id).length;

  return { items, isLoading, addItem, updateItem, removeItem, total, pendingCount };
};

/**
 * Matches free-text lead items against the EVA stock catalog and creates the
 * opportunity items. Unmatched entries are stored as free items for the sales rep.
 */
export const linkLeadItemsToOpportunity = async (
  opportunityId: string,
  companyId: string,
  leadItems: Array<{ name: string; qty?: number; notes?: string }>
): Promise<{ linked: number; pending: number }> => {
  const entries = (leadItems || []).filter((i) => i?.name?.trim());
  if (entries.length === 0) return { linked: 0, pending: 0 };

  const { data: stock } = await supabase
    .from("stock_products")
    .select("id, name, external_product_code, sell_price")
    .eq("company_id", companyId)
    .eq("is_active", true);

  const norm = (s: string) =>
    s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

  const byCode = new Map<string, any>();
  const byName = new Map<string, any>();
  for (const p of stock || []) {
    if (p.external_product_code) byCode.set(norm(p.external_product_code), p);
    byName.set(norm(p.name), p);
  }

  let linked = 0;
  let pending = 0;
  const rows = entries.map((entry) => {
    const key = norm(entry.name);
    const match =
      byCode.get(key) ||
      byName.get(key) ||
      (stock || []).find((p) => norm(p.name).includes(key) || key.includes(norm(p.name)));
    const quantity = Number(entry.qty) > 0 ? Math.round(Number(entry.qty)) : 1;
    if (match) {
      linked += 1;
      const unit = Number(match.sell_price) || null;
      return {
        opportunity_id: opportunityId,
        stock_product_id: match.id,
        item_name: match.name,
        item_code: match.external_product_code,
        list_unit_value: unit,
        quantity,
        unit_value: unit,
        total_value: unit != null ? unit * quantity : null,
      };
    }
    pending += 1;
    return {
      opportunity_id: opportunityId,
      stock_product_id: null,
      item_name: entry.name.trim(),
      item_code: null,
      list_unit_value: null,
      quantity,
      unit_value: null,
      total_value: null,
    };
  });

  const { error } = await supabase.from("crm_opportunity_products").insert(rows as any);
  if (error) throw error;
  return { linked, pending };
};
