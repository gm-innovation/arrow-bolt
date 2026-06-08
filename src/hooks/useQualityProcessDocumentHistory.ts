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
  previous_doc?: { code: string; title: string } | null;
  new_doc?: { code: string; title: string } | null;
  changed_by_user?: { full_name: string } | null;
}

export const useQualityProcessDocumentHistory = (processId: string | null) => {
  return useQuery({
    queryKey: ["quality_process_document_history", processId],
    enabled: !!processId,
    queryFn: async (): Promise<ProcessDocHistoryRow[]> => {
      const { data, error } = await supabase
        .from("quality_process_document_history" as any)
        .select(
          `id, process_id, previous_document_id, new_document_id, changed_by, reason, changed_at,
           previous_doc:quality_documents!quality_process_document_history_previous_document_id_fkey(code, title),
           new_doc:quality_documents!quality_process_document_history_new_document_id_fkey(code, title),
           changed_by_user:profiles!quality_process_document_history_changed_by_fkey(full_name)`
        )
        .eq("process_id", processId!)
        .order("changed_at", { ascending: false });
      if (error) throw error;
      return (data as unknown as ProcessDocHistoryRow[]) ?? [];
    },
  });
};
