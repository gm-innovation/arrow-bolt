import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface Opportunity {
  id: string;
  title: string;
  description: string | null;
  opportunity_type: string | null;
  stage: string;
  priority: string | null;
  estimated_value: number | null;
  probability: number | null;
  expected_close_date: string | null;
  closed_at: string | null;
  loss_reason: string | null;
  notes: string | null;
  client_id: string;
  buyer_id: string | null;
  assigned_to: string | null;
  company_id: string;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  client_name: string;
  buyer_name: string | null;
  assigned_name: string | null;
}

const getCompanyId = async (userId: string) => {
  const { data } = await supabase
    .from('profiles')
    .select('company_id')
    .eq('id', userId)
    .single();
  if (!data?.company_id) throw new Error('Empresa não encontrada');
  return data.company_id;
};

export const useOpportunities = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: opportunities = [], isLoading, error } = useQuery({
    queryKey: ['crm-opportunities', user?.id],
    queryFn: async () => {
      const companyId = await getCompanyId(user!.id);

      const { data, error } = await supabase
        .from('crm_opportunities')
        .select(`
          *,
          clients:client_id (name),
          crm_buyers:buyer_id (name),
          profiles:assigned_to (full_name)
        `)
        .eq('company_id', companyId)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return (data || []).map((o: any): Opportunity => ({
        ...o,
        client_name: o.clients?.name || 'N/A',
        buyer_name: o.crm_buyers?.name || null,
        assigned_name: o.profiles?.full_name || null,
      }));
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  const createOpportunity = useMutation({
    mutationFn: async (input: Record<string, any>) => {
      const companyId = await getCompanyId(user!.id);
      const { error } = await supabase.from('crm_opportunities').insert({
        ...input,
        company_id: companyId,
        created_by: user!.id,
      } as any);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['commercial-stats'] });
      toast.success('Oportunidade criada com sucesso');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateOpportunity = useMutation({
    mutationFn: async ({ id, ...updates }: Record<string, any>) => {
      const { error } = await supabase
        .from('crm_opportunities')
        .update(updates)
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['commercial-stats'] });
      toast.success('Oportunidade atualizada');
    },
    onError: (e: any) => toast.error(e.message),
  });

  const deleteOpportunity = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('crm_opportunities')
        .delete()
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-opportunities'] });
      queryClient.invalidateQueries({ queryKey: ['commercial-stats'] });
      toast.success('Oportunidade removida');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return {
    opportunities,
    isLoading,
    error,
    createOpportunity,
    updateOpportunity,
    deleteOpportunity,
  };
};

export const useOpportunityActivities = (opportunityId: string | null) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: activities = [], isLoading } = useQuery({
    queryKey: ['crm-activities', opportunityId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('crm_opportunity_activities')
        .select(`*, profiles:user_id (full_name)`)
        .eq('opportunity_id', opportunityId!)
        .order('activity_date', { ascending: false });
      if (error) throw error;
      return (data || []).map((a: any) => ({
        ...a,
        user_name: a.profiles?.full_name || 'Sistema',
      }));
    },
    enabled: !!opportunityId,
  });

  const addActivity = useMutation({
    mutationFn: async (input: { activity_type: string; description: string; activity_date?: string }) => {
      const { error } = await supabase.from('crm_opportunity_activities').insert({
        opportunity_id: opportunityId!,
        user_id: user!.id,
        activity_type: input.activity_type,
        description: input.description,
        activity_date: input.activity_date || new Date().toISOString(),
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['crm-activities', opportunityId] });
      toast.success('Atividade registrada');
    },
    onError: (e: any) => toast.error(e.message),
  });

  return { activities, isLoading, addActivity };
};
