import { useMemo } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";
import { differenceInDays, parseISO } from "date-fns";

export const SAFETY_TYPE_PREFIXES = [
  "PCMSO",
  "PGR",
  "LTCAT",
  "NR01",
  "FICHA_EPI",
  "ASO",
  "LAUDO_SST",
];

export const useQualitySafetyDocuments = () => {
  const { user, profile } = useAuth();
  const qc = useQueryClient();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["quality_documents_safety", profile?.company_id],
    enabled: !!user && !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_documents")
        .select("*, document_type:quality_document_types(id, code_prefix, name)")
        .eq("company_id", profile!.company_id)
        .eq("origin", "safety" as any)
        .order("code");
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const { data: types = [] } = useQuery({
    queryKey: ["quality_document_types_safety", profile?.company_id],
    enabled: !!user && !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_document_types")
        .select("id, code_prefix, name")
        .eq("company_id", profile!.company_id)
        .in("code_prefix", SAFETY_TYPE_PREFIXES);
      if (error) throw error;
      return (data ?? []) as any[];
    },
  });

  const hasSafetyTypes = (types ?? []).length >= SAFETY_TYPE_PREFIXES.length;

  const seedTypes = useMutation({
    mutationFn: async () => {
      if (!profile?.company_id) throw new Error("Empresa não encontrada");
      const { error } = await supabase.rpc("quality_seed_safety_document_types" as any, {
        p_company_id: profile.company_id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_document_types_safety"] });
      qc.invalidateQueries({ queryKey: ["quality_document_types"] });
      toast({ title: "Tipos de S&S cadastrados" });
    },
    onError: (e: any) =>
      toast({ title: "Erro ao cadastrar tipos", description: e.message, variant: "destructive" }),
  });

  const enriched = useMemo(() => {
    return (documents as any[]).map((d) => {
      const due = d.validity_end ?? d.next_review_date ?? null;
      let status: "expired" | "expiring" | "ok" | "none" = "none";
      let daysRemaining: number | null = null;
      if (due) {
        daysRemaining = differenceInDays(parseISO(due), new Date());
        if (daysRemaining < 0) status = "expired";
        else if (daysRemaining <= 30) status = "expiring";
        else status = "ok";
      }
      return { ...d, due_date: due, computed_status: status, days_remaining: daysRemaining };
    });
  }, [documents]);

  const expired = enriched.filter((d) => d.computed_status === "expired");
  const expiringSoon = enriched.filter((d) => d.computed_status === "expiring");
  const active = enriched.filter((d) => d.computed_status === "ok");
  const noDate = enriched.filter((d) => d.computed_status === "none");

  return {
    documents: enriched,
    types,
    hasSafetyTypes,
    seedTypes,
    expired,
    expiringSoon,
    active,
    noDate,
    isLoading,
  };
};
