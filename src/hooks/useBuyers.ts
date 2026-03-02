import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Buyer {
  id: string;
  name: string;
  role: string | null;
  email: string | null;
  phone: string | null;
  influence_level: string | null;
  notes: string | null;
  client_id: string;
  company_id: string;
  client_name: string;
  created_at: string;
}

export const useBuyers = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const getCompanyId = async () => {
    const { data } = await supabase
      .from('profiles')
      .select('company_id')
      .eq('id', user!.id)
      .single();
    if (!data?.company_id) throw new Error('Empresa não encontrada');
    return data.company_id;
  };

  const { data: buyers = [], isLoading } = useQuery({
    queryKey: ['crm-buyers', user?.id],
    queryFn: async () => {
      const companyId = await getCompanyId();
      const { data, error } = await supabase
        .from('crm_buyers')
        .select(`*, clients:client_id (name)`)
        .eq('company_id', companyId)
        .order('name');
      if (error) throw error;
      return (data || []).map((b: any): Buyer => ({
        ...b,
        client_name: b.clients?.name || 'N/A',
      }));
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  const createBuyer = useMutation({
    mutationFn: async (input: Record<string, any>) => {
      const companyId = await getCompanyId();
      const { error } = await supabase.from('crm_buyers').insert({ ...input, company_id: companyId } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-buyers'] });
      toast.success('Comprador criado com sucesso');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateBuyer = useMutation({
    mutationFn: async ({ id, ...updates }: Record<string, any>) => {
      const { error } = await supabase.from('crm_buyers').update(updates).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-buyers'] });
      toast.success('Comprador atualizado');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteBuyer = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('crm_buyers').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-buyers'] });
      toast.success('Comprador removido');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { buyers, isLoading, createBuyer, updateBuyer, deleteBuyer };
};
