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

// Novo hook que calcula produtividade em tempo real baseado em tasks e time_entries
export const useTechnicianProductivity = (dateRange?: { start: Date; end: Date }) => {
  const { user } = useAuth();

  const { data: productivityData, isLoading } = useQuery({
    queryKey: ['technician-productivity-realtime', user?.id, dateRange?.start, dateRange?.end],
    queryFn: async () => {
      if (!user?.id) return [];

      // Get user's company
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) return [];

      // Get all technicians in the company with their profiles
      const { data: technicians, error: techError } = await supabase
        .from('technicians')
        .select(`
          id,
          user_id,
          active,
          profile:profiles!technicians_user_id_fkey (
            full_name,
            avatar_url
          )
        `)
        .eq('company_id', profile.company_id)
        .eq('active', true);

      if (techError) throw techError;
      if (!technicians || technicians.length === 0) return [];

      const technicianIds = technicians.map(t => t.id);

      // Build tasks query with date filter
      let tasksQuery = supabase
        .from('tasks')
        .select('id, assigned_to, status, completed_at, created_at')
        .in('assigned_to', technicianIds);

      if (dateRange) {
        tasksQuery = tasksQuery
          .gte('created_at', dateRange.start.toISOString())
          .lte('created_at', dateRange.end.toISOString());
      }

      const { data: tasks, error: tasksError } = await tasksQuery;
      if (tasksError) throw tasksError;

      // Build time_entries query with date filter
      let timeEntriesQuery = supabase
        .from('time_entries')
        .select('id, technician_id, entry_date, start_time, end_time')
        .in('technician_id', technicianIds);

      if (dateRange) {
        timeEntriesQuery = timeEntriesQuery
          .gte('entry_date', dateRange.start.toISOString().split('T')[0])
          .lte('entry_date', dateRange.end.toISOString().split('T')[0]);
      }

      const { data: timeEntries, error: timeError } = await timeEntriesQuery;
      if (timeError) throw timeError;

      // Calculate productivity for each technician
      const productivityMap: Record<string, TechnicianProductivity> = {};

      for (const tech of technicians) {
        const techProfile = Array.isArray(tech.profile) ? tech.profile[0] : tech.profile;
        
        // Filter tasks for this technician
        const techTasks = tasks?.filter(t => t.assigned_to === tech.id) || [];
        const completedTasks = techTasks.filter(t => t.status === 'completed');
        
        // Calculate hours worked from time_entries
        const techTimeEntries = timeEntries?.filter(te => te.technician_id === tech.id) || [];
        let totalHours = 0;
        
        for (const entry of techTimeEntries) {
          const [startHour, startMin] = entry.start_time.split(':').map(Number);
          const [endHour, endMin] = entry.end_time.split(':').map(Number);
          const startMinutes = startHour * 60 + startMin;
          const endMinutes = endHour * 60 + endMin;
          const hours = (endMinutes - startMinutes) / 60;
          if (hours > 0) totalHours += hours;
        }

        // Calculate average task duration (time from creation to completion)
        let avgDuration = 0;
        const completedWithDates = completedTasks.filter(t => t.completed_at && t.created_at);
        if (completedWithDates.length > 0) {
          const totalDuration = completedWithDates.reduce((sum, task) => {
            const created = new Date(task.created_at);
            const completed = new Date(task.completed_at!);
            const durationHours = (completed.getTime() - created.getTime()) / (1000 * 60 * 60);
            return sum + durationHours;
          }, 0);
          avgDuration = totalDuration / completedWithDates.length;
        }

        // Calculate completion rate
        const completionRate = techTasks.length > 0 
          ? (completedTasks.length / techTasks.length) * 100 
          : 0;

        // Create mock snapshots for trend calculation (group by date)
        const tasksByDate: Record<string, { completed: number; assigned: number; hours: number }> = {};
        
        for (const task of techTasks) {
          const date = task.created_at.split('T')[0];
          if (!tasksByDate[date]) {
            tasksByDate[date] = { completed: 0, assigned: 0, hours: 0 };
          }
          tasksByDate[date].assigned++;
          if (task.status === 'completed') {
            tasksByDate[date].completed++;
          }
        }

        for (const entry of techTimeEntries) {
          const date = entry.entry_date;
          if (!tasksByDate[date]) {
            tasksByDate[date] = { completed: 0, assigned: 0, hours: 0 };
          }
          const [startHour, startMin] = entry.start_time.split(':').map(Number);
          const [endHour, endMin] = entry.end_time.split(':').map(Number);
          const hours = ((endHour * 60 + endMin) - (startHour * 60 + startMin)) / 60;
          if (hours > 0) tasksByDate[date].hours += hours;
        }

        const sortedDates = Object.keys(tasksByDate).sort();
        const snapshots: ProductivitySnapshot[] = sortedDates.map(date => ({
          id: `${tech.id}-${date}`,
          technician_id: tech.id,
          company_id: profile.company_id,
          snapshot_date: date,
          tasks_completed: tasksByDate[date].completed,
          tasks_assigned: tasksByDate[date].assigned,
          hours_worked: tasksByDate[date].hours,
          average_task_duration: null,
          satisfaction_avg: null,
          created_at: date,
        }));

        // Calculate trend based on recent vs older data
        let trend: 'up' | 'down' | 'stable' = 'stable';
        if (snapshots.length >= 4) {
          const mid = Math.floor(snapshots.length / 2);
          const firstHalf = snapshots.slice(0, mid);
          const secondHalf = snapshots.slice(mid);
          
          const firstHalfAvg = firstHalf.reduce((sum, s) => sum + (s.tasks_completed || 0), 0) / firstHalf.length;
          const secondHalfAvg = secondHalf.reduce((sum, s) => sum + (s.tasks_completed || 0), 0) / secondHalf.length;
          
          if (secondHalfAvg > firstHalfAvg * 1.1) trend = 'up';
          else if (secondHalfAvg < firstHalfAvg * 0.9) trend = 'down';
        }

        productivityMap[tech.id] = {
          technician_id: tech.id,
          technician_name: techProfile?.full_name || 'Técnico',
          avatar_url: techProfile?.avatar_url || null,
          total_tasks_completed: completedTasks.length,
          total_tasks_assigned: techTasks.length,
          total_hours_worked: totalHours,
          completion_rate: completionRate,
          avg_task_duration: avgDuration,
          avg_satisfaction: 0, // Would need satisfaction data from another source
          trend,
          snapshots,
        };
      }

      // Sort by completion rate descending
      return Object.values(productivityMap)
        .filter(p => p.total_tasks_assigned > 0 || p.total_hours_worked > 0)
        .sort((a, b) => b.completion_rate - a.completion_rate);
    },
    enabled: !!user?.id,
  });

  const productivity = productivityData || [];

  return {
    productivity,
    isLoading,
    totalTechnicians: productivity.length,
    averageCompletionRate: productivity.length > 0
      ? productivity.reduce((sum, t) => sum + t.completion_rate, 0) / productivity.length
      : 0,
  };
};
