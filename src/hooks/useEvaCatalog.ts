import { useCallback, useMemo } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useEvaStockProducts, EvaProduct } from "@/hooks/useEvaStockProducts";

const normalize = (s: string) =>
  s.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/\s+/g, " ").trim();

/**
 * Live EVA catalog for every commercial surface (opportunity items, sales, lead
 * matching). Products are read from the EVA API, not from the local mirror, and
 * only the item actually used is materialized into `stock_products` so foreign
 * keys (opportunity items, sale items, stock movements) keep working.
 */
export const useEvaCatalog = (options?: { onlySellable?: boolean; enabled?: boolean }) => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();
  const { products, stock, total, isLoading, isFetching, error, refetch } = useEvaStockProducts({
    onlySellable: options?.onlySellable ?? false,
    enabled: options?.enabled ?? true,
  });

  const search = useCallback(
    (term: string, limit = 50) => {
      const t = normalize(term);
      if (!t) return products.slice(0, limit);
      const terms = t.split(" ").filter(Boolean);
      return products
        .filter((p) => {
          const haystack = normalize(`${p.nome} ${p.codigo ?? ""} ${p.ncm ?? ""} ${p.classificacao ?? ""}`);
          return terms.every((x) => haystack.includes(x));
        })
        .slice(0, limit);
    },
    [products]
  );

  /** Upserts a single EVA product into stock_products and returns its local id. */
  const ensureLocalProduct = useCallback(
    async (product: EvaProduct): Promise<string> => {
      if (!profile?.company_id) throw new Error("Empresa não identificada");

      const { data, error: upsertError } = await supabase
        .from("stock_products")
        .upsert(
          {
            company_id: profile.company_id,
            external_product_id: product.produto_id,
            external_product_code: product.codigo,
            name: product.nome,
            category: product.classificacao,
            ncm: product.ncm,
            stock_position: product.posicao,
            currency: product.moeda,
            margin_percentage: product.margem_percentual,
            current_quantity: product.quantidade_atual,
            unit_cost: product.custo_unitario_atual,
            sell_price: product.preco_venda,
            is_active: product.vendavel,
            last_synced_at: new Date().toISOString(),
          } as any,
          { onConflict: "company_id,external_product_id" }
        )
        .select("id")
        .maybeSingle();

      if (upsertError) throw upsertError;
      if (!data?.id) throw new Error("Não foi possível registrar o produto do EVA");

      queryClient.invalidateQueries({ queryKey: ["stock-products"] });
      return data.id as string;
    },
    [profile?.company_id, queryClient]
  );

  const byCode = useMemo(() => {
    const map = new Map<string, EvaProduct>();
    for (const p of products) if (p.codigo) map.set(normalize(p.codigo), p);
    return map;
  }, [products]);

  const byName = useMemo(() => {
    const map = new Map<string, EvaProduct>();
    for (const p of products) map.set(normalize(p.nome), p);
    return map;
  }, [products]);

  const findBest = useCallback(
    (term: string): EvaProduct | null => {
      const key = normalize(term);
      if (!key) return null;
      return (
        byCode.get(key) ||
        byName.get(key) ||
        products.find((p) => normalize(p.nome).includes(key) || key.includes(normalize(p.nome))) ||
        null
      );
    },
    [byCode, byName, products]
  );

  return {
    products,
    stock,
    total,
    isLoading,
    isFetching,
    error,
    refetch,
    search,
    findBest,
    ensureLocalProduct,
  };
};

export type { EvaProduct };
export { normalize as normalizeProductTerm };
