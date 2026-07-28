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
  roadmap_position: number | null;
  pm_changelog_id: string | null;
  resolved_at: string | null;
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

export const useRegisterCodeChange = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ticket: PMTicket) => {
      const { data: authData } = await supabase.auth.getUser();
      const occurredAt = new Date().toISOString();
      const moduleName = ticket.impacted_module ?? ticket.suggested_area ?? null;
      const titlePrefix = ticket.category === "bug" ? "Correção implementada" : "Alteração implementada";

      const { error } = await supabase
        .from("pm_activity_log" as any)
        .upsert({
          occurred_at: occurredAt,
          source: "ticket",
          category: ticket.category,
          module: moduleName,
          title: `${titlePrefix} — Ticket #${ticket.ticket_number}`,
          description: `${ticket.title}\n\nCódigo alterado e aguardando validação do usuário.`,
          ref_table: "support_tickets_code_change",
          ref_id: ticket.id,
          author_id: authData.user?.id ?? null,
          metadata: {
            ticket_id: ticket.id,
            ticket_number: ticket.ticket_number,
            ticket_title: ticket.title,
            status_at_registration: ticket.status,
            code_change_registered: true,
            registered_from: "pm_dashboard",
            category: ticket.category,
            priority: ticket.priority,
            horizon: ticket.roadmap_horizon,
          },
        } as any, { onConflict: "source,ref_table,ref_id" });

      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pm-activity-log"] });
      qc.invalidateQueries({ queryKey: ["pm-tickets"] });
      toast({ title: "Alteração de código registrada" });
    },
    onError: (e: any) => toast({ title: "Erro ao registrar alteração", description: e.message, variant: "destructive" }),
  });
};

// Reordena/movimenta um ticket entre horizontes do roadmap
export const useMoveRoadmapTicket = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, horizon, position }: { id: string; horizon: string; position: number }) => {
      const { error } = await supabase
        .from("support_tickets")
        .update({ roadmap_horizon: horizon, roadmap_position: position } as any)
        .eq("id", id);
      if (error) throw error;
    },
    onMutate: async ({ id, horizon, position }) => {
      await qc.cancelQueries({ queryKey: ["pm-tickets"] });
      const prev = qc.getQueryData<PMTicket[]>(["pm-tickets"]);
      if (prev) {
        qc.setQueryData<PMTicket[]>(["pm-tickets"], prev.map((t) =>
          t.id === id ? { ...t, roadmap_horizon: horizon, roadmap_position: position } : t,
        ));
      }
      return { prev };
    },
    onError: (e: any, _v, ctx) => {
      if (ctx?.prev) qc.setQueryData(["pm-tickets"], ctx.prev);
      toast({ title: "Erro ao mover", description: e.message, variant: "destructive" });
    },
    onSettled: () => qc.invalidateQueries({ queryKey: ["pm-tickets"] }),
  });
};

// Gera prompt de dev para um ticket (reusa Edge Function existente)
export const useGenerateDevPrompt = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (ticket_id: string) => {
      const { data, error } = await supabase.functions.invoke("generate-ticket-dev-prompt", {
        body: { ticket_id },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pm-tickets"] });
      toast({ title: "Prompt gerado" });
    },
    onError: (e: any) => toast({ title: "Falha ao gerar prompt", description: e.message, variant: "destructive" }),
  });
};

// Publica uma versão: agrupa tickets resolvidos sem changelog em uma nova entrada
export const usePublishVersion = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ version, title, description, ticket_ids }: { version: string; title: string; description?: string; ticket_ids: string[] }) => {
      const { data: entry, error } = await supabase
        .from("pm_changelog" as any)
        .insert({ version, title, description: description ?? null, released_at: new Date().toISOString(), related_ticket_ids: ticket_ids } as any)
        .select()
        .single();
      if (error) throw error;
      if (ticket_ids.length > 0) {
        const { error: linkErr } = await supabase
          .from("support_tickets")
          .update({ pm_changelog_id: (entry as any).id } as any)
          .in("id", ticket_ids);
        if (linkErr) throw linkErr;
      }
      return entry;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pm-tickets"] });
      qc.invalidateQueries({ queryKey: ["pm-changelog"] });
      toast({ title: "Versão publicada" });
    },
    onError: (e: any) => toast({ title: "Erro ao publicar", description: e.message, variant: "destructive" }),
  });
};

// ---------- North Star Metrics ----------
export interface NorthStarMetric {
  id: string;
  metric_key: string | null;
  name: string;
  description: string | null;
  unit: string | null;
  target: number | null;
  current_value: number | null;
  formula_notes: string | null;
  updated_at: string;
}

export const useRefreshProductMetrics = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("pm-product-metrics-refresh", { body: {} });
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["pm-nsm"] });
      toast({ title: "Métricas atualizadas", description: "Marina recalculou a saúde do produto." });
    },
    onError: (e: any) => toast({ title: "Falha ao atualizar", description: e.message, variant: "destructive" }),
  });
};

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

// ---------- Live ticket counts (bypass NSM snapshot staleness) ----------
export const usePMTicketLiveCounts = () => {
  return useQuery({
    queryKey: ["pm-ticket-live-counts"],
    staleTime: 60_000,
    queryFn: async () => {
      const past7 = new Date(Date.now() - 7 * 86400_000).toISOString();
      const past30 = new Date(Date.now() - 30 * 86400_000).toISOString();

      const [openRes, new7Res, bug7Res, resolvedRes] = await Promise.all([
        supabase.from("support_tickets").select("id", { count: "exact", head: true })
          .in("status", ["open", "triaging", "in_progress"]),
        supabase.from("support_tickets").select("id", { count: "exact", head: true })
          .gte("created_at", past7),
        supabase.from("support_tickets").select("id", { count: "exact", head: true })
          .eq("category", "bug").gte("created_at", past7),
        supabase.from("support_tickets").select("created_at, resolved_at")
          .not("resolved_at", "is", null).gte("resolved_at", past30).limit(5000),
      ]);

      const resolved = (resolvedRes.data ?? []) as any[];
      const avgDays = resolved.length > 0
        ? +(resolved.reduce((acc, t) => acc + (new Date(t.resolved_at).getTime() - new Date(t.created_at).getTime()), 0) / resolved.length / 86400_000).toFixed(2)
        : 0;

      return {
        tickets_open: openRes.count ?? 0,
        tickets_new_7d: new7Res.count ?? 0,
        tickets_bug_7d: bug7Res.count ?? 0,
        ticket_resolution_days: avgDays,
      } as Record<string, number>;
    },
  });
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

// ---------- OST Seed (suggest from tickets + NSMs) ----------
export interface OSTSeedPlan {
  outcomes: Array<{ title: string; description: string | null; nsm_id: string | null; existing_id?: string }>;
  opportunities: Array<{ title: string; description: string; parent_outcome_title: string; existing_id?: string }>;
  solutions: Array<{ title: string; description: string | null; parent_opportunity_title: string; ticket_id: string; existing_id?: string; will_link: boolean }>;
}
export interface OSTSeedCounts {
  outcomes_new: number; outcomes_existing: number;
  opportunities_new: number; opportunities_existing: number;
  solutions_new: number; solutions_existing: number;
  tickets_total: number;
}

export const useOSTSeed = () => {
  const qc = useQueryClient();
  const preview = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("pm-ost-seed", { body: { apply: false } });
      if (error) throw error;
      return data as { apply: false; plan: OSTSeedPlan; counts: OSTSeedCounts };
    },
    onError: (e: any) => toast({ title: "Erro ao gerar sugestão", description: e.message, variant: "destructive" }),
  });
  const apply = useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("pm-ost-seed", { body: { apply: true } });
      if (error) throw error;
      return data as { apply: true; counts: OSTSeedCounts; links_created: number };
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ["pm-ost"] });
      toast({
        title: "OST atualizada",
        description: `Criados ${data.counts.outcomes_new} outcomes, ${data.counts.opportunities_new} opportunities, ${data.counts.solutions_new} solutions e ${data.links_created} vínculos com tickets.`,
      });
    },
    onError: (e: any) => toast({ title: "Erro ao aplicar", description: e.message, variant: "destructive" }),
  });
  return { preview, apply };
};

// ---------- Changelog ----------
export interface ChangelogEntry {
  id: string;
  version: string | null;
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
export type AIPerfWindow = "30d" | "90d" | "all";

export const useAIPerformance = (window: AIPerfWindow = "30d") => {
  return useQuery({
    queryKey: ["pm-ai-perf", window],
    queryFn: async () => {
      let sinceIso: string | null = null;
      if (window !== "all") {
        const days = window === "30d" ? 30 : 90;
        const d = new Date();
        d.setDate(d.getDate() - days);
        sinceIso = d.toISOString();
      }

      const withRange = (q: any) => (sinceIso ? q.gte("created_at", sinceIso) : q);

      const [feedback, messages, actions, agents, convs] = await Promise.all([
        withRange(supabase.from("ai_feedback").select("rating, agent_id, created_at")),
        withRange(supabase.from("ai_messages").select("id, created_at, conversation_id, role")),
        withRange(supabase.from("ai_assistant_actions").select("id, success, created_at, agent_id, tool_name")),
        supabase.from("ai_agents").select("id, name, slug"),
        withRange(supabase.from("ai_conversations").select("id, user_id, agent_id, created_at")),
      ]);

      const fb = feedback.data ?? [];
      const positives = fb.filter((f: any) => f.rating > 0).length;
      const negatives = fb.filter((f: any) => f.rating < 0).length;
      const total = fb.length;

      const acts = (actions.data ?? []) as any[];
      const executed = acts.filter((a) => a.success === true).length;
      const failed = acts.filter((a) => a.success === false).length;
      const totalActions = acts.length;

      const agentsList = (agents.data ?? []) as any[];
      const agentName = (id: string | null) => agentsList.find((a) => a.id === id)?.name ?? "—";

      // messages by day (last N days of the window; for "all" use last 60)
      const msgs = (messages.data ?? []) as any[];
      const dayKey = (iso: string) => iso.slice(0, 10);
      const daysMap = new Map<string, number>();
      msgs.forEach((m) => daysMap.set(dayKey(m.created_at), (daysMap.get(dayKey(m.created_at)) ?? 0) + 1));
      const messagesByDay = Array.from(daysMap.entries())
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([date, count]) => ({ date, count }));

      // top tools
      const toolMap = new Map<string, { total: number; ok: number }>();
      acts.forEach((a) => {
        const key = a.tool_name ?? "—";
        const t = toolMap.get(key) ?? { total: 0, ok: 0 };
        t.total += 1;
        if (a.success) t.ok += 1;
        toolMap.set(key, t);
      });
      const topTools = Array.from(toolMap.entries())
        .map(([tool_name, v]) => ({ tool_name, total: v.total, ok: v.ok, rate: v.total ? (v.ok / v.total) * 100 : 0 }))
        .sort((a, b) => b.total - a.total)
        .slice(0, 8);

      // messages by agent (via conversation.agent_id)
      const convsList = (convs.data ?? []) as any[];
      const convAgent = new Map<string, string | null>();
      convsList.forEach((c) => convAgent.set(c.id, c.agent_id ?? null));
      const agentMsgMap = new Map<string, number>();
      msgs.forEach((m) => {
        const aid = convAgent.get(m.conversation_id) ?? null;
        const key = aid ?? "unknown";
        agentMsgMap.set(key, (agentMsgMap.get(key) ?? 0) + 1);
      });
      const messagesByAgent = Array.from(agentMsgMap.entries())
        .map(([agent_id, count]) => ({ agent_id, name: agent_id === "unknown" ? "Sem agente" : agentName(agent_id), count }))
        .sort((a, b) => b.count - a.count);

      const uniqueUsers = new Set(convsList.map((c) => c.user_id).filter(Boolean)).size;

      return {
        totalMessages: msgs.length,
        totalConversations: convsList.length,
        uniqueUsers,
        totalFeedback: total,
        resolutionRate: total > 0 ? (positives / total) * 100 : 0,
        positiveFeedback: positives,
        negativeFeedback: negatives,
        actionsExecuted: executed,
        actionsFailed: failed,
        totalActions,
        actionSuccessRate: totalActions > 0 ? (executed / totalActions) * 100 : 0,
        agents: agentsList,
        messagesByDay,
        topTools,
        messagesByAgent,
      };
    },
  });
};

// ---------- Changelog seed ----------
export const useSeedChangelog = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async () => {
      const { data, error } = await supabase.functions.invoke("pm-changelog-seed", { body: {} });
      if (error) throw error;
      return data as { created: number; skipped: number; total_days: number };
    },
    onSuccess: (d) => {
      qc.invalidateQueries({ queryKey: ["pm-changelog"] });
      toast({
        title: "Changelog sincronizado",
        description: `${d.created} entrada(s) criada(s), ${d.skipped} já existiam.`,
      });
    },
    onError: (e: any) => toast({ title: "Erro ao sincronizar", description: e.message, variant: "destructive" }),
  });
};
