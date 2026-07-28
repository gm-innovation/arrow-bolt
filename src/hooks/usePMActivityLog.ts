import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export type ActivitySource =
  | "ticket"
  | "changelog"
  | "migration"
  | "marina_action"
  | "edge_function"
  | "manual";

export interface ActivityLogItem {
  id: string;
  occurred_at: string;
  source: ActivitySource;
  category: string | null;
  module: string | null;
  title: string;
  description: string | null;
  ref_table: string | null;
  ref_id: string | null;
  author_id: string | null;
  metadata: Record<string, any>;
  created_at: string;
}

export interface ActivityFilters {
  sources?: ActivitySource[];
  module?: string | null;
  category?: string | null;
  search?: string | null;
  limit?: number;
}

export const usePMActivityLog = (filters: ActivityFilters = {}) => {
  const { sources, module, category, search, limit = 500 } = filters;
  return useQuery({
    queryKey: ["pm-activity-log", sources, module, category, search, limit],
    queryFn: async () => {
      let q = supabase
        .from("pm_activity_log" as any)
        .select("*")
        .order("occurred_at", { ascending: false })
        .limit(limit);
      if (sources && sources.length) q = q.in("source", sources);
      if (module) q = q.eq("module", module);
      if (category) q = q.eq("category", category);
      if (search) q = q.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return (data ?? []) as unknown as ActivityLogItem[];
    },
  });
};
