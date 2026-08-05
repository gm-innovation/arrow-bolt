import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export type FinanceCategoryType = "expense" | "revenue";

export interface FinanceCategory {
  id: string;
  company_id: string;
  name: string;
  category_type: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface FinanceSettings {
  id: string;
  company_id: string;
  alerts_enabled: boolean;
  payable_alert_days: number;
  receivable_alert_days: number;
  default_payable_category_id: string | null;
  default_receivable_category_id: string | null;
  hide_dashboard_amounts: boolean;
}

export const DEFAULT_FINANCE_CATEGORIES: { name: string; category_type: FinanceCategoryType }[] = [
  { name: "Serviços", category_type: "revenue" },
  { name: "Medições", category_type: "revenue" },
  { name: "Materiais", category_type: "expense" },
  { name: "Impostos", category_type: "expense" },
  { name: "Folha de Pagamento", category_type: "expense" },
  { name: "Viagens e Hospedagem", category_type: "expense" },
  { name: "Serviços de Terceiros", category_type: "expense" },
];

const fetchCompanyId = async (userId: string) => {
  const { data, error } = await supabase.from("profiles").select("company_id").eq("id", userId).maybeSingle();
  if (error) throw error;
  if (!data?.company_id) throw new Error("Empresa não encontrada no seu perfil");
  return data.company_id as string;
};

export const useFinanceCategories = (typeFilter?: FinanceCategoryType) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ["finance-categories"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("finance_categories")
        .select("*")
        .order("category_type", { ascending: true })
        .order("name", { ascending: true });
      if (error) throw error;
      return (data || []) as FinanceCategory[];
    },
    enabled: !!user,
  });

  const invalidate = () => queryClient.invalidateQueries({ queryKey: ["finance-categories"] });

  const createCategory = useMutation({
    mutationFn: async (values: { name: string; category_type: FinanceCategoryType }) => {
      const company_id = await fetchCompanyId(user!.id);
      const { error } = await supabase.from("finance_categories").insert({
        company_id,
        name: values.name.trim(),
        category_type: values.category_type,
        is_active: true,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Categoria criada" });
    },
    onError: (error: Error) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });

  const updateCategory = useMutation({
    mutationFn: async ({ id, ...values }: { id: string; name?: string; category_type?: FinanceCategoryType; is_active?: boolean }) => {
      const { error } = await supabase.from("finance_categories").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Categoria atualizada" });
    },
    onError: (error: Error) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });

  const deleteCategory = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("finance_categories").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Categoria removida" });
    },
    onError: (error: Error) =>
      toast({
        title: "Não foi possível remover",
        description: "A categoria pode estar em uso em lançamentos. Desative-a em vez de excluir.",
        variant: "destructive",
      }),
  });

  const seedDefaults = useMutation({
    mutationFn: async () => {
      const company_id = await fetchCompanyId(user!.id);
      const existing = new Set(categories.map((c) => c.name.toLowerCase()));
      const rows = DEFAULT_FINANCE_CATEGORIES.filter((c) => !existing.has(c.name.toLowerCase())).map((c) => ({
        company_id,
        name: c.name,
        category_type: c.category_type,
        is_active: true,
      }));
      if (rows.length === 0) return 0;
      const { error } = await supabase.from("finance_categories").insert(rows);
      if (error) throw error;
      return rows.length;
    },
    onSuccess: (count) => {
      invalidate();
      toast({ title: count ? `${count} categorias criadas` : "Nenhuma categoria nova para criar" });
    },
    onError: (error: Error) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });

  const filtered = typeFilter
    ? categories.filter((c) => c.category_type === typeFilter && c.is_active)
    : categories;

  return { categories: filtered, allCategories: categories, isLoading, createCategory, updateCategory, deleteCategory, seedDefaults };
};

export const useFinanceSettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: settings, isLoading } = useQuery({
    queryKey: ["finance-settings"],
    queryFn: async () => {
      const { data, error } = await supabase.from("finance_settings").select("*").maybeSingle();
      if (error) throw error;
      return (data as FinanceSettings | null) ?? null;
    },
    enabled: !!user,
  });

  const saveSettings = useMutation({
    mutationFn: async (values: Partial<Omit<FinanceSettings, "id" | "company_id">>) => {
      const company_id = await fetchCompanyId(user!.id);
      if (settings?.id) {
        const { error } = await supabase.from("finance_settings").update(values).eq("id", settings.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("finance_settings").insert({ company_id, ...values });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["finance-settings"] });
      toast({ title: "Preferências salvas" });
    },
    onError: (error: Error) => toast({ title: "Erro", description: error.message, variant: "destructive" }),
  });

  return { settings, isLoading, saveSettings };
};
