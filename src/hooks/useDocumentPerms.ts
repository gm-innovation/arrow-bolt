import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface DocumentPerms {
  can_view: boolean;
  can_print: boolean;
  can_download: boolean;
}

const DEFAULT_PERMS: DocumentPerms = { can_view: true, can_print: true, can_download: true };

/**
 * Retorna as permissões efetivas do usuário corrente sobre o documento.
 * Default (sem regra explícita) é permissivo (Opção A) — alinhado ao comportamento histórico.
 * Director / super_admin / admin sempre retornam tudo true.
 */
export const useDocumentPerms = (documentId: string | undefined) => {
  const { user } = useAuth();

  const { data, isLoading } = useQuery({
    queryKey: ["quality_doc_user_perms", documentId, user?.id],
    enabled: !!user && !!documentId,
    queryFn: async (): Promise<DocumentPerms> => {
      const { data, error } = await supabase.rpc("quality_doc_user_perms" as any, {
        _document_id: documentId,
      });
      if (error) {
        console.warn("[quality] perms RPC failed, falling back to permissive default", error);
        return DEFAULT_PERMS;
      }
      const row = Array.isArray(data) ? data[0] : data;
      if (!row) return DEFAULT_PERMS;
      return {
        can_view: !!row.can_view,
        can_print: !!row.can_print,
        can_download: !!row.can_download,
      };
    },
  });

  return { perms: data ?? DEFAULT_PERMS, isLoading };
};
