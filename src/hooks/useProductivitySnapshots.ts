import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface ProductivitySnapshot {
  id: string;
  technician_id: string;
  company_id: string;
  snapshot_date: string;
  tasks_completed: number | null;
  tasks_assigned: number | null;
  hours_worked: number | null;
  average_task_duration: number | null;
  satisfaction_avg: number | null;
  created_at: string | null;
  technician?: {
    id: string;
    user_id: string;
    profile?: {
      full_name: string;
      avatar_url: string | null;
    };
  };
}

export interface TechnicianProductivity {
  technician_id: string;
  technician_name: string;
  avatar_url: string | null;
  total_tasks_completed: number;
  total_tasks_assigned: number;
  total_hours_worked: number;
  completion_rate: number;
  avg_task_duration: number;
  avg_satisfaction: number;
  trend: 'up' | 'down' | 'stable';
  snapshots: ProductivitySnapshot[];
}

export const useProductivitySnapshots = (dateRange?: { start: Date; end: Date }) => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['productivity-snapshots', user?.id, dateRange?.start, dateRange?.end],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get user's company
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) return [];

      let query = supabase
        .from('productivity_snapshots')
        .select(`
          *,
          technician:technicians (
            id,
            user_id,
            profile:profiles!technicians_user_id_fkey (
              full_name,
              avatar_url
            )
          )
        `)
        .eq('company_id', profile.company_id)
        .order('snapshot_date', { ascending: false });

      if (dateRange) {
        query = query
          .gte('snapshot_date', dateRange.start.toISOString().split('T')[0])
          .lte('snapshot_date', dateRange.end.toISOString().split('T')[0]);
      }

      const { data, error } = await query;
      if (error) throw error;

      return data as ProductivitySnapshot[];
    },
    enabled: !!user?.id,
  });
};

export const useTechnicianProductivity = (dateRange?: { start: Date; end: Date }) => {
  const { data: snapshots = [], isLoading } = useProductivitySnapshots(dateRange);

  // Group by technician and calculate aggregates
  const productivityByTechnician = snapshots.reduce((acc, snapshot) => {
    const techId = snapshot.technician_id;
    
    if (!acc[techId]) {
      const techProfile = Array.isArray(snapshot.technician?.profile) 
        ? snapshot.technician?.profile[0] 
        : snapshot.technician?.profile;
      
      acc[techId] = {
        technician_id: techId,
        technician_name: techProfile?.full_name || 'Técnico',
        avatar_url: techProfile?.avatar_url || null,
        total_tasks_completed: 0,
        total_tasks_assigned: 0,
        total_hours_worked: 0,
        completion_rate: 0,
        avg_task_duration: 0,
        avg_satisfaction: 0,
        trend: 'stable' as const,
        snapshots: [],
      };
    }

    acc[techId].total_tasks_completed += snapshot.tasks_completed || 0;
    acc[techId].total_tasks_assigned += snapshot.tasks_assigned || 0;
    acc[techId].total_hours_worked += snapshot.hours_worked || 0;
    acc[techId].snapshots.push(snapshot);

    return acc;
  }, {} as Record<string, TechnicianProductivity>);

  // Calculate rates and trends
  const productivityList = Object.values(productivityByTechnician).map((tech) => {
    // Completion rate
    tech.completion_rate = tech.total_tasks_assigned > 0
      ? (tech.total_tasks_completed / tech.total_tasks_assigned) * 100
      : 0;

    // Average task duration
    const durations = tech.snapshots
      .filter(s => s.average_task_duration !== null)
      .map(s => s.average_task_duration!);
    tech.avg_task_duration = durations.length > 0
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : 0;

    // Average satisfaction
    const satisfactions = tech.snapshots
      .filter(s => s.satisfaction_avg !== null)
      .map(s => s.satisfaction_avg!);
    tech.avg_satisfaction = satisfactions.length > 0
      ? satisfactions.reduce((a, b) => a + b, 0) / satisfactions.length
      : 0;

    // Trend calculation (compare first half vs second half)
    if (tech.snapshots.length >= 2) {
      const mid = Math.floor(tech.snapshots.length / 2);
      const firstHalf = tech.snapshots.slice(0, mid);
      const secondHalf = tech.snapshots.slice(mid);

      const firstHalfAvg = firstHalf.reduce((sum, s) => sum + (s.tasks_completed || 0), 0) / firstHalf.length;
      const secondHalfAvg = secondHalf.reduce((sum, s) => sum + (s.tasks_completed || 0), 0) / secondHalf.length;

      if (secondHalfAvg > firstHalfAvg * 1.1) {
        tech.trend = 'up';
      } else if (secondHalfAvg < firstHalfAvg * 0.9) {
        tech.trend = 'down';
      }
    }

    return tech;
  });

  // Sort by completion rate
  productivityList.sort((a, b) => b.completion_rate - a.completion_rate);

  return {
    productivity: productivityList,
    isLoading,
    totalTechnicians: productivityList.length,
    averageCompletionRate: productivityList.length > 0
      ? productivityList.reduce((sum, t) => sum + t.completion_rate, 0) / productivityList.length
      : 0,
  };
};
