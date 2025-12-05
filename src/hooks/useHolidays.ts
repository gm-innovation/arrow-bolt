import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Holiday {
  id: string;
  company_id: string;
  holiday_date: string;
  name: string;
  is_recurring: boolean;
  created_by?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateHolidayData {
  holiday_date: string;
  name: string;
  is_recurring?: boolean;
}

export const useHolidays = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: holidays, isLoading, refetch } = useQuery({
    queryKey: ['holidays'],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.company_id) return [];

      const { data, error } = await supabase
        .from('company_holidays')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('holiday_date', { ascending: true });

      if (error) throw error;
      return data as Holiday[];
    },
    enabled: !!user,
  });

  const createHoliday = useMutation({
    mutationFn: async (data: CreateHolidayData) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.company_id) throw new Error('Company not found');

      const { data: result, error } = await supabase
        .from('company_holidays')
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
      toast({ title: 'Feriado cadastrado com sucesso' });
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao cadastrar feriado', description: error.message, variant: 'destructive' });
    },
  });

  const updateHoliday = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Holiday> & { id: string }) => {
      const { error } = await supabase
        .from('company_holidays')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Feriado atualizado com sucesso' });
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar feriado', description: error.message, variant: 'destructive' });
    },
  });

  const deleteHoliday = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('company_holidays')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Feriado removido com sucesso' });
      queryClient.invalidateQueries({ queryKey: ['holidays'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao remover feriado', description: error.message, variant: 'destructive' });
    },
  });

  return {
    holidays: holidays || [],
    isLoading,
    refetch,
    createHoliday,
    updateHoliday,
    deleteHoliday,
  };
};
