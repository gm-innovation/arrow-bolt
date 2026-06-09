import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";

/** N:N Objetivo ↔ Risco / Parte Interessada */

export const useObjectiveRisks = (objectiveId: string | null | undefined) => {
  const qc = useQueryClient();
  const key = ["quality_objective_risks", objectiveId];

  const { data: links = [], isLoading } = useQuery({
    queryKey: key,
    enabled: !!objectiveId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_objective_risks" as any)
        .select("risk_id")
        .eq("objective_id", objectiveId!);
      if (error) throw error;
      return (data ?? []).map((r: any) => r.risk_id as string);
    },
  });

  const set = useMutation({
    mutationFn: async (riskIds: string[]) => {
      if (!objectiveId) throw new Error("Objetivo inválido");
      await supabase.from("quality_objective_risks" as any).delete().eq("objective_id", objectiveId);
      if (riskIds.length) {
        const { error } = await supabase
          .from("quality_objective_risks" as any)
          .insert(riskIds.map((risk_id) => ({ objective_id: objectiveId, risk_id })));
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return { linkedRiskIds: links, isLoading, set };
};

export const useObjectiveParties = (objectiveId: string | null | undefined) => {
  const qc = useQueryClient();
  const key = ["quality_objective_parties", objectiveId];

  const { data: links = [], isLoading } = useQuery({
    queryKey: key,
    enabled: !!objectiveId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_objective_parties" as any)
        .select("party_id")
        .eq("objective_id", objectiveId!);
      if (error) throw error;
      return (data ?? []).map((r: any) => r.party_id as string);
    },
  });

  const set = useMutation({
    mutationFn: async (partyIds: string[]) => {
      if (!objectiveId) throw new Error("Objetivo inválido");
      await supabase.from("quality_objective_parties" as any).delete().eq("objective_id", objectiveId);
      if (partyIds.length) {
        const { error } = await supabase
          .from("quality_objective_parties" as any)
          .insert(partyIds.map((party_id) => ({ objective_id: objectiveId, party_id })));
        if (error) throw error;
      }
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: key }),
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return { linkedPartyIds: links, isLoading, set };
};

/** Consulta reversa: dado um risco, quais objetivos o cobrem */
export const useObjectivesForRisk = (riskId: string | null | undefined) => {
  return useQuery({
    queryKey: ["objectives_for_risk", riskId],
    enabled: !!riskId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_objective_risks" as any)
        .select("objective_id, quality_objectives(id,title,code,status)")
        .eq("risk_id", riskId!);
      if (error) throw error;
      return (data ?? []).map((r: any) => r.quality_objectives).filter(Boolean);
    },
  });
};

export const useObjectivesForParty = (partyId: string | null | undefined) => {
  return useQuery({
    queryKey: ["objectives_for_party", partyId],
    enabled: !!partyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_objective_parties" as any)
        .select("objective_id, quality_objectives(id,title,code,status)")
        .eq("party_id", partyId!);
      if (error) throw error;
      return (data ?? []).map((r: any) => r.quality_objectives).filter(Boolean);
    },
  });
};
