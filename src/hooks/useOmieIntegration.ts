import { useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";

async function invokeOmie(action: string, params?: any) {
  const { data, error } = await supabase.functions.invoke("omie-proxy", {
    body: { action, params },
  });
  if (error) {
    // Try to extract real error message from edge function response
    let msg = error.message || "Erro ao chamar Omie";
    try {
      if ((error as any).context) {
        const body = await (error as any).context.json();
        if (body?.error) msg = body.error;
      }
    } catch {}
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}

export const useOmieIntegration = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: companyOmie, isLoading: isLoadingConfig } = useQuery({
    queryKey: ["omie-config", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return null;
      const { data, error } = await supabase
        .from("companies")
        .select("omie_app_key, omie_app_secret, omie_sync_enabled")
        .eq("id", profile.company_id)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id,
  });

  const saveCredentials = useMutation({
    mutationFn: async (params: { app_key: string; app_secret: string; sync_enabled: boolean }) => {
      return invokeOmie("save_credentials", params);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["omie-config"] });
      toast.success("Credenciais Omie salvas com sucesso");
    },
    onError: (err: any) => toast.error(err.message),
  });

  const testConnection = useMutation({
    mutationFn: () => invokeOmie("test_connection"),
    onSuccess: (data) => toast.success(`Conexão OK! ${data.total_clients} clientes encontrados.`),
    onError: (err: any) => toast.error("Falha na conexão: " + err.message),
  });

  const syncClients = useMutation({
    mutationFn: () => invokeOmie("sync_clients"),
    onSuccess: (data) => {
      toast.success(`${data.synced} clientes sincronizados`);
      queryClient.invalidateQueries({ queryKey: ["clients"] });
    },
    onError: (err: any) => toast.error("Erro na sincronização: " + err.message),
  });

  const consultOrder = useMutation({
    mutationFn: (params: { nCodOS?: number; cCodIntOS?: string; cNumOS?: string }) =>
      invokeOmie("consult_order", params),
    onError: (err: any) => toast.error("Erro ao consultar OS: " + err.message),
  });

  const attachFile = useMutation({
    mutationFn: (params: {
      nCodOS: number;
      cCodIntOS?: string;
      cNomeArquivo: string;
      cConteudoBase64: string;
      cMimeType?: string;
    }) => invokeOmie("attach_file", params),
    onSuccess: () => toast.success("Arquivo enviado ao Omie com sucesso"),
    onError: (err: any) => toast.error("Erro ao enviar arquivo: " + err.message),
  });

  return {
    companyOmie,
    isLoadingConfig,
    isOmieEnabled: !!companyOmie?.omie_sync_enabled,
    hasCredentials: !!companyOmie?.omie_app_key && !!companyOmie?.omie_app_secret,
    saveCredentials,
    testConnection,
    syncClients,
    consultOrder,
    attachFile,
  };
};
