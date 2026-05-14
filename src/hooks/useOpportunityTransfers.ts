import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "sonner";

export interface OpportunityTransfer {
  id: string;
  company_id: string;
  opportunity_id: string;
  from_user_id: string;
  to_user_id: string;
  reason: string | null;
  status: "pending" | "accepted" | "rejected" | "cancelled" | "auto";
  decided_by: string | null;
  decided_at: string | null;
  decision_note: string | null;
  created_at: string;
  from_name?: string | null;
  to_name?: string | null;
}

const fetchProfileNames = async (ids: string[]) => {
  const unique = Array.from(new Set(ids.filter(Boolean)));
  if (!unique.length) return {} as Record<string, string>;
  const { data } = await supabase.from("profiles").select("id, full_name").in("id", unique);
  const map: Record<string, string> = {};
  (data || []).forEach((p: any) => { map[p.id] = p.full_name; });
  return map;
};

export const useOpportunityTransfers = (opportunityId?: string | null) => {
  const qc = useQueryClient();
  const { user, profile } = useAuth();

  const list = useQuery({
    queryKey: ["opportunity-transfers", opportunityId],
    queryFn: async (): Promise<OpportunityTransfer[]> => {
      if (!opportunityId) return [];
      const { data, error } = await (supabase as any)
        .from("crm_opportunity_transfers")
        .select("*")
        .eq("opportunity_id", opportunityId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      const rows = (data || []) as OpportunityTransfer[];
      const names = await fetchProfileNames(rows.flatMap((r) => [r.from_user_id, r.to_user_id]));
      return rows.map((r) => ({ ...r, from_name: names[r.from_user_id] || "—", to_name: names[r.to_user_id] || "—" }));
    },
    enabled: !!opportunityId,
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["opportunity-transfers", opportunityId] });
    qc.invalidateQueries({ queryKey: ["opportunities"] });
  };

  const create = useMutation({
    mutationFn: async (vars: { opportunityId: string; toUserId: string; reason?: string; direct: boolean }) => {
      if (!user?.id || !profile?.company_id) throw new Error("Sessão inválida");
      const { error } = await (supabase as any).from("crm_opportunity_transfers").insert({
        company_id: profile.company_id,
        opportunity_id: vars.opportunityId,
        from_user_id: user.id,
        to_user_id: vars.toUserId,
        reason: vars.reason || null,
        status: vars.direct ? "auto" : "pending",
      });
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      toast.success(vars.direct ? "Oportunidade transferida" : "Solicitação enviada");
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  const decide = useMutation({
    mutationFn: async (vars: { id: string; status: "accepted" | "rejected" | "cancelled"; note?: string }) => {
      if (!user?.id) throw new Error("Sessão inválida");
      const { error } = await (supabase as any)
        .from("crm_opportunity_transfers")
        .update({
          status: vars.status,
          decided_by: user.id,
          decided_at: new Date().toISOString(),
          decision_note: vars.note || null,
        })
        .eq("id", vars.id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      const map = { accepted: "Transferência aceita", rejected: "Transferência recusada", cancelled: "Solicitação cancelada" };
      toast.success(map[vars.status]);
      invalidate();
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { transfers: list.data || [], isLoading: list.isLoading, create, decide };
};
