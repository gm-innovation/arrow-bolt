import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface OpenAuvoDiscrepancy {
  id: string;
  item_name: string;
  classification: string;
  severity: string;
  stock_quantity: number;
  reported_quantity: number | null;
  value_at_risk: number;
  ai_notes: string | null;
}

/**
 * Divergências Auvo ainda pendentes de revisão para uma OS.
 * Usado para alertar o coordenador antes de finalizar a medição.
 */
export const useAuvoOrderDiscrepancies = (
  serviceOrderId?: string,
  orderNumber?: string | null,
) => {
  return useQuery({
    queryKey: ["auvo-order-discrepancies", serviceOrderId, orderNumber],
    enabled: !!serviceOrderId,
    queryFn: async (): Promise<OpenAuvoDiscrepancy[]> => {
      let taskQuery = supabase.from("auvo_tasks").select("id");
      taskQuery = orderNumber
        ? taskQuery.or(`service_order_id.eq.${serviceOrderId},order_number.eq.${orderNumber}`)
        : taskQuery.eq("service_order_id", serviceOrderId!);

      const { data: tasks, error: taskError } = await taskQuery;
      if (taskError) throw taskError;
      if (!tasks?.length) return [];

      const { data, error } = await supabase
        .from("auvo_material_discrepancies")
        .select(
          "id, item_name, classification, severity, stock_quantity, reported_quantity, value_at_risk, ai_notes",
        )
        .in(
          "auvo_task_uid",
          tasks.map((t) => t.id),
        )
        .eq("review_status", "pending")
        .not("classification", "in", "(match,stock_returned)");

      if (error) throw error;
      return (data ?? []) as OpenAuvoDiscrepancy[];
    },
  });
};
