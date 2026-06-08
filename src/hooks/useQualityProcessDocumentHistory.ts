import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface ProcessDocHistoryRow {
  id: string;
  process_id: string;
  previous_document_id: string | null;
  new_document_id: string | null;
  changed_by: string | null;
  reason: string | null;
  changed_at: string;
}

export const useQualityProcessDocumentHistory = (processId: string | null) => {
  return useQuery({
    queryKey: ["quality_process_document_history", processId],
    enabled: !!processId,
    queryFn: async (): Promise<ProcessDocHistoryRow[]> => {
      const { data, error } = await supabase
        .from("quality_process_document_history" as any)
        .select("id, process_id, previous_document_id, new_document_id, changed_by, reason, changed_at")
        .eq("process_id", processId!)
        .order("changed_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as ProcessDocHistoryRow[]) ?? [];
    },
  });
};
