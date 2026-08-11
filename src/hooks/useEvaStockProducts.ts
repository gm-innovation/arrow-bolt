import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { FunctionsHttpError } from "@supabase/supabase-js";

export interface EvaProduct {
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
  data_definicao: string | null;
}

interface EvaProductsResponse {
  success: boolean;
  stock: { id: string; codigo: string; nome: string } | null;
  total: number;
  count: number;
  products: EvaProduct[];
}

async function readError(error: unknown): Promise<string> {
  if (error instanceof FunctionsHttpError) {
    try {
      const body = await error.context.json();
      return body?.error || body?.erro || error.message;
    } catch {
      return error.message;
    }
  }
  return (error as Error)?.message ?? "Erro ao consultar produtos do EVA";
}

/** Reads the EVA commercial stock catalog through the backend (token never leaves the server). */
export const useEvaStockProducts = (options?: { enabled?: boolean; onlySellable?: boolean }) => {
  const query = useQuery({
    queryKey: ["eva-stock-products", options?.onlySellable ?? false],
    queryFn: async (): Promise<EvaProductsResponse> => {
      const { data, error } = await supabase.functions.invoke("logvi-products", {
        body: { only_sellable: options?.onlySellable ?? false },
      });
      if (error) throw new Error(await readError(error));
      if (data?.error) throw new Error(data.error);
      return data as EvaProductsResponse;
    },
    enabled: options?.enabled ?? true,
    staleTime: 5 * 60 * 1000,
    retry: false,
  });

  return {
    products: query.data?.products ?? [],
    stock: query.data?.stock ?? null,
    total: query.data?.total ?? 0,
    isLoading: query.isLoading,
    isFetching: query.isFetching,
    error: query.error as Error | null,
    refetch: query.refetch,
  };
};
