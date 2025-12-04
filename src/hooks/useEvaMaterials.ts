import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

export interface EvaMaterial {
  external_product_id: number;
  external_product_code: string;
  name: string;
  unit_value: number;
  quantity: number;
}

interface EvaResponse {
  success: boolean;
  vesselName?: string;
  orderNumber?: string;
  totalItems?: number;
  materials?: EvaMaterial[];
  error?: string;
}

export const useEvaMaterials = () => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();

  const fetchEvaMaterials = async (orderNumber: string): Promise<EvaResponse> => {
    setIsLoading(true);
    try {
      const { data, error } = await supabase.functions.invoke('get-eva-materials', {
        body: null,
        headers: {},
      });

      // The function uses query params, so we need to call it differently
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/get-eva-materials?order_number=${encodeURIComponent(orderNumber)}`,
        {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const result: EvaResponse = await response.json();

      if (!result.success) {
        throw new Error(result.error || "Erro ao buscar materiais");
      }

      return result;
    } catch (error: any) {
      console.error("Error fetching Eva materials:", error);
      toast({
        title: "Erro ao buscar materiais",
        description: error.message || "Não foi possível buscar materiais do estoque",
        variant: "destructive",
      });
      return { success: false, error: error.message };
    } finally {
      setIsLoading(false);
    }
  };

  return {
    fetchEvaMaterials,
    isLoading,
  };
};
