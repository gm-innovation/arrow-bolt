import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export const useCorpDocuments = (filters?: { document_type?: string; owner_user_id?: string }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['corp-documents', filters],
    queryFn: async () => {
      let query = supabase
        .from('corp_documents')
        .select(`
          *,
          owner:profiles!corp_documents_owner_user_id_fkey(id, full_name, email),
          uploader:profiles!corp_documents_uploaded_by_fkey(id, full_name)
        `)
        .order('created_at', { ascending: false });

      if (filters?.document_type) query = query.eq('document_type', filters.document_type);
      if (filters?.owner_user_id) query = query.eq('owner_user_id', filters.owner_user_id);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const uploadDocument = useMutation({
    mutationFn: async (doc: {
      company_id: string; owner_user_id: string; document_type: string;
      title: string; file_name: string; file_url: string;
      related_request_id?: string; visibility_level?: string;
    }) => {
      const { data, error } = await supabase
        .from('corp_documents')
        .insert({ ...doc, uploaded_by: user!.id })
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corp-documents'] });
      toast({ title: 'Documento enviado com sucesso' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao enviar documento', description: error.message, variant: 'destructive' });
    },
  });

  const deleteDocument = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('corp_documents').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corp-documents'] });
      toast({ title: 'Documento removido' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao remover documento', description: error.message, variant: 'destructive' });
    },
  });

  return { documents, isLoading, uploadDocument, deleteDocument };
};
