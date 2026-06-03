import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface EpiItem {
  id: string;
  company_id: string;
  name: string;
  size?: string | null;
  description?: string | null;
  min_stock: number;
  current_stock: number;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface EpiDelivery {
  id: string;
  company_id: string;
  epi_item_id: string;
  recipient_profile_id: string;
  quantity: number;
  delivered_at: string;
  expires_at?: string | null;
  notes?: string | null;
  signature_url?: string | null;
  created_at: string;
  epi_item?: { name: string };
  recipient?: { full_name: string };
}

export const useEPI = () => {
  const { user } = useAuth();
  const { toast } = useToast();
  const qc = useQueryClient();

  const itemsQuery = useQuery({
    queryKey: ['epi_items'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('epi_items')
        .select('*')
        .order('name');
      if (error) throw error;
      return (data || []) as EpiItem[];
    },
    enabled: !!user,
  });

  const deliveriesQuery = useQuery({
    queryKey: ['epi_deliveries'],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('epi_deliveries')
        .select('*, epi_item:epi_items(name), recipient:profiles!epi_deliveries_recipient_profile_id_fkey(full_name)')
        .order('delivered_at', { ascending: false });
      if (error) throw error;
      return (data || []) as EpiDelivery[];
    },
    enabled: !!user,
  });

  const createItem = useMutation({
    mutationFn: async (item: Partial<EpiItem>) => {
      const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user!.id).single();
      const { error } = await (supabase as any).from('epi_items').insert({ ...item, company_id: profile?.company_id, created_by: user!.id });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['epi_items'] }); toast({ title: 'EPI cadastrado' }); },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const updateItem = useMutation({
    mutationFn: async ({ id, ...rest }: Partial<EpiItem> & { id: string }) => {
      const { error } = await (supabase as any).from('epi_items').update(rest).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['epi_items'] }); toast({ title: 'EPI atualizado' }); },
  });

  const deleteItem = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await (supabase as any).from('epi_items').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['epi_items'] }); toast({ title: 'EPI removido' }); },
  });

  const createDelivery = useMutation({
    mutationFn: async (d: Partial<EpiDelivery>) => {
      const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user!.id).single();
      const { error } = await (supabase as any).from('epi_deliveries').insert({ ...d, company_id: profile?.company_id, created_by: user!.id });
      if (error) throw error;
    },
    onSuccess: () => { qc.invalidateQueries({ queryKey: ['epi_deliveries'] }); toast({ title: 'Entrega registrada' }); },
    onError: (e: Error) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  return {
    items: itemsQuery.data || [],
    deliveries: deliveriesQuery.data || [],
    isLoading: itemsQuery.isLoading || deliveriesQuery.isLoading,
    createItem, updateItem, deleteItem, createDelivery,
  };
};
