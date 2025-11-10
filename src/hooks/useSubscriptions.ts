import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface SubscriptionData {
  id: string;
  company_name: string;
  email: string | null;
  phone: string | null;
  subscription_plan: 'basic' | 'professional' | 'enterprise' | null;
  payment_status: 'paid' | 'pending' | 'overdue' | null;
  created_at: string;
}

export const useSubscriptions = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: subscriptions = [], isLoading, error } = useQuery({
    queryKey: ['subscriptions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('id, name, email, phone, subscription_plan, payment_status, created_at')
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formatted: SubscriptionData[] = data?.map((company) => ({
        id: company.id,
        company_name: company.name,
        email: company.email,
        phone: company.phone,
        subscription_plan: company.subscription_plan,
        payment_status: company.payment_status,
        created_at: company.created_at,
      })) || [];

      return formatted;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });

  const updatePlan = async (
    companyId: string,
    plan: 'basic' | 'professional' | 'enterprise'
  ) => {
    try {
      const { error } = await supabase
        .from('companies')
        .update({ subscription_plan: plan })
        .eq('id', companyId);

      if (error) throw error;

      toast.success('Plano atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      return { success: true };
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar plano');
      return { success: false, error };
    }
  };

  const updatePaymentStatus = async (
    companyId: string,
    status: 'paid' | 'pending' | 'overdue'
  ) => {
    try {
      const { error } = await supabase
        .from('companies')
        .update({ payment_status: status })
        .eq('id', companyId);

      if (error) throw error;

      toast.success('Status de pagamento atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      return { success: true };
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar status de pagamento');
      return { success: false, error };
    }
  };

  const cancelSubscription = async (companyId: string) => {
    try {
      const { error } = await supabase
        .from('companies')
        .update({
          subscription_plan: null,
          payment_status: 'pending',
        })
        .eq('id', companyId);

      if (error) throw error;

      toast.success('Assinatura cancelada com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
      queryClient.invalidateQueries({ queryKey: ['companies'] });
      return { success: true };
    } catch (error: any) {
      toast.error(error.message || 'Erro ao cancelar assinatura');
      return { success: false, error };
    }
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['subscriptions'] });
  };

  return {
    subscriptions,
    isLoading,
    error,
    updatePlan,
    updatePaymentStatus,
    cancelSubscription,
    invalidate,
  };
};
