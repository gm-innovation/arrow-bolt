import { useEffect } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

/**
 * Mantém a interface comercial sincronizada automaticamente com o banco.
 * Necessário para refletir alterações feitas fora da tela (IA/Marina,
 * outro usuário, integrações) sem recarregar a página.
 */
export const useOpportunitiesRealtime = () => {
  const queryClient = useQueryClient();

  useEffect(() => {
    const invalidate = () => {
      queryClient.invalidateQueries({ queryKey: ["crm-opportunities"] });
      queryClient.invalidateQueries({ queryKey: ["crm-opportunity"] });
      queryClient.invalidateQueries({ queryKey: ["crm-opportunity-products"] });
      queryClient.invalidateQueries({ queryKey: ["commercial-stats"] });
    };

    const channel = supabase
      .channel("crm-opportunities-realtime")
      .on("postgres_changes", { event: "*", schema: "public", table: "crm_opportunities" }, invalidate)
      .on("postgres_changes", { event: "*", schema: "public", table: "crm_opportunity_products" }, invalidate)
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [queryClient]);
};
