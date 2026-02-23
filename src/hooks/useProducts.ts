import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export const useProducts = () => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: products = [], isLoading } = useQuery({
    queryKey: ["crm-products", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      const { data, error } = await supabase
        .from("crm_products")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("name");
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id,
  });

  const createProduct = useMutation({
    mutationFn: async (product: Record<string, any>) => {
      const { error } = await supabase.from("crm_products").insert({
        ...product,
        company_id: profile?.company_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-products"] });
      toast.success("Produto criado com sucesso");
    },
    onError: () => toast.error("Erro ao criar produto"),
  });

  const updateProduct = useMutation({
    mutationFn: async ({ id, ...product }: Record<string, any>) => {
      const { error } = await supabase.from("crm_products").update(product).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-products"] });
      toast.success("Produto atualizado");
    },
    onError: () => toast.error("Erro ao atualizar produto"),
  });

  const deleteProduct = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("crm_products").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-products"] });
      toast.success("Produto removido");
    },
    onError: () => toast.error("Erro ao remover produto"),
  });

  return { products, isLoading, createProduct, updateProduct, deleteProduct };
};
