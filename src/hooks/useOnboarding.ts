import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export const useOnboardingDocumentTypes = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: docTypes = [], isLoading } = useQuery({
    queryKey: ['onboarding-doc-types'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('onboarding_document_types')
        .select('*')
        .order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createDocType = useMutation({
    mutationFn: async (dt: { company_id: string; name: string; description?: string; is_required?: boolean; sort_order?: number }) => {
      const { data, error } = await (supabase as any)
        .from('onboarding_document_types')
        .insert(dt)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-doc-types'] });
      toast({ title: 'Tipo de documento criado' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao criar tipo', description: error.message, variant: 'destructive' });
    },
  });

  const deleteDocType = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any)
        .from('onboarding_document_types')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-doc-types'] });
      toast({ title: 'Tipo de documento removido' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' });
    },
  });

  return { docTypes, isLoading, createDocType, deleteDocType };
};

export const useOnboardingProcesses = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: processes = [], isLoading } = useQuery({
    queryKey: ['onboarding-processes'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('employee_onboarding')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createProcess = useMutation({
    mutationFn: async (p: { company_id: string; candidate_name: string; candidate_email: string; notes?: string; position_tag?: string | null }) => {
      const { data, error } = await (supabase as any)
        .from('employee_onboarding')
        .insert({ ...p, created_by: user!.id, status: 'pending' })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-processes'] });
      toast({ title: 'Processo de admissão criado' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao criar processo', description: error.message, variant: 'destructive' });
    },
  });

  const updateProcessStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const updates: any = { status, updated_at: new Date().toISOString() };
      if (status === 'completed') updates.completed_at = new Date().toISOString();
      const { error } = await (supabase as any)
        .from('employee_onboarding')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-processes'] });
      toast({ title: 'Status atualizado' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    },
  });

  return { processes, isLoading, createProcess, updateProcessStatus };
};

export const useOnboardingDocuments = (onboardingId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: documents = [], isLoading } = useQuery({
    queryKey: ['onboarding-documents', onboardingId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('onboarding_documents')
        .select(`
          *,
          document_type:onboarding_document_types!onboarding_documents_document_type_id_fkey(id, name, is_required)
        `)
        .eq('onboarding_id', onboardingId)
        .order('uploaded_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!onboardingId,
  });

  const uploadDocument = useMutation({
    mutationFn: async (doc: { onboarding_id: string; document_type_id: string; file_name: string; file_url: string }) => {
      const { data, error } = await (supabase as any)
        .from('onboarding_documents')
        .insert({ ...doc, uploaded_by: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-documents'] });
      toast({ title: 'Documento enviado' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao enviar documento', description: error.message, variant: 'destructive' });
    },
  });

  const reviewDocument = useMutation({
    mutationFn: async ({ id, status, rejection_reason }: { id: string; status: string; rejection_reason?: string }) => {
      const { error } = await (supabase as any)
        .from('onboarding_documents')
        .update({
          status,
          rejection_reason: rejection_reason || null,
          reviewed_at: new Date().toISOString(),
          reviewed_by: user!.id,
        })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['onboarding-documents'] });
      toast({ title: 'Documento revisado' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao revisar', description: error.message, variant: 'destructive' });
    },
  });

  return { documents, isLoading, uploadDocument, reviewDocument };
};

export const useMyOnboarding = () => {
  const { user } = useAuth();

  const { data: myOnboarding, isLoading } = useQuery({
    queryKey: ['my-onboarding', user?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('employee_onboarding')
        .select('*')
        .eq('user_id', user!.id)
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return { myOnboarding, isLoading };
};

// Public hook for candidate access via token (no auth required)
export const usePublicOnboarding = (token?: string) => {
  const queryClient = useQueryClient();

  const { data: onboarding, isLoading: loadingOnboarding, error } = useQuery({
    queryKey: ['public-onboarding', token],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('employee_onboarding')
        .select('*')
        .eq('access_token', token)
        .maybeSingle();
      if (error) throw error;
      return data;
    },
    enabled: !!token,
  });

  const { data: docTypes = [], isLoading: loadingTypes } = useQuery({
    queryKey: ['public-onboarding-doc-types', onboarding?.company_id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('onboarding_document_types')
        .select('*')
        .eq('company_id', onboarding.company_id)
        .order('sort_order');
      if (error) throw error;
      return data;
    },
    enabled: !!onboarding?.company_id,
  });

  const { data: documents = [], isLoading: loadingDocs } = useQuery({
    queryKey: ['public-onboarding-documents', onboarding?.id],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('onboarding_documents')
        .select(`
          *,
          document_type:onboarding_document_types!onboarding_documents_document_type_id_fkey(id, name, is_required)
        `)
        .eq('onboarding_id', onboarding.id)
        .order('uploaded_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!onboarding?.id,
  });

  const uploadDocument = useMutation({
    mutationFn: async (doc: { onboarding_id: string; document_type_id: string; file_name: string; file_url: string }) => {
      const { data, error } = await (supabase as any)
        .from('onboarding_documents')
        .insert(doc)
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['public-onboarding-documents'] });
    },
  });

  return {
    onboarding,
    docTypes,
    documents,
    isLoading: loadingOnboarding || loadingTypes || loadingDocs,
    error,
    uploadDocument,
  };
};
