import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Partnership {
  id: string;
  company_id: string;
  name: string;
  category?: string | null;
  description?: string | null;
  benefit?: string | null;
  contact?: string | null;
  link?: string | null;
  logo_url?: string | null;
  valid_from?: string | null;
  valid_until?: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export const usePartnerships = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const query = useQuery({
    queryKey: ['hr_partnerships'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('hr_partnerships')
        .select('*')
        .order('name');
      if (error) throw error;
      return (data || []) as Partnership[];
    },
    enabled: !!user,
  });

  const create = useMutation({
    mutationFn: async (p: Partial<Partnership>) => {
      const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user!.id).single();
      const { error } = await (supabase as any).from('hr_partnerships').insert({ ...p, company_id: profile?.company_id, created_by: user!.id });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hr_partnerships'] }); toast({ title: 'Parceria cadastrada' }); },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const update = useMutation({
    mutationFn: async ({ id, ...rest }: Partial<Partnership> & { id: string }) => {
      const { error } = await (supabase as any).from('hr_partnerships').update(rest).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hr_partnerships'] }); toast({ title: 'Parceria atualizada' }); },
  });

  const remove = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('hr_partnerships').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['hr_partnerships'] }); toast({ title: 'Parceria removida' }); },
  });

  return { partnerships: query.data || [], isLoading: query.isLoading, create, update, remove };
};
