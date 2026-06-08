import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface OrgChartNode {
  id: string;
  company_id: string;
  parent_id: string | null;
  title: string;
  user_id: string | null;
  department_id: string | null;
  responsibilities: string | null;
  authority: string | null;
  order_index: number;
  active: boolean;
  created_at: string;
  updated_at: string;
}

export const useQualityOrgChart = () => {
  const { profile } = useAuth();
  const qc = useQueryClient();
  const companyId = profile?.company_id;

  const list = useQuery({
    queryKey: ["quality_org_chart_nodes", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_org_chart_nodes" as any)
        .select("*")
        .eq("company_id", companyId!)
        .order("order_index");
      if (error) throw error;
      return (data ?? []) as unknown as OrgChartNode[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (input: Partial<OrgChartNode> & { title: string }) => {
      const payload: any = { ...input, company_id: companyId };
      const { error } = input.id
        ? await supabase.from("quality_org_chart_nodes" as any).update(payload).eq("id", input.id)
        : await supabase.from("quality_org_chart_nodes" as any).insert(payload);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_org_chart_nodes"] });
      toast({ title: "Posição salva" });
    },
    onError: (e: any) =>
      toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("quality_org_chart_nodes" as any)
        .delete()
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_org_chart_nodes"] });
      toast({ title: "Posição removida" });
    },
    onError: (e: any) =>
      toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return { ...list, items: list.data ?? [], upsert, remove };
};
