import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface QualityNCR {
  id: string;
  company_id: string;
  ncr_number: number;
  title: string;
  description: string | null;
  ncr_type: string;
  severity: string;
  status: string;
  source: string | null;
  affected_area: string | null;
  root_cause: string | null;
  immediate_action: string | null;
  responsible_id: string | null;
  detected_by: string | null;
  detected_at: string | null;
  deadline: string | null;
  closed_at: string | null;
  closed_by: string | null;
  verification_notes: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  responsible?: { full_name: string } | null;
  detected_by_profile?: { full_name: string } | null;
}

export const useQualityNCRs = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: ncrs = [], isLoading } = useQuery({
    queryKey: ["quality-ncrs"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_ncrs")
        .select("*, responsible:profiles!quality_ncrs_responsible_id_fkey(full_name), detected_by_profile:profiles!quality_ncrs_detected_by_fkey(full_name)")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data as unknown as QualityNCR[];
    },
    enabled: !!user,
  });

  const createNCR = useMutation({
    mutationFn: async (values: {
      title: string;
      description?: string;
      ncr_type: string;
      severity: string;
      source?: string;
      affected_area?: string;
      immediate_action?: string;
      responsible_id?: string;
      deadline?: string;
    }) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user!.id)
        .single();

      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      const { error } = await supabase.from("quality_ncrs").insert({
        company_id: profile.company_id,
        title: values.title,
        description: values.description || null,
        ncr_type: values.ncr_type,
        severity: values.severity,
        source: values.source || null,
        affected_area: values.affected_area || null,
        immediate_action: values.immediate_action || null,
        responsible_id: values.responsible_id || null,
        deadline: values.deadline || null,
        detected_by: user!.id,
        created_by: user!.id,
        status: "open",
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quality-ncrs"] });
      toast({ title: "RNC criada com sucesso" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao criar RNC", description: error.message, variant: "destructive" });
    },
  });

  const updateNCR = useMutation({
    mutationFn: async ({ id, ...values }: { id: string; status?: string; root_cause?: string; verification_notes?: string; [key: string]: unknown }) => {
      if (values.status === "closed") {
        values.closed_at = new Date().toISOString();
        values.closed_by = user!.id;
      }
      const { error } = await supabase.from("quality_ncrs").update(values).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quality-ncrs"] });
      toast({ title: "RNC atualizada" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao atualizar RNC", description: error.message, variant: "destructive" });
    },
  });

  const deleteNCR = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quality_ncrs").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["quality-ncrs"] });
      toast({ title: "RNC excluída" });
    },
    onError: (error: Error) => {
      toast({ title: "Erro ao excluir", description: error.message, variant: "destructive" });
    },
  });

  return { ncrs, isLoading, createNCR, updateNCR, deleteNCR };
};
