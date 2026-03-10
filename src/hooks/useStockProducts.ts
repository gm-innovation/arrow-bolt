import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface StockProduct {
  id: string;
  company_id: string;
  external_product_id: number | null;
  external_product_code: string | null;
  name: string;
  category: string | null;
  unit: string;
  current_quantity: number;
  min_quantity: number;
  unit_cost: number;
  sell_price: number;
  is_active: boolean;
  last_synced_at: string | null;
  created_at: string;
  updated_at: string;
}

export const useStockProducts = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["stock-products", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      const { data, error } = await supabase
        .from("stock_products")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("name");
      if (error) throw error;
      return data as StockProduct[];
    },
    enabled: !!profile?.company_id,
  });

  const createProduct = useMutation({
    mutationFn: async (product: Partial<StockProduct>) => {
      const { error } = await supabase.from("stock_products").insert({
        ...product,
        company_id: profile?.company_id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-products"] });
      toast.success("Produto adicionado ao estoque");
    },
    onError: () => toast.error("Erro ao adicionar produto"),
  });

  const updateProduct = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<StockProduct> & { id: string }) => {
      const { error } = await supabase
        .from("stock_products")
        .update(updates)
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-products"] });
      toast.success("Produto atualizado");
    },
    onError: () => toast.error("Erro ao atualizar produto"),
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("stock_products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stock-products"] });
      toast.success("Produto removido");
    },
    onError: () => toast.error("Erro ao remover produto"),
  });

  // Upsert products from Eva materials into the stock catalog
  const upsertFromEva = async (
    materials: Array<{
      external_product_id: number;
      external_product_code: string;
      name: string;
      unit_value: number;
      quantity: number;
    }>
  ) => {
    if (!profile?.company_id || materials.length === 0) return;

    for (const m of materials) {
      const { error } = await supabase
        .from("stock_products")
        .upsert(
          {
            company_id: profile.company_id,
            external_product_id: m.external_product_id,
            external_product_code: m.external_product_code,
            name: m.name,
            unit_cost: m.unit_value,
            last_synced_at: new Date().toISOString(),
          } as any,
          { onConflict: "company_id,external_product_id" }
        );
      if (error) console.error("Upsert stock error:", error);
    }

    queryClient.invalidateQueries({ queryKey: ["stock-products"] });
  };

  return { products, isLoading, createProduct, updateProduct, deleteProduct, upsertFromEva };
};
