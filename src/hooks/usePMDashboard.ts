import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";

// ---------- Tickets ----------
export interface PMTicket {
  id: string;
  ticket_number: number;
  title: string;
  description: string;
  category: string;
  priority: string;
  status: string;
  user_role: string;
  user_name: string | null;
  user_email: string | null;
  page_url: string | null;
  suggested_area: string | null;
  suggested_files: any;
  dev_prompt: string | null;
  dev_prompt_status: string | null;
  impacted_module: string | null;
  ai_summary: string | null;
  reach: number | null;
  impact: number | null;
  confidence: number | null;
  effort: number | null;
  rice_score: number | null;
  rice_rationale: string | null;
  roadmap_horizon: string | null;
  created_at: string;
}

export const usePMTickets = () => {
  return useQuery({
    queryKey: ["pm-tickets"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(500);
      if (error) throw error;
      return (data ?? []) as unknown as PMTicket[];
    },
  });
};

export const useRecalcRice = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ticket_id: string) => {
      const { data, error } = await supabase.functions.invoke("pm-rice-score", {
        body: { ticket_id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pm-tickets"] });
      toast({ title: "RICE recalculado" });
    },
    onError: (e: any) => toast({ title: "Falha ao calcular RICE", description: e.message, variant: "destructive" }),
  });
};

export const useUpdateTicketPM = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<PMTicket> }) => {
      const { error } = await supabase.from("support_tickets").update(patch as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pm-tickets"] }),
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });
};

// ---------- North Star Metrics ----------
export interface NorthStarMetric {
  id: string;
  name: string;
  description: string | null;
  unit: string | null;
  target: number | null;
  current_value: number | null;
  formula_notes: string | null;
  updated_at: string;
}

export const useNorthStarMetrics = () => {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["pm-nsm"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pm_north_star_metrics" as any)
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as NorthStarMetric[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (m: Partial<NorthStarMetric>) => {
      if (m.id) {
        const { error } = await supabase.from("pm_north_star_metrics" as any).update(m as any).eq("id", m.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("pm_north_star_metrics" as any).insert(m as any);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pm-nsm"] }); toast({ title: "Métrica salva" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pm_north_star_metrics" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pm-nsm"] }),
  });

  return { ...query, upsert, remove };
};

// ---------- OST Nodes ----------
export interface OSTNode {
  id: string;
  parent_id: string | null;
  node_type: "outcome" | "opportunity" | "solution" | "experiment";
  title: string;
  description: string | null;
  north_star_metric_id: string | null;
  status: string | null;
}

export const useOSTNodes = () => {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["pm-ost"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pm_ost_nodes" as any)
        .select("*")
        .order("created_at", { ascending: true });
      if (error) throw error;
      return (data ?? []) as unknown as OSTNode[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (n: Partial<OSTNode>) => {
      if (n.id) {
        const { error } = await supabase.from("pm_ost_nodes" as any).update(n as any).eq("id", n.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("pm_ost_nodes" as any).insert(n as any);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pm-ost"] }); toast({ title: "Nó salvo" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pm_ost_nodes" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pm-ost"] }),
  });

  return { ...query, upsert, remove };
};

// ---------- Changelog ----------
export interface ChangelogEntry {
  id: string;
  title: string;
  description: string | null;
  released_at: string;
  related_ticket_ids: string[] | null;
  north_star_metric_id: string | null;
  metric_before: number | null;
  metric_after: number | null;
  impacted_modules: string[] | null;
  notes: string | null;
}

export const useChangelog = () => {
  const qc = useQueryClient();
  const query = useQuery({
    queryKey: ["pm-changelog"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("pm_changelog" as any)
        .select("*")
        .order("released_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ChangelogEntry[];
    },
  });

  const upsert = useMutation({
    mutationFn: async (e: Partial<ChangelogEntry>) => {
      if (e.id) {
        const { error } = await supabase.from("pm_changelog" as any).update(e as any).eq("id", e.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("pm_changelog" as any).insert(e as any);
        if (error) throw error;
      }
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ["pm-changelog"] }); toast({ title: "Entrada salva" }); },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("pm_changelog" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ["pm-changelog"] }),
  });

  return { ...query, upsert, remove };
};

// ---------- AI Performance ----------
export const useAIPerformance = () => {
  return useQuery({
    queryKey: ["pm-ai-perf"],
    queryFn: async () => {
      const since = new Date();
      since.setDate(since.getDate() - 30);
      const sinceIso = since.toISOString();

      const [feedback, messages, actions, agents] = await Promise.all([
        supabase.from("ai_feedback").select("rating, created_at").gte("created_at", sinceIso),
        supabase.from("ai_messages").select("id, created_at").gte("created_at", sinceIso),
        supabase.from("ai_assistant_actions").select("id, status, created_at, agent_id").gte("created_at", sinceIso),
        supabase.from("ai_agents").select("id, name, slug"),
      ]);

      const fb = feedback.data ?? [];
      const positives = fb.filter((f: any) => f.rating > 0).length;
      const negatives = fb.filter((f: any) => f.rating < 0).length;
      const total = fb.length;

      const acts = actions.data ?? [];
      const executed = acts.filter((a: any) => a.status === "executed" || a.status === "success").length;
      const failed = acts.filter((a: any) => a.status === "failed" || a.status === "error").length;

      return {
        totalMessages: messages.data?.length ?? 0,
        totalFeedback: total,
        resolutionRate: total > 0 ? (positives / total) * 100 : 0,
        negativeFeedback: negatives,
        actionsExecuted: executed,
        actionsFailed: failed,
        agents: agents.data ?? [],
      };
    },
  });
};
