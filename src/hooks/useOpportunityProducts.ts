import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

export interface OpportunityProduct {
  id: string;
  opportunity_id: string;
  product_id: string;
  quantity: number;
  unit_value: number | null;
  total_value: number | null;
  product_name?: string;
}

export const useOpportunityProducts = (opportunityId: string | null) => {
  const qc = useQueryClient();

  const { data: items = [], isLoading } = useQuery({
    queryKey: ["crm-opportunity-products", opportunityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("crm_opportunity_products")
        .select("*, crm_products:product_id (name)")
        .eq("opportunity_id", opportunityId!);
      if (error) throw error;
      return (data || []).map((r: any) => ({ ...r, product_name: r.crm_products?.name || "—" })) as OpportunityProduct[];
    },
    enabled: !!opportunityId,
  });

  const addItem = useMutation({
    mutationFn: async (input: { product_id: string; quantity: number; unit_value: number | null }) => {
      const total_value = input.unit_value != null ? input.unit_value * input.quantity : null;
      const { error } = await supabase.from("crm_opportunity_products").insert({
        opportunity_id: opportunityId!,
        ...input,
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
      if ("quantity" in patch || "unit_value" in patch) {
        const current = items.find((i) => i.id === id);
        const qty = patch.quantity ?? current?.quantity ?? 1;
        const uv = patch.unit_value ?? current?.unit_value ?? null;
        updates.total_value = uv != null ? uv * qty : null;
      }
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

  return { items, isLoading, addItem, updateItem, removeItem, total };
};
