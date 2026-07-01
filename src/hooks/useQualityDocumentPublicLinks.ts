import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export interface QualityDocumentPublicLink {
  id: string;
  company_id: string;
  document_id: string;
  token: string;
  expires_at: string;
  max_uses: number | null;
  access_count: number;
  revoked_at: string | null;
  revoked_by: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
}

const buildPublicUrl = (token: string) => `${window.location.origin}/q/${token}`;

export const useQualityDocumentPublicLinks = (documentId: string | undefined) => {
  const queryClient = useQueryClient();
  const { user, profile } = useAuth();

  const listQuery = useQuery({
    queryKey: ['quality-document-public-links', documentId],
    enabled: !!documentId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('quality_document_public_links')
        .select('*')
        .eq('document_id', documentId!)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as QualityDocumentPublicLink[];
    },
  });

  const createLink = useMutation({
    mutationFn: async ({
      expiresInDays,
      maxUses,
    }: {
      expiresInDays: number;
      maxUses: number | null;
    }) => {
      if (!documentId) throw new Error('document_id ausente');
      if (!user?.id) throw new Error('Não autenticado');
      const companyId = profile?.company_id;
      if (!companyId) throw new Error('Empresa não identificada');

      const expiresAt = new Date();
      expiresAt.setDate(expiresAt.getDate() + expiresInDays);

      const { data, error } = await supabase
        .from('quality_document_public_links')
        .insert({
          document_id: documentId,
          company_id: companyId,
          expires_at: expiresAt.toISOString(),
          max_uses: maxUses,
          created_by: user.id,
        })
        .select('*')
        .single();

      if (error) throw error;
      return data as QualityDocumentPublicLink;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ['quality-document-public-links', documentId],
      });
      const url = buildPublicUrl(data.token);
      navigator.clipboard?.writeText(url).catch(() => {});
      toast({
        title: 'Link público gerado',
        description: 'URL copiada para a área de transferência.',
      });
    },
    onError: (err: any) => {
      toast({
        title: 'Falha ao gerar link',
        description: err?.message ?? 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });

  const revokeLink = useMutation({
    mutationFn: async (linkId: string) => {
      if (!user?.id) throw new Error('Não autenticado');
      const { error } = await supabase
        .from('quality_document_public_links')
        .update({ revoked_at: new Date().toISOString(), revoked_by: user.id })
        .eq('id', linkId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['quality-document-public-links', documentId],
      });
      toast({ title: 'Link revogado' });
    },
    onError: (err: any) => {
      toast({
        title: 'Falha ao revogar',
        description: err?.message ?? 'Erro desconhecido',
        variant: 'destructive',
      });
    },
  });

  return {
    links: listQuery.data ?? [],
    isLoading: listQuery.isLoading,
    createLink,
    revokeLink,
    buildPublicUrl,
  };
};
