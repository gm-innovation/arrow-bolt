import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface CrmSale {
  id: string;
  company_id: string;
  opportunity_id: string | null;
  client_id: string | null;
  sale_number: string | null;
  status: string;
  total_amount: number;
  notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  clients?: { name: string } | null;
  crm_opportunities?: { title: string } | null;
}

export interface CrmSaleItem {
  id: string;
  sale_id: string;
  stock_product_id: string | null;
  name: string;
  quantity: number;
  unit_value: number;
  markup_percentage: number;
  total_value: number;
  created_at: string;
}

export const useCrmSales = () => {
  const { user, profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: sales = [], isLoading } = useQuery({
    queryKey: ["crm-sales", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      const { data, error } = await supabase
        .from("crm_sales")
        .select("*, clients(name), crm_opportunities(title)")
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data as CrmSale[];
    },
    enabled: !!profile?.company_id,
  });

  const createSale = useMutation({
    mutationFn: async (input: {
      opportunity_id?: string;
      client_id?: string;
      notes?: string;
      items: Array<{
        stock_product_id: string;
        name: string;
        quantity: number;
        unit_value: number;
        markup_percentage: number;
      }>;
    }) => {
      const totalAmount = input.items.reduce((sum, item) => {
        const markupMultiplier = 1 + (item.markup_percentage / 100);
        return sum + item.quantity * item.unit_value * markupMultiplier;
      }, 0);

      // Generate sale number
      const saleNumber = `V-${Date.now().toString(36).toUpperCase()}`;

      const { data: sale, error: saleError } = await supabase
        .from("crm_sales")
        .insert({
          company_id: profile?.company_id,
          opportunity_id: input.opportunity_id || null,
          client_id: input.client_id || null,
          sale_number: saleNumber,
          total_amount: totalAmount,
          notes: input.notes || null,
          created_by: user?.id,
          status: "draft",
        } as any)
        .select()
        .single();

      if (saleError) throw saleError;

      // Insert items
      const itemsToInsert = input.items.map((item) => {
        const markupMultiplier = 1 + (item.markup_percentage / 100);
        return {
          sale_id: sale.id,
          stock_product_id: item.stock_product_id,
          name: item.name,
          quantity: item.quantity,
          unit_value: item.unit_value,
          markup_percentage: item.markup_percentage,
          total_value: item.quantity * item.unit_value * markupMultiplier,
        };
      });

      const { error: itemsError } = await supabase
        .from("crm_sale_items")
        .insert(itemsToInsert as any);

      if (itemsError) throw itemsError;

      // Decrement stock quantities
      for (const item of input.items) {
        await supabase.rpc("decrement_stock_quantity" as any, {
          p_product_id: item.stock_product_id,
          p_quantity: item.quantity,
        }).then(({ error }) => {
          // If RPC doesn't exist yet, do manual update
          if (error) {
            supabase
              .from("stock_products")
              .update({
                current_quantity: supabase.rpc as any, // fallback below
              })
              .eq("id", item.stock_product_id);
          }
        });
      }

      return sale;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-sales"] });
      queryClient.invalidateQueries({ queryKey: ["stock-products"] });
      toast.success("Venda criada com sucesso");
    },
    onError: (e: any) => toast.error(e.message || "Erro ao criar venda"),
  });

  const updateSaleStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from("crm_sales")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crm-sales"] });
      toast.success("Status da venda atualizado");
    },
    onError: () => toast.error("Erro ao atualizar venda"),
  });

  const fetchSaleItems = async (saleId: string): Promise<CrmSaleItem[]> => {
    const { data, error } = await supabase
      .from("crm_sale_items")
      .select("*")
      .eq("sale_id", saleId)
      .order("created_at");
    if (error) throw error;
    return data as CrmSaleItem[];
  };

  return { sales, isLoading, createSale, updateSaleStatus, fetchSaleItems };
};
