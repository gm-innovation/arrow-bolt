import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { differenceInDays, isPast, parseISO } from 'date-fns';

interface CriticalOrder {
  id: string;
  order_number: string;
  status: string;
  scheduled_date: string | null;
  created_at: string;
  vessel_name: string | null;
  client_name: string | null;
  created_by_name: string | null;
  days_overdue?: number;
  issue_type: 'overdue' | 'long_in_progress' | 'no_schedule';
}

export const useCriticalOrders = () => {
  const { user } = useAuth();

  const { data: criticalOrders = [], isLoading } = useQuery({
    queryKey: ['critical-orders', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data: profileData } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profileData?.company_id) return [];

      const { data: orders, error } = await supabase
        .from('service_orders')
        .select(`
          id,
          order_number,
          status,
          scheduled_date,
          created_at,
          vessels:vessel_id (name),
          clients:client_id (name),
          created_by_profile:created_by (full_name)
        `)
        .eq('company_id', profileData.company_id)
        .neq('status', 'completed')
        .neq('status', 'cancelled')
        .order('scheduled_date', { ascending: true, nullsFirst: false });

      if (error) throw error;

      const today = new Date();
      const critical: CriticalOrder[] = [];

      orders?.forEach((order: any) => {
        // Check for overdue orders
        if (order.scheduled_date && order.status !== 'completed') {
          const scheduledDate = parseISO(order.scheduled_date);
          if (isPast(scheduledDate)) {
            const daysOverdue = differenceInDays(today, scheduledDate);
            critical.push({
              id: order.id,
              order_number: order.order_number,
              status: order.status,
              scheduled_date: order.scheduled_date,
              created_at: order.created_at,
              vessel_name: order.vessels?.name || null,
              client_name: order.clients?.name || null,
              created_by_name: order.created_by_profile?.full_name || null,
              days_overdue: daysOverdue,
              issue_type: 'overdue',
            });
          }
        }

        // Check for orders in progress for too long (more than 7 days)
        if (order.status === 'in_progress') {
          const createdDate = parseISO(order.created_at);
          const daysInProgress = differenceInDays(today, createdDate);
          if (daysInProgress > 7) {
            critical.push({
              id: order.id,
              order_number: order.order_number,
              status: order.status,
              scheduled_date: order.scheduled_date,
              created_at: order.created_at,
              vessel_name: order.vessels?.name || null,
              client_name: order.clients?.name || null,
              created_by_name: order.created_by_profile?.full_name || null,
              days_overdue: daysInProgress,
              issue_type: 'long_in_progress',
            });
          }
        }

        // Check for pending orders without schedule
        if (order.status === 'pending' && !order.scheduled_date) {
          const createdDate = parseISO(order.created_at);
          const daysPending = differenceInDays(today, createdDate);
          if (daysPending > 3) {
            critical.push({
              id: order.id,
              order_number: order.order_number,
              status: order.status,
              scheduled_date: order.scheduled_date,
              created_at: order.created_at,
              vessel_name: order.vessels?.name || null,
              client_name: order.clients?.name || null,
              created_by_name: order.created_by_profile?.full_name || null,
              days_overdue: daysPending,
              issue_type: 'no_schedule',
            });
          }
        }
      });

      return critical;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    refetchInterval: 1000 * 60 * 15, // Refetch every 15 minutes
  });

  return {
    criticalOrders,
    isLoading,
    criticalCount: criticalOrders.length,
  };
};
