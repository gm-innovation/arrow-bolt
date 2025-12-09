import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { startOfMonth, endOfMonth, format } from 'date-fns';

export interface CalendarAbsence {
  id: string;
  technician_id: string;
  technician_name: string;
  absence_type: 'vacation' | 'day_off' | 'medical_exam' | 'training' | 'sick_leave';
  start_date: string;
  end_date: string;
  status: string;
}

export interface CalendarOnCall {
  id: string;
  technician_id: string;
  technician_name: string;
  on_call_date: string;
  is_holiday: boolean;
  is_weekend: boolean;
}

export const useCalendarAbsences = (currentDate: Date, companyId?: string) => {
  const monthStart = format(startOfMonth(currentDate), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(currentDate), 'yyyy-MM-dd');

  const { data: absences, isLoading: absencesLoading } = useQuery({
    queryKey: ['calendar-absences', companyId, monthStart, monthEnd],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('technician_absences')
        .select(`
          id,
          technician_id,
          absence_type,
          start_date,
          end_date,
          status,
          technicians!inner (
            profiles:user_id (full_name)
          )
        `)
        .eq('technicians.company_id', companyId)
        .neq('status', 'cancelled')
        .or(`start_date.lte.${monthEnd},end_date.gte.${monthStart}`);

      if (error) {
        console.error('Error fetching absences:', error);
        return [];
      }

      return (data || []).map((item: any) => ({
        id: item.id,
        technician_id: item.technician_id,
        technician_name: item.technicians?.profiles?.full_name || 'Técnico',
        absence_type: item.absence_type,
        start_date: item.start_date,
        end_date: item.end_date,
        status: item.status
      })) as CalendarAbsence[];
    },
    enabled: !!companyId,
  });

  const { data: onCalls, isLoading: onCallsLoading } = useQuery({
    queryKey: ['calendar-oncalls', companyId, monthStart, monthEnd],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('technician_on_call')
        .select(`
          id,
          technician_id,
          on_call_date,
          is_holiday,
          is_weekend,
          technicians!inner (
            profiles:user_id (full_name)
          )
        `)
        .eq('company_id', companyId)
        .gte('on_call_date', monthStart)
        .lte('on_call_date', monthEnd);

      if (error) {
        console.error('Error fetching on-calls:', error);
        return [];
      }

      return (data || []).map((item: any) => ({
        id: item.id,
        technician_id: item.technician_id,
        technician_name: item.technicians?.profiles?.full_name || 'Técnico',
        on_call_date: item.on_call_date,
        is_holiday: item.is_holiday,
        is_weekend: item.is_weekend
      })) as CalendarOnCall[];
    },
    enabled: !!companyId,
  });

  return {
    absences: absences || [],
    onCalls: onCalls || [],
    isLoading: absencesLoading || onCallsLoading
  };
};
