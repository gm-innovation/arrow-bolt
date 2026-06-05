import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { toast } from "@/hooks/use-toast";

export interface QualitySignature {
  id: string;
  user_id: string;
  company_id: string;
  signature_image_path: string;
  full_name_snapshot: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

const sanitize = (n: string) =>
  n.normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9._-]/g, "_");

export const useQualitySignature = () => {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: signature, isLoading } = useQuery({
    queryKey: ["quality_signature", user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_signatures")
        .select("*")
        .eq("user_id", user!.id)
        .maybeSingle();
      if (error) throw error;
      return data as QualitySignature | null;
    },
    enabled: !!user,
  });

  const upload = useMutation({
    mutationFn: async (file: File) => {
      const { data: profile } = await supabase
        .from("profiles")
        .select("company_id, full_name")
        .eq("id", user!.id)
        .maybeSingle();
      if (!profile?.company_id) throw new Error("Empresa não encontrada");

      const ext = file.name.split(".").pop() || "png";
      const path = `${user!.id}/signature_${Date.now()}.${sanitize(ext)}`;
      const { error: upErr } = await supabase.storage
        .from("quality-signatures")
        .upload(path, file, { cacheControl: "0", upsert: true });
      if (upErr) throw upErr;

      const payload = {
        user_id: user!.id,
        company_id: profile.company_id,
        signature_image_path: path,
        full_name_snapshot: profile.full_name,
        is_active: true,
      };

      if (signature) {
        const { error } = await supabase
          .from("quality_signatures")
          .update(payload)
          .eq("id", signature.id);
        if (error) throw error;
      } else {
        const { error } = await supabase.from("quality_signatures").insert(payload);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["quality_signature"] });
      toast({ title: "Assinatura salva" });
    },
    onError: (e: any) => toast({ title: "Erro ao salvar assinatura", description: e.message, variant: "destructive" }),
  });

  const getSignedUrl = async (path: string) => {
    const { data } = await supabase.storage.from("quality-signatures").createSignedUrl(path, 600);
    return data?.signedUrl || null;
  };

  const registerSignatureEvent = async (params: {
    document_id?: string;
    version_id?: string;
    action: "approval" | "acknowledgment" | "review" | "closure" | "issuance" | "other";
    notes?: string;
  }) => {
    if (!signature) throw new Error("Cadastre sua assinatura antes");
    const { data: profile } = await supabase
      .from("profiles")
      .select("full_name")
      .eq("id", user!.id)
      .maybeSingle();
    const { data: roles } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", user!.id)
      .limit(1);
    const { data, error } = await supabase
      .from("quality_signature_events")
      .insert({
        document_id: params.document_id ?? null,
        version_id: params.version_id ?? null,
        user_id: user!.id,
        action: params.action,
        signature_image_path: signature.signature_image_path,
        full_name_snapshot: profile?.full_name || signature.full_name_snapshot,
        role_snapshot: roles?.[0]?.role || null,
        notes: params.notes ?? null,
      })
      .select()
      .single();
    if (error) throw error;
    return data;
  };

  return { signature, isLoading, upload, getSignedUrl, registerSignatureEvent };
};
