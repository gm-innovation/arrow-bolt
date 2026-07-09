import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface CommercialClientOption {
  id: string;
  company_id: string;
  name: string;
  cnpj: string | null;
  entity_type: string | null;
  commercial_status: string | null;
}

export const useCommercialClientOptions = () => {
  const { profile } = useAuth();

  const { data: clients = [], isLoading, error } = useQuery({
    queryKey: ["commercial-client-options", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];

      const { data, error } = await (supabase as any)
        .from("crm_client_options")
        .select("id, company_id, name, cnpj, entity_type, commercial_status")
        .eq("company_id", profile.company_id)
        .order("name");

      if (error) throw error;
      return (data || []) as CommercialClientOption[];
    },
    enabled: !!profile?.company_id,
    staleTime: 1000 * 60 * 5,
  });

  return { clients, isLoading, error };
};