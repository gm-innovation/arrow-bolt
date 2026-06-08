import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { useQualitySettings } from "./useQualitySettings";

export interface PolicyAcknowledgement {
  id: string;
  company_id: string;
  user_id: string;
  policy_version: number;
  acknowledged_at: string;
}

export interface PolicyVersion {
  id: string;
  company_id: string;
  version: number;
  text: string;
  published_by: string | null;
  published_at: string;
}

export const useQualityPolicy = () => {
  const { profile, user } = useAuth();
  const qc = useQueryClient();
  const companyId = profile?.company_id;
  const { settings, isMaster, upsert } = useQualitySettings();

  const policyText = (settings as any)?.quality_policy_text as string | null | undefined;
  const policyVersion = ((settings as any)?.quality_policy_version as number | undefined) ?? 1;
  const publishedAt = (settings as any)?.quality_policy_published_at as string | null | undefined;

  const acks = useQuery({
    queryKey: ["quality_policy_acks", companyId, policyVersion],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_policy_acknowledgements" as any)
        .select("*")
        .eq("company_id", companyId!)
        .eq("policy_version", policyVersion);
      if (error) throw error;
      return (data ?? []) as unknown as PolicyAcknowledgement[];
    },
  });

  const versions = useQuery({
    queryKey: ["quality_policy_versions", companyId],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_policy_versions" as any)
        .select("*")
        .eq("company_id", companyId!)
        .order("version", { ascending: false });
      if (error) throw error;
      return (data ?? []) as unknown as PolicyVersion[];
    },
  });

  const myAck = (acks.data ?? []).find((a) => a.user_id === user?.id) ?? null;

  const acknowledge = useMutation({
    mutationFn: async () => {
      const payload: any = {
        company_id: companyId,
        user_id: user?.id,
        policy_version: policyVersion,
      };
      const { data, error } = await supabase
        .from("quality_policy_acknowledgements" as any)
        .insert(payload)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_policy_acks"] });
      toast({ title: "Ciência registrada" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const publish = useMutation({
    mutationFn: async (text: string) => {
      if (!isMaster) throw new Error("Apenas o Master pode publicar a Política da Qualidade.");
      const { data, error } = await supabase
        .from("quality_settings" as any)
        .update({
          quality_policy_text: text,
          quality_policy_version: policyVersion + 1,
          quality_policy_published_at: new Date().toISOString(),
        } as any)
        .eq("company_id", companyId!)
        .select()
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_settings"] });
      qc.invalidateQueries({ queryKey: ["quality_policy_acks"] });
      qc.invalidateQueries({ queryKey: ["quality_policy_versions"] });
      toast({ title: "Política publicada — versão atualizada e ciência zerada." });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return {
    policyText, policyVersion, publishedAt,
    acks: acks.data ?? [],
    versions: versions.data ?? [],
    myAck,
    needsAcknowledgement: !!policyText && !myAck,
    isMaster,
    acknowledge, publish, upsert,
  };
};
