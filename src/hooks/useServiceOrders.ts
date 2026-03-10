import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useServiceOrders = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: orders = [], isLoading, error } = useQuery({
    queryKey: ['service-orders', user?.id],
    queryFn: async () => {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profileData?.company_id) throw new Error('Empresa não encontrada');

      const { data, error } = await supabase
        .from('service_orders')
        .select(`
          id,
          order_number,
          client_reference,
          status,
          scheduled_date,
          created_at,
          created_by,
          vessels:vessel_id (
            name
          ),
          clients:client_id (
            name
          ),
          created_by_profile:created_by (
            full_name
          )
        `)
        .eq('company_id', profileData.company_id)
        .order('created_at', { ascending: false });

      if (error) throw error;

      return data?.map((order: any) => ({
        id: order.id,
        orderNumber: order.order_number,
        vessel: order.vessels?.name || 'N/A',
        client: order.clients?.name || 'N/A',
        status: order.status,
        scheduledDate: order.scheduled_date,
        createdAt: order.created_at,
        createdBy: order.created_by,
        createdByName: order.created_by_profile?.full_name || 'N/A',
      })) || [];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['service-orders'] });
  };

  return {
    orders,
    isLoading,
    error,
    invalidate,
  };
};
