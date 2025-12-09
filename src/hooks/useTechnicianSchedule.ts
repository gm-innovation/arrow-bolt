import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfMonth, endOfMonth, addMonths } from 'date-fns';

export interface TechnicianAbsence {
  id: string;
  absence_type: 'vacation' | 'day_off' | 'medical_exam' | 'training' | 'sick_leave' | 'other';
  start_date: string;
  end_date: string;
  reason?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
}

export interface TechnicianOnCall {
  id: string;
  on_call_date: string;
  start_time?: string;
  end_time?: string;
  is_holiday: boolean;
  is_weekend: boolean;
  notes?: string;
}

export const useTechnicianSchedule = () => {
  const { user } = useAuth();

  // Fetch technician's own absences for current and next month
  const { data: absences, isLoading: absencesLoading } = useQuery({
    queryKey: ['technician-schedule-absences', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get technician ID
      const { data: technician } = await supabase
        .from('technicians')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!technician) return [];

      const now = new Date();
      const startDate = format(startOfMonth(now), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(addMonths(now, 2)), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('technician_absences')
        .select('*')
        .eq('technician_id', technician.id)
        .gte('end_date', startDate)
        .lte('start_date', endDate)
        .neq('status', 'cancelled')
        .order('start_date', { ascending: true });

      if (error) throw error;
      return data as TechnicianAbsence[];
    },
    enabled: !!user,
  });

  // Fetch technician's own on-call schedules
  const { data: onCallSchedules, isLoading: onCallLoading } = useQuery({
    queryKey: ['technician-schedule-oncall', user?.id],
    queryFn: async () => {
      if (!user) return [];

      // Get technician ID
      const { data: technician } = await supabase
        .from('technicians')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!technician) return [];

      const now = new Date();
      const startDate = format(startOfMonth(now), 'yyyy-MM-dd');
      const endDate = format(endOfMonth(addMonths(now, 2)), 'yyyy-MM-dd');

      const { data, error } = await supabase
        .from('technician_on_call')
        .select('*')
        .eq('technician_id', technician.id)
        .gte('on_call_date', startDate)
        .lte('on_call_date', endDate)
        .order('on_call_date', { ascending: true });

      if (error) throw error;
      return data as TechnicianOnCall[];
    },
    enabled: !!user,
  });

  return {
    absences: absences || [],
    onCallSchedules: onCallSchedules || [],
    isLoading: absencesLoading || onCallLoading,
  };
};

export const getAbsenceTypeLabel = (type: TechnicianAbsence['absence_type']) => {
  const labels = {
    vacation: 'Férias',
    day_off: 'Folga',
    medical_exam: 'Exame Médico',
    training: 'Treinamento',
    sick_leave: 'Atestado',
    other: 'Outro',
  };
  return labels[type] || type;
};

export const getAbsenceTypeIcon = (type: TechnicianAbsence['absence_type']) => {
  const icons = {
    vacation: '🏖️',
    day_off: '📴',
    medical_exam: '🏥',
    training: '📋',
    sick_leave: '🏥',
    other: '📝',
  };
  return icons[type] || '📝';
};
