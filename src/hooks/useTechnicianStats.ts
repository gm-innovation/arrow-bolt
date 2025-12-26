import { useState, useEffect, useCallback } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface TechnicianStats {
  // Task counts
  assignedTasks: number;
  highPriorityTasks: number;
  completedThisWeek: number;
  completedLastWeek: number;
  totalCompleted: number;
  
  // Hours
  hoursThisWeek: number;
  hoursLastWeek: number;
  totalHoursWorked: number;
  
  // Reports
  reportsSubmitted: number;
  
  // Ratings
  averageRating: number | null;
  totalRatings: number;
  
  // Derived metrics
  completionRate: number;
  avgTaskDuration: number;
}

const initialStats: TechnicianStats = {
  assignedTasks: 0,
  highPriorityTasks: 0,
  completedThisWeek: 0,
  completedLastWeek: 0,
  totalCompleted: 0,
  hoursThisWeek: 0,
  hoursLastWeek: 0,
  totalHoursWorked: 0,
  reportsSubmitted: 0,
  averageRating: null,
  totalRatings: 0,
  completionRate: 0,
  avgTaskDuration: 0,
};

export function useTechnicianStats() {
  const { user } = useAuth();
  const [stats, setStats] = useState<TechnicianStats>(initialStats);
  const [loading, setLoading] = useState(true);
  const [technicianId, setTechnicianId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const calculateHoursFromEntries = (entries: { start_time: string; end_time: string }[] | null) => {
    if (!entries) return 0;
    let totalHours = 0;
    entries.forEach((entry) => {
      const [startHour, startMin] = entry.start_time.split(":").map(Number);
      const [endHour, endMin] = entry.end_time.split(":").map(Number);
      const hours = (endHour + endMin / 60) - (startHour + startMin / 60);
      if (hours > 0) totalHours += hours;
    });
    return totalHours;
  };

  const fetchStats = useCallback(async () => {
    if (!user?.id) return;

    try {
      setLoading(true);
      setError(null);

      // Get technician ID
      const { data: technician, error: techError } = await supabase
        .from("technicians")
        .select("id")
        .eq("user_id", user.id)
        .single();

      if (techError || !technician) {
        setLoading(false);
        return;
      }

      setTechnicianId(technician.id);

      // Date ranges
      const now = new Date();
      const weekStart = new Date(now);
      weekStart.setDate(weekStart.getDate() - weekStart.getDay());
      weekStart.setHours(0, 0, 0, 0);

      const lastWeekStart = new Date(weekStart);
      lastWeekStart.setDate(lastWeekStart.getDate() - 7);

      // Parallel queries for efficiency
      const [
        assignedTasksResult,
        completedThisWeekResult,
        completedLastWeekResult,
        totalAssignedResult,
        totalCompletedResult,
        timeEntriesThisWeekResult,
        timeEntriesLastWeekResult,
        allTimeEntriesResult,
        reportsResult,
        ratingsResult,
      ] = await Promise.all([
        // Assigned tasks (pending/in_progress)
        supabase
          .from("tasks")
          .select("priority, status")
          .eq("assigned_to", technician.id)
          .in("status", ["pending", "in_progress"]),

        // Completed this week
        supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("assigned_to", technician.id)
          .eq("status", "completed")
          .gte("completed_at", weekStart.toISOString()),

        // Completed last week
        supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("assigned_to", technician.id)
          .eq("status", "completed")
          .gte("completed_at", lastWeekStart.toISOString())
          .lt("completed_at", weekStart.toISOString()),

        // Total assigned (all time)
        supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("assigned_to", technician.id),

        // Total completed (all time)
        supabase
          .from("tasks")
          .select("id", { count: "exact", head: true })
          .eq("assigned_to", technician.id)
          .eq("status", "completed"),

        // Time entries this week
        supabase
          .from("time_entries")
          .select("start_time, end_time")
          .eq("technician_id", technician.id)
          .gte("entry_date", weekStart.toISOString().split("T")[0]),

        // Time entries last week
        supabase
          .from("time_entries")
          .select("start_time, end_time")
          .eq("technician_id", technician.id)
          .gte("entry_date", lastWeekStart.toISOString().split("T")[0])
          .lt("entry_date", weekStart.toISOString().split("T")[0]),

        // All time entries (for total hours)
        supabase
          .from("time_entries")
          .select("start_time, end_time")
          .eq("technician_id", technician.id),

        // Reports submitted
        supabase
          .from("task_reports")
          .select("id", { count: "exact", head: true })
          .eq("task.assigned_to", technician.id),

        // Ratings from task reports
        supabase
          .from("task_reports")
          .select(`
            report_data,
            task:tasks!task_reports_task_uuid_fkey (
              assigned_to
            )
          `)
          .eq("task.assigned_to", technician.id),
      ]);

      // Process results
      const assignedTasks = assignedTasksResult.data?.length || 0;
      const highPriorityTasks = assignedTasksResult.data?.filter(t => t.priority && t.priority >= 3).length || 0;
      const completedThisWeek = completedThisWeekResult.count || 0;
      const completedLastWeek = completedLastWeekResult.count || 0;
      const totalAssigned = totalAssignedResult.count || 0;
      const totalCompleted = totalCompletedResult.count || 0;

      const hoursThisWeek = calculateHoursFromEntries(timeEntriesThisWeekResult.data);
      const hoursLastWeek = calculateHoursFromEntries(timeEntriesLastWeekResult.data);
      const totalHoursWorked = calculateHoursFromEntries(allTimeEntriesResult.data);

      // Reports count - need a different approach since the join filter didn't work
      const { count: reportsCount } = await supabase
        .from("task_reports")
        .select("id, task:tasks!task_reports_task_uuid_fkey!inner(assigned_to)", { count: "exact", head: true })
        .eq("task.assigned_to", technician.id);

      const reportsSubmitted = reportsCount || 0;

      // Calculate average rating from satisfaction data
      let totalRating = 0;
      let ratingCount = 0;
      ratingsResult.data?.forEach((report) => {
        const reportData = report.report_data as Record<string, unknown>;
        if (reportData?.satisfaction) {
          const satisfaction = reportData.satisfaction as Record<string, unknown>;
          if (satisfaction?.rating && typeof satisfaction.rating === 'number') {
            totalRating += satisfaction.rating;
            ratingCount++;
          }
        }
      });

      const averageRating = ratingCount > 0 ? totalRating / ratingCount : null;
      const completionRate = totalAssigned > 0 ? (totalCompleted / totalAssigned) * 100 : 0;
      const avgTaskDuration = completedThisWeek > 0 ? hoursThisWeek / completedThisWeek : 0;

      setStats({
        assignedTasks,
        highPriorityTasks,
        completedThisWeek,
        completedLastWeek,
        totalCompleted,
        hoursThisWeek,
        hoursLastWeek,
        totalHoursWorked,
        reportsSubmitted,
        averageRating,
        totalRatings: ratingCount,
        completionRate,
        avgTaskDuration,
      });
    } catch (err) {
      console.error("Error fetching technician stats:", err);
      setError("Erro ao carregar estatísticas");
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    fetchStats();
  }, [fetchStats]);

  return {
    stats,
    loading,
    error,
    technicianId,
    refetch: fetchStats,
  };
}
