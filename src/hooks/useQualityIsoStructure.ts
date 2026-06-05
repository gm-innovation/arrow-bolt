import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface QualityReferenceNorm {
  id: string;
  company_id: string;
  code: string;
  title: string;
  issuer: string | null;
  valid_from: string | null;
  valid_until: string | null;
  document_id: string | null;
  notes: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface QualityTerm {
  id: string;
  company_id: string;
  term: string;
  definition: string;
  source_norm_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface QualityOrgContext {
  id: string;
  company_id: string;
  internal_issues: string | null;
  external_issues: string | null;
  applicable_scope: string | null;
  review_frequency_months: number | null;
  last_reviewed_at: string | null;
  last_reviewed_by: string | null;
  last_review_notes: string | null;
  next_review_due_at: string | null;
  created_at: string;
  updated_at: string;
}

// ============== Normas ==============
export const useQualityReferenceNorms = () => {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const key = ["quality_reference_norms", profile?.company_id];

  const { data: norms = [], isLoading } = useQuery({
    queryKey: key,
    enabled: !!user && !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_reference_norms" as any)
        .select("*")
        .order("code");
      if (error) throw error;
      return (data as unknown as QualityReferenceNorm[]) ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async (input: Partial<QualityReferenceNorm>) => {
      if (!profile?.company_id) throw new Error("Empresa não encontrada");
      const { data, error } = await supabase
        .from("quality_reference_norms" as any)
        .insert({ ...input, company_id: profile.company_id, created_by: user?.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast({ title: "Norma cadastrada" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...changes }: Partial<QualityReferenceNorm> & { id: string }) => {
      const { data, error } = await supabase
        .from("quality_reference_norms" as any)
        .update(changes as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast({ title: "Norma atualizada" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quality_reference_norms" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast({ title: "Norma removida" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return { norms, isLoading, create, update, remove };
};

// ============== Termos ==============
export const useQualityTerms = () => {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const key = ["quality_terms", profile?.company_id];

  const { data: terms = [], isLoading } = useQuery({
    queryKey: key,
    enabled: !!user && !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_terms" as any)
        .select("*")
        .order("term");
      if (error) throw error;
      return (data as unknown as QualityTerm[]) ?? [];
    },
  });

  const create = useMutation({
    mutationFn: async (input: Partial<QualityTerm>) => {
      if (!profile?.company_id) throw new Error("Empresa não encontrada");
      const { data, error } = await supabase
        .from("quality_terms" as any)
        .insert({ ...input, company_id: profile.company_id, created_by: user?.id } as any)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast({ title: "Termo cadastrado" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...changes }: Partial<QualityTerm> & { id: string }) => {
      const { data, error } = await supabase
        .from("quality_terms" as any)
        .update(changes as any)
        .eq("id", id)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quality_terms" as any).delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast({ title: "Termo removido" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return { terms, isLoading, create, update, remove };
};

// ============== Contexto da Organização ==============
export const useQualityOrgContext = () => {
  const { user, profile } = useAuth();
  const qc = useQueryClient();
  const key = ["quality_org_context", profile?.company_id];

  const { data: context, isLoading } = useQuery({
    queryKey: key,
    enabled: !!user && !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_org_context" as any)
        .select("*")
        .eq("company_id", profile!.company_id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as QualityOrgContext | null;
    },
  });

  const upsert = useMutation({
    mutationFn: async (patch: Partial<QualityOrgContext>) => {
      if (!profile?.company_id) throw new Error("Empresa não encontrada");
      const payload = { ...patch, company_id: profile.company_id };
      const { data, error } = await supabase
        .from("quality_org_context" as any)
        .upsert(payload as any, { onConflict: "company_id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast({ title: "Contexto atualizado" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const markReviewed = useMutation({
    mutationFn: async (notes: string) => {
      if (!profile?.company_id) throw new Error("Empresa não encontrada");
      const payload = {
        company_id: profile.company_id,
        last_reviewed_at: new Date().toISOString(),
        last_reviewed_by: user?.id ?? null,
        last_review_notes: notes || null,
      };
      const { data, error } = await supabase
        .from("quality_org_context" as any)
        .upsert(payload as any, { onConflict: "company_id" })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: key });
      toast({ title: "Marcado como revisado" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return { context, isLoading, upsert, markReviewed };
};
