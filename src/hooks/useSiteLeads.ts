import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";
import type { Lead } from "@/components/commercial/opportunities/ConvertLeadDialog";

export const useSiteLeads = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["site-leads", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [] as Lead[];
      const { data, error } = await supabase
        .from("public_site_leads")
        .select("*")
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as Lead[];
    },
    enabled: !!profile?.company_id,
    refetchInterval: 60_000,
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: Lead["status"] }) => {
      const { error } = await supabase
        .from("public_site_leads")
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["site-leads"] });
      toast.success("Status atualizado");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const openLeads = leads.filter((l) => l.status === "new" || l.status === "reviewed");

  return { leads, openLeads, isLoading, setStatus };
};
