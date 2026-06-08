import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export type SafeguardKind = "backup" | "antivirus" | "restore_test" | "other";
export type SafeguardResult = "ok" | "fail" | "partial";

export interface ITSafeguard {
  id: string;
  company_id: string;
  kind: SafeguardKind;
  performed_at: string;
  performed_by: string | null;
  target: string | null;
  result: SafeguardResult;
  evidence_url: string | null;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export const useQualityITSafeguards = () => {
  const { profile, user } = useAuth();
  const qc = useQueryClient();
  const companyId = profile?.company_id;

  const list = useQuery({
    queryKey: ["quality_it_safeguards", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_it_safeguards" as any)
        .select("*")
        .eq("company_id", companyId!)
        .order("performed_at", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as ITSafeguard[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: Partial<ITSafeguard> & { kind: SafeguardKind }) => {
      const payload: any = { ...input, company_id: companyId, performed_by: input.performed_by ?? user?.id ?? null };
      const { data, error } = await supabase.from("quality_it_safeguards" as any).insert(payload).select().maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_it_safeguards"] });
      toast({ title: "Registro adicionado" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quality_it_safeguards" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_it_safeguards"] });
      toast({ title: "Removido" });
    },
  });

  // Calcula último backup e antivírus
  const items = list.data ?? [];
  const lastBackup = items.find((i) => i.kind === "backup") ?? null;
  const lastAntivirus = items.find((i) => i.kind === "antivirus") ?? null;
  const daysSince = (iso?: string | null) => {
    if (!iso) return Infinity;
    return Math.floor((Date.now() - new Date(iso).getTime()) / (1000 * 60 * 60 * 24));
  };
  const backupOverdue = daysSince(lastBackup?.performed_at) > 30;
  const antivirusOverdue = daysSince(lastAntivirus?.performed_at) > 30;

  return { items, isLoading: list.isLoading, create, remove, lastBackup, lastAntivirus, backupOverdue, antivirusOverdue };
};
