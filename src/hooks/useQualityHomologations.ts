import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export type HomologationStatus =
  | "em_andamento"
  | "homologado"
  | "homologado_com_ressalvas"
  | "reprovado";

export interface QualityHomologation {
  id: string;
  company_id: string;
  cycle: string;
  homologated_by: string;
  status: HomologationStatus;
  notes: string | null;
  pdf_path: string | null;
  created_at: string;
  updated_at: string;
  signed_at: string | null;
}

const sanitize = (n: string) =>
  n.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_");

export const useQualityHomologations = () => {
  const { user, profile } = useAuth();
  const qc = useQueryClient();

  const list = useQuery({
    queryKey: ["quality_homologations", profile?.company_id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_homologations")
        .select("*")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data || []) as QualityHomologation[];
    },
    enabled: !!user && !!profile?.company_id,
  });

  const uploadPdf = async (homologationId: string, file: File) => {
    const ext = file.name.split(".").pop() || "pdf";
    const path = `homologations/${profile!.company_id}/${homologationId}_${Date.now()}.${sanitize(ext)}`;
    const { error: upErr } = await supabase.storage
      .from("quality-signatures")
      .upload(path, file, { cacheControl: "0", upsert: true, contentType: file.type || "application/pdf" });
    if (upErr) throw upErr;
    return path;
  };

  const create = useMutation({
    mutationFn: async (params: {
      cycle: string;
      status: HomologationStatus;
      notes?: string;
      file?: File | null;
      homologated_by?: string;
    }) => {
      if (!profile?.company_id) throw new Error("Empresa não encontrada");
      const insertPayload = {
        company_id: profile.company_id,
        cycle: params.cycle,
        status: params.status,
        notes: params.notes ?? null,
        homologated_by: params.homologated_by || user!.id,
      };
      const { data, error } = await supabase
        .from("quality_homologations")
        .insert(insertPayload)
        .select()
        .single();
      if (error) throw error;

      if (params.file) {
        const path = await uploadPdf(data.id, params.file);
        const { error: updErr } = await supabase
          .from("quality_homologations")
          .update({ pdf_path: path })
          .eq("id", data.id);
        if (updErr) throw updErr;
      }
      return data;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_homologations"] });
      toast({ title: "Homologação registrada" });
    },
    onError: (e: any) =>
      toast({ title: "Erro ao registrar", description: e.message, variant: "destructive" }),
  });

  const update = useMutation({
    mutationFn: async (params: {
      id: string;
      cycle?: string;
      status?: HomologationStatus;
      notes?: string | null;
      file?: File | null;
      sign?: boolean;
    }) => {
      const patch: Record<string, unknown> = {};
      if (params.cycle !== undefined) patch.cycle = params.cycle;
      if (params.status !== undefined) patch.status = params.status;
      if (params.notes !== undefined) patch.notes = params.notes;
      if (params.sign) patch.signed_at = new Date().toISOString();

      if (params.file) {
        const path = await uploadPdf(params.id, params.file);
        patch.pdf_path = path;
      }

      const { error } = await supabase
        .from("quality_homologations")
        .update(patch)
        .eq("id", params.id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_homologations"] });
      toast({ title: "Homologação atualizada" });
    },
    onError: (e: any) =>
      toast({ title: "Erro ao atualizar", description: e.message, variant: "destructive" }),
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from("quality_homologations").delete().eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_homologations"] });
      toast({ title: "Homologação removida" });
    },
    onError: (e: any) =>
      toast({ title: "Erro ao remover", description: e.message, variant: "destructive" }),
  });

  const getSignedUrl = async (path: string) => {
    const { data } = await supabase.storage
      .from("quality-signatures")
      .createSignedUrl(path, 600);
    return data?.signedUrl || null;
  };

  return { list, create, update, remove, getSignedUrl };
};
