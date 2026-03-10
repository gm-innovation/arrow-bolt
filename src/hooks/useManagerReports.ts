import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfMonth, endOfMonth, format } from 'date-fns';

interface ReportFilters {
  startDate?: Date;
  endDate?: Date;
  coordinatorId?: string | null;
}

export const useManagerReports = (filters: ReportFilters = {}) => {
  const { user } = useAuth();

  // Fetch consolidated metrics
  const { data: metrics, isLoading: metricsLoading } = useQuery({
    queryKey: ['manager-metrics', user?.id, filters],
    queryFn: async () => {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profileData?.company_id) throw new Error('Empresa não encontrada');

      // Build query with filters
      let ordersQuery = supabase
        .from('service_orders')
        .select('id, status, created_by, created_at, completed_date')
        .eq('company_id', profileData.company_id);

      if (filters.startDate) {
        ordersQuery = ordersQuery.gte('created_at', filters.startDate.toISOString());
      }
      if (filters.endDate) {
        ordersQuery = ordersQuery.lte('created_at', filters.endDate.toISOString());
      }
      if (filters.coordinatorId) {
        ordersQuery = ordersQuery.eq('created_by', filters.coordinatorId);
      }

      const { data: orders, error: ordersError } = await ordersQuery;
      if (ordersError) throw ordersError;

      // Calculate metrics
      const totalOrders = orders?.length || 0;
      const completedOrders = orders?.filter(o => o.status === 'completed').length || 0;
      const inProgressOrders = orders?.filter(o => o.status === 'in_progress').length || 0;
      const pendingOrders = orders?.filter(o => o.status === 'pending').length || 0;
      const cancelledOrders = orders?.filter(o => o.status === 'cancelled').length || 0;
      const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

      // Calculate average completion time
      const completedWithDates = orders?.filter(o => 
        o.status === 'completed' && o.created_at && o.completed_date
      ) || [];
      
      const avgCompletionTime = completedWithDates.length > 0 
        ? completedWithDates.reduce((acc, order) => {
            const created = new Date(order.created_at).getTime();
            const completed = new Date(order.completed_date!).getTime();
            return acc + (completed - created);
          }, 0) / completedWithDates.length / (1000 * 60 * 60 * 24) // Convert to days
        : 0;

      return {
        totalOrders,
        completedOrders,
        inProgressOrders,
        pendingOrders,
        cancelledOrders,
        completionRate: Math.round(completionRate),
        avgCompletionTime: Math.round(avgCompletionTime),
      };
    },
    enabled: !!user?.id,
  });

  // Fetch coordinator comparison data
  const { data: coordinatorComparison, isLoading: coordinatorsLoading } = useQuery({
    queryKey: ['coordinator-comparison', user?.id, filters],
    queryFn: async () => {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profileData?.company_id) throw new Error('Empresa não encontrada');

      // Get all coordinators (admins)
      const { data: adminRoles } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'coordinator');

      if (!adminRoles) return [];

      const adminIds = adminRoles.map(r => r.user_id);

      const { data: coordinators } = await supabase
        .from('profiles')
        .select('id, full_name')
        .eq('company_id', profileData.company_id)
        .in('id', adminIds);

      if (!coordinators) return [];

      // Get orders for each coordinator
      const coordinatorStats = await Promise.all(
        coordinators.map(async (coordinator) => {
          let ordersQuery = supabase
            .from('service_orders')
            .select('id, status, created_at, completed_date')
            .eq('company_id', profileData.company_id)
            .eq('created_by', coordinator.id);

          if (filters.startDate) {
            ordersQuery = ordersQuery.gte('created_at', filters.startDate.toISOString());
          }
          if (filters.endDate) {
            ordersQuery = ordersQuery.lte('created_at', filters.endDate.toISOString());
          }

          const { data: orders } = await ordersQuery;

          const totalOrders = orders?.length || 0;
          const completedOrders = orders?.filter(o => o.status === 'completed').length || 0;
          const inProgressOrders = orders?.filter(o => o.status === 'in_progress').length || 0;
          const pendingOrders = orders?.filter(o => o.status === 'pending').length || 0;
          const completionRate = totalOrders > 0 ? (completedOrders / totalOrders) * 100 : 0;

          return {
            coordinator_name: coordinator.full_name,
            coordinator_id: coordinator.id,
            total_orders: totalOrders,
            completed_orders: completedOrders,
            in_progress_orders: inProgressOrders,
            pending_orders: pendingOrders,
            completion_rate: Math.round(completionRate),
          };
        })
      );

      return coordinatorStats.sort((a, b) => b.total_orders - a.total_orders);
    },
    enabled: !!user?.id,
  });

  // Fetch monthly trend data
  const { data: monthlyTrend, isLoading: trendLoading } = useQuery({
    queryKey: ['monthly-trend', user?.id, filters],
    queryFn: async () => {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profileData?.company_id) throw new Error('Empresa não encontrada');

      let ordersQuery = supabase
        .from('service_orders')
        .select('created_at, status')
        .eq('company_id', profileData.company_id)
        .order('created_at', { ascending: true });

      if (filters.coordinatorId) {
        ordersQuery = ordersQuery.eq('created_by', filters.coordinatorId);
      }

      const { data: orders } = await ordersQuery;
      if (!orders) return [];

      // Group by month
      const monthlyData: { [key: string]: { created: number; completed: number } } = {};
      
      orders.forEach(order => {
        const month = format(new Date(order.created_at), 'yyyy-MM');
        if (!monthlyData[month]) {
          monthlyData[month] = { created: 0, completed: 0 };
        }
        monthlyData[month].created++;
        if (order.status === 'completed') {
          monthlyData[month].completed++;
        }
      });

      // Convert to array and get last 6 months
      const result = Object.entries(monthlyData)
        .map(([month, data]) => ({
          month,
          created: data.created,
          completed: data.completed,
        }))
        .slice(-6);

      return result;
    },
    enabled: !!user?.id,
  });

  return {
    metrics,
    coordinatorComparison,
    monthlyTrend,
    isLoading: metricsLoading || coordinatorsLoading || trendLoading,
  };
};
