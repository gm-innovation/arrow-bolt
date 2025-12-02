import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface CoordinatorProductivity {
  coordinator_id: string;
  coordinator_name: string;
  avatar_url: string | null;
  total_orders: number;
  completed_orders: number;
  in_progress_orders: number;
  pending_orders: number;
  completion_rate: number;
  avg_completion_time: number;
  trend: 'up' | 'down' | 'stable';
  monthly_data: { month: string; created: number; completed: number }[];
}

export const useCoordinatorProductivity = (dateRange?: { start: Date; end: Date }) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['coordinator-productivity', user?.id, dateRange?.start, dateRange?.end],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get user's company
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) return [];

      // Get coordinators (admins) in the company
      const { data: coordinators } = await supabase
        .from('user_roles')
        .select('user_id')
        .eq('role', 'admin');

      if (!coordinators || coordinators.length === 0) return [];

      const coordinatorIds = coordinators.map(c => c.user_id);

      // Get coordinator profiles
      const { data: coordinatorProfiles } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url')
        .eq('company_id', profile.company_id)
        .in('id', coordinatorIds);

      if (!coordinatorProfiles || coordinatorProfiles.length === 0) return [];

      // Build query for service orders
      let query = supabase
        .from('service_orders')
        .select('*')
        .eq('company_id', profile.company_id);

      if (dateRange) {
        query = query
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString());
      }

      const { data: orders, error } = await query;
      if (error) throw error;

      // Group orders by coordinator
      const productivityMap: Record<string, CoordinatorProductivity> = {};

      for (const coord of coordinatorProfiles) {
        const coordOrders = orders?.filter(o => o.created_by === coord.id) || [];
        const completedOrders = coordOrders.filter(o => o.status === 'completed');
        const inProgressOrders = coordOrders.filter(o => o.status === 'in_progress');
        const pendingOrders = coordOrders.filter(o => o.status === 'pending');

        // Calculate average completion time
        let avgCompletionTime = 0;
        const ordersWithTime = completedOrders.filter(o => o.completed_date && o.created_at);
        if (ordersWithTime.length > 0) {
          const totalTime = ordersWithTime.reduce((sum, o) => {
            const created = new Date(o.created_at);
            const completed = new Date(o.completed_date!);
            return sum + (completed.getTime() - created.getTime()) / (1000 * 60 * 60 * 24);
          }, 0);
          avgCompletionTime = totalTime / ordersWithTime.length;
        }

        // Calculate monthly data for trend
        const monthlyData: Record<string, { created: number; completed: number }> = {};
        coordOrders.forEach(o => {
          const month = new Date(o.created_at).toISOString().slice(0, 7);
          if (!monthlyData[month]) {
            monthlyData[month] = { created: 0, completed: 0 };
          }
          monthlyData[month].created++;
          if (o.status === 'completed') {
            monthlyData[month].completed++;
          }
        });

        const sortedMonths = Object.keys(monthlyData).sort();
        const monthlyDataArray = sortedMonths.slice(-6).map(month => ({
          month,
          ...monthlyData[month],
        }));

        // Calculate trend
        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (monthlyDataArray.length >= 2) {
          const lastMonth = monthlyDataArray[monthlyDataArray.length - 1];
          const prevMonth = monthlyDataArray[monthlyDataArray.length - 2];
          if (lastMonth.completed > prevMonth.completed * 1.1) trend = 'up';
          else if (lastMonth.completed < prevMonth.completed * 0.9) trend = 'down';
        }

        productivityMap[coord.id] = {
          coordinator_id: coord.id,
          coordinator_name: coord.full_name,
          avatar_url: coord.avatar_url,
          total_orders: coordOrders.length,
          completed_orders: completedOrders.length,
          in_progress_orders: inProgressOrders.length,
          pending_orders: pendingOrders.length,
          completion_rate: coordOrders.length > 0 
            ? (completedOrders.length / coordOrders.length) * 100 
            : 0,
          avg_completion_time: avgCompletionTime,
          trend,
          monthly_data: monthlyDataArray,
        };
      }

      // Sort by completion rate
      return Object.values(productivityMap)
        .filter(c => c.total_orders > 0)
        .sort((a, b) => b.completion_rate - a.completion_rate);
    },
    enabled: !!user?.id,
  });
};
