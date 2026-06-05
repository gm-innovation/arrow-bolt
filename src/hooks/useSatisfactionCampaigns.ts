import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export type CampaignStatus = "draft" | "active" | "closed";

export interface CampaignRow {
  id: string;
  company_id: string;
  name: string;
  description: string | null;
  starts_at: string;
  ends_at: string;
  status: CampaignStatus;
  target_kind: "all_clients" | "selected";
  target_client_ids: string[];
  created_at: string;
  updated_at: string;
  invites_count?: number;
  responses_count?: number;
  avg_nps?: number | null;
  avg_csat?: number | null;
}

export const useSatisfactionCampaigns = () => {
  const { user, profile } = useAuth();
  const qc = useQueryClient();

  const { data: campaigns = [], isLoading } = useQuery({
    queryKey: ["satisfaction_campaigns", profile?.company_id],
    enabled: !!user && !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_satisfaction_campaigns" as any)
        .select("*")
        .eq("company_id", profile!.company_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data as any[]) ?? [];
      const ids = rows.map((r) => r.id);
      if (!ids.length) return rows as CampaignRow[];

      const [{ data: invites }, { data: responses }] = await Promise.all([
        supabase.from("quality_satisfaction_invites" as any).select("campaign_id").in("campaign_id", ids),
        supabase
          .from("quality_satisfaction_responses" as any)
          .select("campaign_id,nps_score,csat_score")
          .in("campaign_id", ids),
      ]);

      const inviteCount: Record<string, number> = {};
      ((invites as any[]) ?? []).forEach((i) => {
        inviteCount[i.campaign_id] = (inviteCount[i.campaign_id] ?? 0) + 1;
      });
      const respMap: Record<string, { n: number[]; c: number[] }> = {};
      ((responses as any[]) ?? []).forEach((r) => {
        respMap[r.campaign_id] = respMap[r.campaign_id] ?? { n: [], c: [] };
        respMap[r.campaign_id].n.push(r.nps_score);
        respMap[r.campaign_id].c.push(r.csat_score);
      });

      return rows.map((r) => {
        const rm = respMap[r.id];
        return {
          ...r,
          invites_count: inviteCount[r.id] ?? 0,
          responses_count: rm?.n.length ?? 0,
          avg_nps: rm?.n.length ? rm.n.reduce((a, b) => a + b, 0) / rm.n.length : null,
          avg_csat: rm?.c.length ? rm.c.reduce((a, b) => a + b, 0) / rm.c.length : null,
        };
      }) as CampaignRow[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: { name: string; description?: string; starts_at: string; ends_at: string }) => {
      if (!profile?.company_id) throw new Error("Empresa não encontrada");
      const { data, error } = await supabase
        .from("quality_satisfaction_campaigns" as any)
        .insert({
          company_id: profile.company_id,
          name: input.name,
          description: input.description ?? null,
          starts_at: input.starts_at,
          ends_at: input.ends_at,
          target_kind: "all_clients",
          target_client_ids: [],
          created_by: user!.id,
          status: "draft",
        })
        .select()
        .single();
      if (error) throw error;
      return data as any;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["satisfaction_campaigns"] });
      toast({ title: "Campanha criada" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const setStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: CampaignStatus }) => {
      const { error } = await supabase
        .from("quality_satisfaction_campaigns" as any)
        .update({ status })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["satisfaction_campaigns"] });
      toast({ title: "Status atualizado" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return { campaigns, isLoading, create, setStatus };
};

export const useCampaignDetail = (campaignId?: string) => {
  const qc = useQueryClient();

  const { data: campaign, isLoading: loadingCampaign } = useQuery({
    queryKey: ["satisfaction_campaign", campaignId],
    enabled: !!campaignId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_satisfaction_campaigns" as any)
        .select("*")
        .eq("id", campaignId)
        .maybeSingle();
      if (error) throw error;
      return data as any;
    },
  });

  const { data: invites = [] } = useQuery({
    queryKey: ["satisfaction_invites", campaignId],
    enabled: !!campaignId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_satisfaction_invites" as any)
        .select("*, client:clients(id,company_name)")
        .eq("campaign_id", campaignId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

  const { data: responses = [] } = useQuery({
    queryKey: ["satisfaction_responses", campaignId],
    enabled: !!campaignId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_satisfaction_responses" as any)
        .select("*, client:clients(id,company_name)")
        .eq("campaign_id", campaignId)
        .order("responded_at", { ascending: false });
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

  const createInvite = useMutation({
    mutationFn: async (input: { client_id?: string | null }) => {
      if (!campaignId) throw new Error("Campanha não encontrada");
      const { data, error } = await supabase
        .from("quality_satisfaction_invites" as any)
        .insert({ campaign_id: campaignId, client_id: input.client_id ?? null })
        .select()
        .single();
      if (error) throw error;
      return data as any;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["satisfaction_invites", campaignId] });
      toast({ title: "Convite criado", description: "Link público gerado." });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return { campaign, invites, responses, createInvite, loadingCampaign };
};
