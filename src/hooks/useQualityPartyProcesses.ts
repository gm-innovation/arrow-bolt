import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export type PartyProcessRelevance = "low" | "medium" | "high";
export type PartyProcessRelationship =
  | "cliente"
  | "fornecedor"
  | "fiscaliza"
  | "recebe_informacao"
  | "executa"
  | "impacta"
  | "influencia";

export const RELATIONSHIP_LABELS: Record<PartyProcessRelationship, string> = {
  cliente: "Cliente",
  fornecedor: "Fornecedor",
  fiscaliza: "Fiscaliza",
  recebe_informacao: "Recebe informação",
  executa: "Executa",
  impacta: "Impacta",
  influencia: "Influencia",
};

export const RELEVANCE_LABELS: Record<PartyProcessRelevance, string> = {
  low: "Baixa",
  medium: "Média",
  high: "Alta",
};

export interface PartyProcessLink {
  party_id: string;
  process_id: string;
  relevance: PartyProcessRelevance;
  relationship_type: PartyProcessRelationship;
  company_id: string;
  created_at: string;
}

const TABLE = "quality_interested_party_processes" as const;

export const usePartyProcessLinks = (partyId?: string | null) => {
  const { user, profile } = useAuth();
  const qc = useQueryClient();

  const { data: links = [], isLoading } = useQuery({
    queryKey: ["party_process_links", partyId],
    enabled: !!user && !!partyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE as any)
        .select("*, process:quality_processes(id,name,type,status)")
        .eq("party_id", partyId!);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });

  const link = useMutation({
    mutationFn: async (input: {
      process_id: string;
      relevance: PartyProcessRelevance;
      relationship_type: PartyProcessRelationship;
    }) => {
      if (!partyId || !profile?.company_id) throw new Error("Parâmetros inválidos");
      const { error } = await supabase.from(TABLE as any).upsert(
        {
          party_id: partyId,
          process_id: input.process_id,
          relevance: input.relevance,
          relationship_type: input.relationship_type,
          company_id: profile.company_id,
          created_by: user?.id ?? null,
        } as any,
        { onConflict: "party_id,process_id" },
      );
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["party_process_links", partyId] });
      qc.invalidateQueries({ queryKey: ["process_party_links"] });
      toast({ title: "Vínculo salvo" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const unlink = useMutation({
    mutationFn: async (process_id: string) => {
      if (!partyId) throw new Error("Sem parte");
      const { error } = await supabase
        .from(TABLE as any)
        .delete()
        .eq("party_id", partyId)
        .eq("process_id", process_id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["party_process_links", partyId] });
      qc.invalidateQueries({ queryKey: ["process_party_links"] });
      toast({ title: "Vínculo removido" });
    },
  });

  return { links, isLoading, link, unlink };
};

export const useProcessPartyLinks = (processId?: string | null) => {
  const { user } = useAuth();
  const { data: links = [], isLoading } = useQuery({
    queryKey: ["process_party_links", processId],
    enabled: !!user && !!processId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE as any)
        .select("*, party:quality_interested_parties(id,name,category,relevance)")
        .eq("process_id", processId!);
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });
  return { links, isLoading };
};

export const useProcessLinkedDocuments = (processId?: string | null) => {
  const { user } = useAuth();
  const { data: documents = [], isLoading } = useQuery({
    queryKey: ["process_linked_documents", processId],
    enabled: !!user && !!processId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_documents" as any)
        .select("id, code, title, status, next_review_date, process_id")
        .eq("process_id", processId!)
        .order("code");
      if (error) throw error;
      return (data as any[]) ?? [];
    },
  });
  return { documents, isLoading };
};
