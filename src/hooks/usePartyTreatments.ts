import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface PartyTreatment {
  id: string;
  party_id: string;
  status: "pendente" | "em_andamento" | "atendida" | "nao_aplicavel";
  notes: string | null;
  decided_by: string | null;
  decided_at: string;
  created_at: string;
}

export const usePartyTreatments = (partyId: string | null | undefined) => {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ["quality_party_treatments", partyId],
    enabled: !!partyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_party_treatments" as any)
        .select("*")
        .eq("party_id", partyId!)
        .order("decided_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PartyTreatment[];
    },
  });
  return { history, isLoading };
};
