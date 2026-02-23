import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export const useCorpRequestTypes = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: requestTypes = [], isLoading } = useQuery({
    queryKey: ['corp-request-types'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('corp_request_types')
        .select('*, department:departments(id, name)')
        .eq('active', true)
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createRequestType = useMutation({
    mutationFn: async (type: {
      name: string; company_id: string; department_id?: string;
      requires_approval?: boolean; requires_director_approval?: boolean;
      director_threshold_value?: number; dynamic_fields?: any;
    }) => {
      const { data, error } = await supabase.from('corp_request_types').insert(type).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corp-request-types'] });
      toast({ title: 'Tipo de requisição criado' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao criar tipo', description: error.message, variant: 'destructive' });
    },
  });

  const updateRequestType = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase.from('corp_request_types').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corp-request-types'] });
      toast({ title: 'Tipo de requisição atualizado' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao atualizar tipo', description: error.message, variant: 'destructive' });
    },
  });

  return { requestTypes, isLoading, createRequestType, updateRequestType };
};
