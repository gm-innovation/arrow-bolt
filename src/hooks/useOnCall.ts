import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface OnCall {
  id: string;
  technician_id: string;
  company_id: string;
  on_call_date: string;
  start_time: string;
  end_time: string;
  is_holiday: boolean;
  is_weekend: boolean;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  technician?: {
    id: string;
    user_id: string;
    profiles?: {
      full_name: string;
    };
  };
}

export interface CreateOnCallData {
  technician_id: string;
  on_call_date: string;
  start_time?: string;
  end_time?: string;
  is_holiday?: boolean;
  is_weekend?: boolean;
  notes?: string;
}

export const useOnCall = (filters?: { technicianId?: string; startDate?: string; endDate?: string }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: onCallList, isLoading, refetch } = useQuery({
    queryKey: ['on-call', filters],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.company_id) return [];

      let query = supabase
        .from('technician_on_call')
        .select(`
          *,
          technician:technicians(
            id,
            user_id,
            profiles:profiles(full_name)
          )
        `)
        .eq('company_id', profile.company_id)
        .order('on_call_date', { ascending: true });

      if (filters?.technicianId) {
        query = query.eq('technician_id', filters.technicianId);
      }

      if (filters?.startDate) {
        query = query.gte('on_call_date', filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte('on_call_date', filters.endDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as OnCall[];
    },
    enabled: !!user,
  });

  const createOnCall = useMutation({
    mutationFn: async (data: CreateOnCallData) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.company_id) throw new Error('Company not found');

      const { data: result, error } = await supabase
        .from('technician_on_call')
        .insert({
          ...data,
          company_id: profile.company_id,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast({ title: 'Sobreaviso agendado com sucesso' });
      queryClient.invalidateQueries({ queryKey: ['on-call'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao agendar sobreaviso', description: error.message, variant: 'destructive' });
    },
  });

  const updateOnCall = useMutation({
    mutationFn: async ({ id, ...data }: Partial<CreateOnCallData> & { id: string }) => {
      const { error } = await supabase
        .from('technician_on_call')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Sobreaviso atualizado com sucesso' });
      queryClient.invalidateQueries({ queryKey: ['on-call'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar sobreaviso', description: error.message, variant: 'destructive' });
    },
  });

  const deleteOnCall = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('technician_on_call')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Sobreaviso removido com sucesso' });
      queryClient.invalidateQueries({ queryKey: ['on-call'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao remover sobreaviso', description: error.message, variant: 'destructive' });
    },
  });

  return {
    onCallList: onCallList || [],
    isLoading,
    refetch,
    createOnCall,
    updateOnCall,
    deleteOnCall,
  };
};
