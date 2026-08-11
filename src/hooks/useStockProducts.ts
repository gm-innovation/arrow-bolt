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
  ncm: string | null;
  stock_position: string | null;
  currency: string | null;
  margin_percentage: number | null;
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

  // Sync the LOGVI commercial stock catalog into stock_products
  const syncFromLogvi = useMutation({
    mutationFn: async (
      items: Array<{
        produto_id: number;
        codigo: string | null;
        ncm: string | null;
        nome: string;
        classificacao: string | null;
        posicao: string | null;
        vendavel: boolean;
        quantidade_atual: number;
        custo_unitario_atual: number;
        moeda: string | null;
        margem_percentual: number;
        preco_venda: number;
      }>
    ) => {
      if (!profile?.company_id) throw new Error("Empresa não identificada");
      if (items.length === 0) return { created: 0, updated: 0 };

      const existingIds = new Set(
        products.filter(p => p.external_product_id != null).map(p => Number(p.external_product_id))
      );

      const rows = items.map(i => ({
        company_id: profile.company_id,
        external_product_id: i.produto_id,
        external_product_code: i.codigo,
        name: i.nome,
        category: i.classificacao,
        ncm: i.ncm,
        stock_position: i.posicao,
        currency: i.moeda,
        margin_percentage: i.margem_percentual,
        current_quantity: i.quantidade_atual,
        unit_cost: i.custo_unitario_atual,
        sell_price: i.preco_venda,
        is_active: i.vendavel,
        last_synced_at: new Date().toISOString(),
      }));

      // Chunked upsert to stay within request limits
      for (let i = 0; i < rows.length; i += 200) {
        const { error } = await supabase
          .from("stock_products")
          .upsert(rows.slice(i, i + 200) as any, { onConflict: "company_id,external_product_id" });
        if (error) throw error;
      }

      const created = items.filter(i => !existingIds.has(i.produto_id)).length;
      return { created, updated: items.length - created };
    },
    onSuccess: ({ created, updated }) => {
      queryClient.invalidateQueries({ queryKey: ["stock-products"] });
      toast.success(`Estoque sincronizado: ${created} novos, ${updated} atualizados`);
    },
    onError: (err: any) => toast.error(err.message || "Erro ao sincronizar estoque"),
  });

  return { products, isLoading, createProduct, updateProduct, deleteProduct, upsertFromEva, syncFromLogvi };
};
