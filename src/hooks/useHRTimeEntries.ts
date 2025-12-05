import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface TimeEntry {
  id: string;
  task_id: string;
  technician_id: string;
  entry_type: 'work_normal' | 'work_extra' | 'work_night' | 'standby';
  entry_date: string;
  start_time: string;
  end_time: string;
  created_at: string;
  updated_at: string;
  technician?: {
    id: string;
    user_id: string;
    profiles?: {
      full_name: string;
    };
  };
  task?: {
    id: string;
    title: string;
    service_order?: {
      order_number: string;
    };
  };
}

export interface TimeAdjustment {
  id: string;
  technician_id: string;
  company_id: string;
  adjustment_date: string;
  original_check_in?: string;
  adjusted_check_in?: string;
  original_check_out?: string;
  adjusted_check_out?: string;
  adjustment_reason: string;
  adjusted_by?: string;
  created_at: string;
  technician?: {
    id: string;
    profiles?: {
      full_name: string;
    };
  };
  adjuster?: {
    full_name: string;
  };
}

export interface CreateAdjustmentData {
  technician_id: string;
  adjustment_date: string;
  original_check_in?: string;
  adjusted_check_in?: string;
  original_check_out?: string;
  adjusted_check_out?: string;
  adjustment_reason: string;
}

export const useHRTimeEntries = (filters?: { technicianId?: string; startDate?: string; endDate?: string }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: timeEntries, isLoading: loadingEntries, refetch: refetchEntries } = useQuery({
    queryKey: ['hr-time-entries', filters],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.company_id) return [];

      let query = supabase
        .from('time_entries')
        .select(`
          *,
          technician:technicians(
            id,
            user_id,
            company_id,
            profiles:profiles(full_name)
          ),
          task:tasks(
            id,
            title,
            service_order:service_orders(order_number)
          )
        `)
        .order('entry_date', { ascending: false });

      const { data, error } = await query;

      if (error) throw error;

      // Filter by company
      const filtered = (data || []).filter(
        (entry: any) => entry.technician?.company_id === profile.company_id
      );

      // Apply additional filters
      let result = filtered;

      if (filters?.technicianId) {
        result = result.filter((e: any) => e.technician_id === filters.technicianId);
      }

      if (filters?.startDate) {
        result = result.filter((e: any) => e.entry_date >= filters.startDate);
      }

      if (filters?.endDate) {
        result = result.filter((e: any) => e.entry_date <= filters.endDate);
      }

      return result as TimeEntry[];
    },
    enabled: !!user,
  });

  const { data: adjustments, isLoading: loadingAdjustments, refetch: refetchAdjustments } = useQuery({
    queryKey: ['hr-time-adjustments', filters],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.company_id) return [];

      let query = supabase
        .from('hr_time_adjustments')
        .select(`
          *,
          technician:technicians(
            id,
            profiles:profiles(full_name)
          )
        `)
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });

      if (filters?.technicianId) {
        query = query.eq('technician_id', filters.technicianId);
      }

      if (filters?.startDate) {
        query = query.gte('adjustment_date', filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte('adjustment_date', filters.endDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as TimeAdjustment[];
    },
    enabled: !!user,
  });

  const createAdjustment = useMutation({
    mutationFn: async (data: CreateAdjustmentData) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.company_id) throw new Error('Company not found');

      const { data: result, error } = await supabase
        .from('hr_time_adjustments')
        .insert({
          ...data,
          company_id: profile.company_id,
          adjusted_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast({ title: 'Ajuste registrado com sucesso' });
      queryClient.invalidateQueries({ queryKey: ['hr-time-adjustments'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao registrar ajuste', description: error.message, variant: 'destructive' });
    },
  });

  return {
    timeEntries: timeEntries || [],
    adjustments: adjustments || [],
    isLoading: loadingEntries || loadingAdjustments,
    refetch: () => {
      refetchEntries();
      refetchAdjustments();
    },
    createAdjustment,
  };
};

export const getEntryTypeLabel = (type: TimeEntry['entry_type']) => {
  const labels = {
    work_normal: 'HN - Hora Normal',
    work_extra: 'HE - Hora Extra',
    work_night: 'HN - Hora Noturna',
    standby: 'Sobreaviso',
  };
  return labels[type] || type;
};
