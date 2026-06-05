import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export type ComplaintStatus = "new" | "acknowledged" | "under_analysis" | "resolved" | "rejected";
export type ComplaintSource = "survey" | "email" | "phone" | "in_person" | "system" | "other";
export type ComplaintKind = "complaint" | "suggestion";

export interface ComplaintRow {
  id: string;
  company_id: string;
  complaint_number: number;
  client_id: string | null;
  is_anonymous: boolean;
  source: ComplaintSource;
  kind: ComplaintKind;
  title: string;
  description: string;
  received_at: string;
  acknowledged_at: string | null;
  resolved_at: string | null;
  status: ComplaintStatus;
  responsible_id: string | null;
  linked_ncr_id: string | null;
  resolution_notes: string | null;
  responder_name: string | null;
  responder_email: string | null;
  created_at: string;
  updated_at: string;
  client?: { id: string; company_name: string } | null;
}

export const useQualityComplaints = (kind?: ComplaintKind) => {
  const { user, profile } = useAuth();
  const qc = useQueryClient();

  const { data: complaints = [], isLoading } = useQuery({
    queryKey: ["quality_complaints", profile?.company_id],
    enabled: !!user && !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_complaints" as any)
        .select("*, client:clients(id,company_name)")
        .eq("company_id", profile!.company_id)
        .order("received_at", { ascending: false });
      if (error) throw error;
      return (data as any[]) as ComplaintRow[];
    },
  });

  const create = useMutation({
    mutationFn: async (input: {
      title: string;
      description: string;
      source: ComplaintSource;
      client_id?: string | null;
      is_anonymous?: boolean;
      responder_name?: string;
      responder_email?: string;
    }) => {
      if (!profile?.company_id) throw new Error("Empresa não encontrada");
      const { data, error } = await supabase
        .from("quality_complaints" as any)
        .insert({
          company_id: profile.company_id,
          title: input.title,
          description: input.description,
          source: input.source,
          client_id: input.client_id ?? null,
          is_anonymous: input.is_anonymous ?? false,
          responder_name: input.responder_name ?? null,
          responder_email: input.responder_email ?? null,
          created_by: user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      return data as any;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_complaints"] });
      toast({ title: "Reclamação registrada" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async ({ id, patch }: { id: string; patch: Partial<ComplaintRow> }) => {
      const { error } = await supabase.from("quality_complaints" as any).update(patch as any).eq("id", id);
      if (error) throw error;
    },
    onSuccess: (_d, vars) => {
      qc.invalidateQueries({ queryKey: ["quality_complaints"] });
      qc.invalidateQueries({ queryKey: ["quality_complaint", vars.id] });
      toast({ title: "Reclamação atualizada" });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  const convertToNcr = useMutation({
    mutationFn: async (complaintId: string) => {
      const { data, error } = await supabase.rpc("quality_complaint_to_ncr" as any, {
        p_complaint_id: complaintId,
      });
      if (error) throw error;
      return data as string;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_complaints"] });
      qc.invalidateQueries({ queryKey: ["quality_ncrs"] });
      toast({ title: "Convertido em NCR", description: "A reclamação foi vinculada a uma nova NCR." });
    },
    onError: (e: any) => toast({ title: "Erro", description: e.message, variant: "destructive" }),
  });

  return { complaints, isLoading, create, update, convertToNcr };
};

export const useQualityComplaint = (id?: string) => {
  return useQuery({
    queryKey: ["quality_complaint", id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_complaints" as any)
        .select("*, client:clients(id,company_name)")
        .eq("id", id)
        .maybeSingle();
      if (error) throw error;
      return data as any as ComplaintRow | null;
    },
  });
};
