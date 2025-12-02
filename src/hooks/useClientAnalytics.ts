import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface ClientFilters {
  startDate?: Date;
  endDate?: Date;
  clientId?: string | null;
}

export interface ClientStats {
  client_id: string;
  client_name: string;
  total_orders: number;
  completed_orders: number;
  in_progress_orders: number;
  pending_orders: number;
  completion_rate: number;
  total_revenue: number;
  avg_ticket: number;
}

export interface ServiceTypeStats {
  service_type: string;
  count: number;
  percentage: number;
}

export const useClientAnalytics = (filters: ClientFilters = {}) => {
  const { user } = useAuth();

  // Fetch client statistics
  const { data: clientStats, isLoading: clientsLoading } = useQuery({
    queryKey: ['client-analytics', user?.id, filters],
    queryFn: async () => {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profileData?.company_id) throw new Error('Empresa não encontrada');

      // Get all clients for the company
      const { data: clients } = await supabase
        .from('clients')
        .select('id, name')
        .eq('company_id', profileData.company_id);

      if (!clients) return [];

      // Get orders for each client
      const clientStatsData = await Promise.all(
        clients.map(async (client) => {
          let ordersQuery = supabase
            .from('service_orders')
            .select('id, status, created_at')
            .eq('company_id', profileData.company_id)
            .eq('client_id', client.id);

          if (filters.startDate) {
            ordersQuery = ordersQuery.gte('created_at', filters.startDate.toISOString());
          }
          if (filters.endDate) {
            ordersQuery = ordersQuery.lte('created_at', filters.endDate.toISOString());
          }

          const { data: orders } = await ordersQuery;

          // Get measurements for revenue calculation
          const orderIds = orders?.map(o => o.id) || [];
          let totalRevenue = 0;

          if (orderIds.length > 0) {
            const { data: measurements } = await supabase
              .from('measurements')
              .select('total_amount')
              .in('service_order_id', orderIds)
              .eq('status', 'finalized');

            totalRevenue = measurements?.reduce((sum, m) => sum + (m.total_amount || 0), 0) || 0;
          }

          const totalOrders = orders?.length || 0;
          const completedOrders = orders?.filter(o => o.status === 'completed').length || 0;
          const inProgressOrders = orders?.filter(o => o.status === 'in_progress').length || 0;
          const pendingOrders = orders?.filter(o => o.status === 'pending').length || 0;
          const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;
          const avgTicket = totalOrders > 0 ? totalRevenue / totalOrders : 0;

          return {
            client_id: client.id,
            client_name: client.name,
            total_orders: totalOrders,
            completed_orders: completedOrders,
            in_progress_orders: inProgressOrders,
            pending_orders: pendingOrders,
            completion_rate: Math.round(completionRate),
            total_revenue: totalRevenue,
            avg_ticket: Math.round(avgTicket * 100) / 100,
          };
        })
      );

      return clientStatsData
        .filter(c => c.total_orders > 0)
        .sort((a, b) => b.total_orders - a.total_orders);
    },
    enabled: !!user?.id,
  });

  // Fetch service type statistics
  const { data: serviceTypes, isLoading: servicesLoading } = useQuery({
    queryKey: ['service-type-analytics', user?.id, filters],
    queryFn: async () => {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profileData?.company_id) throw new Error('Empresa não encontrada');

      // Get task types with task counts
      const { data: taskTypes } = await supabase
        .from('task_types')
        .select('id, name')
        .eq('company_id', profileData.company_id);

      if (!taskTypes) return [];

      // Get task counts for each type
      let tasksQuery = supabase
        .from('tasks')
        .select(`
          id,
          task_type_id,
          service_orders!inner (
            company_id,
            created_at,
            client_id
          )
        `)
        .eq('service_orders.company_id', profileData.company_id);

      if (filters.startDate) {
        tasksQuery = tasksQuery.gte('service_orders.created_at', filters.startDate.toISOString());
      }
      if (filters.endDate) {
        tasksQuery = tasksQuery.lte('service_orders.created_at', filters.endDate.toISOString());
      }
      if (filters.clientId) {
        tasksQuery = tasksQuery.eq('service_orders.client_id', filters.clientId);
      }

      const { data: tasks } = await tasksQuery;

      // Count tasks per type
      const typeCountMap = new Map<string, number>();
      tasks?.forEach(task => {
        if (task.task_type_id) {
          typeCountMap.set(task.task_type_id, (typeCountMap.get(task.task_type_id) || 0) + 1);
        }
      });

      const totalTasks = tasks?.length || 0;

      const serviceTypeStats = taskTypes.map(type => ({
        service_type: type.name,
        count: typeCountMap.get(type.id) || 0,
        percentage: totalTasks > 0 ? Math.round(((typeCountMap.get(type.id) || 0) / totalTasks) * 100) : 0,
      })).filter(t => t.count > 0).sort((a, b) => b.count - a.count);

      return serviceTypeStats;
    },
    enabled: !!user?.id,
  });

  // Fetch overall metrics
  const { data: overallMetrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['client-overall-metrics', user?.id, filters],
    queryFn: async () => {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profileData?.company_id) throw new Error('Empresa não encontrada');

      // Get total clients with orders
      const { data: clients } = await supabase
        .from('clients')
        .select('id')
        .eq('company_id', profileData.company_id);

      // Get all measurements for revenue
      const { data: measurements } = await supabase
        .from('measurements')
        .select(`
          total_amount,
          service_orders!inner (
            company_id,
            created_at
          )
        `)
        .eq('service_orders.company_id', profileData.company_id)
        .eq('status', 'finalized');

      const totalRevenue = measurements?.reduce((sum, m) => sum + (m.total_amount || 0), 0) || 0;
      const totalMeasurements = measurements?.length || 0;
      const avgTicketGlobal = totalMeasurements > 0 ? totalRevenue / totalMeasurements : 0;

      return {
        totalClients: clients?.length || 0,
        totalRevenue,
        avgTicketGlobal: Math.round(avgTicketGlobal * 100) / 100,
        totalMeasurements,
      };
    },
    enabled: !!user?.id,
  });

  return {
    clientStats,
    serviceTypes,
    overallMetrics,
    isLoading: clientsLoading || servicesLoading || metricsLoading,
  };
};
