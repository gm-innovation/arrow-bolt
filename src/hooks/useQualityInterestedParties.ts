import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export type QIPRelevance = "alta" | "media" | "baixa";
export type QIPStatus = "ativo" | "inativo";
export type QIPCategory =
  | "cliente"
  | "fornecedor"
  | "orgao_regulador"
  | "sociedade"
  | "colaborador"
  | "acionista"
  | "parceiro"
  | "outro";

export interface QualityInterestedParty {
  id: string;
  company_id: string;
  name: string;
  category: QIPCategory;
  needs_expectations: string | null;
  monitoring_method: string | null;
  relevance: QIPRelevance;
  owner_user_id: string | null;
  status: QIPStatus;
  review_frequency_months: number | null;
  last_reviewed_at: string | null;
  last_reviewed_by: string | null;
  last_review_notes: string | null;
  next_review_due_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface QualityPartyEvidence {
  id: string;
  party_id: string;
  title: string;
  description: string | null;
  evidence_type: string;
  document_id: string | null;
  external_file_path: string | null;
  evidence_date: string | null;
  valid_until: string | null;
  uploaded_by: string | null;
  created_at: string;
  updated_at: string;
}

const TABLE = "quality_interested_parties" as const;
const EV_TABLE = "quality_interested_party_evidences" as const;

export const useQualityInterestedParties = () => {
  const { user, profile } = useAuth();
  const qc = useQueryClient();

  const { data: parties = [], isLoading } = useQuery({
    queryKey: ["quality_interested_parties", profile?.company_id],
    enabled: !!user && !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(TABLE as any)
        .select("*")
        .eq("company_id", profile!.company_id)
        .order("name");
      if (error) throw error;
      return (data as unknown) as QualityInterestedParty[];
    },
  });

  const { data: latestEvidences = [] } = useQuery({
    queryKey: ["quality_party_evidences_latest", profile?.company_id],
    enabled: !!user && !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(EV_TABLE as any)
        .select("id, party_id, title, evidence_type, evidence_date, valid_until, created_at")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown) as Pick<
        QualityPartyEvidence,
        "id" | "party_id" | "title" | "evidence_type" | "evidence_date" | "valid_until" | "created_at"
      >[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: Partial<QualityInterestedParty> & { name: string; category: QIPCategory }) => {
      if (!profile?.company_id) throw new Error("Empresa não encontrada");
      const payload: any = {
        company_id: profile.company_id,
        name: input.name,
        category: input.category,
        needs_expectations: input.needs_expectations ?? null,
        monitoring_method: input.monitoring_method ?? null,
        relevance: input.relevance ?? "media",
        owner_user_id: input.owner_user_id ?? null,
        status: input.status ?? "ativo",
        review_frequency_months: input.review_frequency_months ?? null,
        created_by: user!.id,
      };
      const { data, error } = await supabase.from(TABLE as any).insert(payload).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_interested_parties"] });
      toast({ title: "Parte interessada criada" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...changes }: Partial<QualityInterestedParty> & { id: string }) => {
      const { data, error } = await supabase.from(TABLE as any).update(changes).eq("id", id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_interested_parties"] });
      qc.invalidateQueries({ queryKey: ["quality_alerts"] });
      toast({ title: "Atualizado" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from(TABLE as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_interested_parties"] });
      toast({ title: "Removido" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const markReviewed = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes?: string | null }) => {
      const { error } = await supabase
        .from(TABLE as any)
        .update({
          last_reviewed_at: new Date().toISOString(),
          last_reviewed_by: user!.id,
          last_review_notes: notes ?? null,
        })
        .eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_interested_parties"] });
      qc.invalidateQueries({ queryKey: ["quality_alerts"] });
      toast({ title: "Revisão registrada" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return { parties, latestEvidences, isLoading, create, update, remove, markReviewed };
};

export const usePartyEvidences = (partyId: string | undefined) => {
  const { user, profile } = useAuth();
  const qc = useQueryClient();

  const { data: evidences = [], isLoading } = useQuery({
    queryKey: ["quality_party_evidences", partyId],
    enabled: !!user && !!partyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from(EV_TABLE as any)
        .select("*")
        .eq("party_id", partyId!)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data as unknown) as QualityPartyEvidence[];
    },
  });

  const invalidate = () => {
    qc.invalidateQueries({ queryKey: ["quality_party_evidences", partyId] });
    qc.invalidateQueries({ queryKey: ["quality_party_evidences_latest"] });
    qc.invalidateQueries({ queryKey: ["quality_alerts"] });
  };

  const create = useMutation({
    mutationFn: async (input: {
      title: string;
      description?: string | null;
      evidence_type: string;
      document_id?: string | null;
      evidence_date?: string | null;
      valid_until?: string | null;
      file?: File | null;
    }) => {
      if (!partyId || !profile?.company_id) throw new Error("Parâmetros inválidos");
      let external_file_path: string | null = null;
      if (input.file) {
        const safeName = input.file.name.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9.\-_]/g, "_");
        const path = `${profile.company_id}/interested_parties/${partyId}/${Date.now()}_${safeName}`;
        const { error: upErr } = await supabase.storage.from("quality-evidences").upload(path, input.file);
        if (upErr) throw upErr;
        external_file_path = path;
      }
      const { data, error } = await supabase
        .from(EV_TABLE as any)
        .insert({
          party_id: partyId,
          title: input.title,
          description: input.description ?? null,
          evidence_type: input.evidence_type,
          document_id: input.document_id ?? null,
          evidence_date: input.evidence_date ?? null,
          valid_until: input.valid_until ?? null,
          external_file_path,
          uploaded_by: user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Evidência registrada" });
    },
    onError: (e: any) => toast({ title: "Erro ao registrar evidência", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (ev: QualityPartyEvidence) => {
      if (ev.external_file_path) {
        await supabase.storage.from("quality-evidences").remove([ev.external_file_path]);
      }
      const { error } = await supabase.from(EV_TABLE as any).delete().eq("id", ev.id);
      if (error) throw error;
    },
    onSuccess: () => {
      invalidate();
      toast({ title: "Evidência removida" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return { evidences, isLoading, create, remove };
};
