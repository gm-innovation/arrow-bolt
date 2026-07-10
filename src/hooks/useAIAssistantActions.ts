import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type AIAssistantActionRow = {
  id: string;
  created_at: string;
  user_id: string | null;
  role: string | null;
  agent_id: string | null;
  tool_name: string;
  table_name: string;
  row_id: string | null;
  action: "create" | "update" | "delete";
  success: boolean;
  error_message: string | null;
};

export function useAIAssistantActions(agentId?: string, limit = 20) {
  return useQuery({
    queryKey: ["ai-assistant-actions", agentId ?? "all", limit],
    enabled: !!agentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("ai_assistant_actions" as any)
        .select("id, created_at, user_id, role, agent_id, tool_name, table_name, row_id, action, success, error_message")
        .eq("agent_id", agentId!)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (error) throw error;
      return (data as any[]) as AIAssistantActionRow[];
    },
  });
}
