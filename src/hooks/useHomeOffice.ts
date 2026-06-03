import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface HomeOfficeSchedule {
  id: string;
  company_id: string;
  technician_id: string;
  start_date: string;
  end_date: string;
  notes?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  technician?: {
    id: string;
    user_id: string;
    profiles?: { full_name: string };
  };
}

export interface CreateHomeOfficeData {
  technician_id: string;
  start_date: string;
  end_date: string;
  notes?: string;
}

export const useHomeOffice = (filters?: { startDate?: string; endDate?: string }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['home_office_schedules', filters],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user!.id)
        .maybeSingle();
      if (!profile?.company_id) return [];

      let q = (supabase as any)
        .from('home_office_schedules')
        .select(`
          *,
          technician:technicians(id, user_id, profiles:profiles(full_name))
        `)
        .eq('company_id', profile.company_id)
        .order('start_date', { ascending: false });

      if (filters?.startDate) q = q.gte('end_date', filters.startDate);
      if (filters?.endDate) q = q.lte('start_date', filters.endDate);

      const { data, error } = await q;
      if (error) throw error;
      return (data || []) as HomeOfficeSchedule[];
    },
    enabled: !!user,
  });

  const create = useMutation({
    mutationFn: async (data: CreateHomeOfficeData) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user!.id)
        .maybeSingle();
      if (!profile?.company_id) throw new Error('Empresa não encontrada');
      const { error } = await (supabase as any)
        .from('home_office_schedules')
        .insert({ ...data, company_id: profile.company_id, created_by: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['home_office_schedules'] });
      toast({ title: 'Home Office agendado' });
    },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...rest }: Partial<HomeOfficeSchedule> & { id: string }) => {
      const { error } = await (supabase as any).from('home_office_schedules').update(rest).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['home_office_schedules'] });
      toast({ title: 'Home Office atualizado' });
    },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('home_office_schedules').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['home_office_schedules'] });
      toast({ title: 'Home Office removido' });
    },
  });

  return {
    schedules: query.data || [],
    isLoading: query.isLoading,
    refetch: query.refetch,
    create,
    update,
    remove,
  };
};
