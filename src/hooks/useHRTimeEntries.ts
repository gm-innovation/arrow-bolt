import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface TimeEntry {
  id: string;
  task_id: string | null;
  technician_id: string;
  entry_type: 'work_normal' | 'work_extra' | 'work_night' | 'standby';
  entry_date: string;
  start_time: string;
  end_time: string;
  check_in_at: string | null;
  check_out_at: string | null;
  service_order_id: string | null;
  hours_normal: number;
  hours_extra: number;
  hours_night: number;
  hours_standby: number;
  is_travel: boolean;
  is_overnight: boolean;
  notes: string | null;
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
      vessel?: {
        name: string;
      };
    };
  };
  service_order?: {
    order_number: string;
    vessel?: {
      name: string;
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

export interface UpdateTimeEntryData {
  id: string;
  check_in_at?: string;
  check_out_at?: string;
  hours_normal?: number;
  hours_extra?: number;
  hours_night?: number;
  hours_standby?: number;
  is_travel?: boolean;
  is_overnight?: boolean;
  notes?: string;
}

export interface CreateTimeEntryData {
  technician_id: string;
  check_in_at: string;
  check_out_at: string;
  service_order_id?: string;
  hours_normal: number;
  hours_extra: number;
  hours_night: number;
  hours_standby: number;
  is_travel?: boolean;
  is_overnight?: boolean;
  notes?: string;
}

export interface MeasurementData {
  travels: Array<{
    date: string;
    fromCity: string;
    toCity: string;
    serviceOrderId: string;
  }>;
  overnights: Array<{
    date: string;
    description: string;
    serviceOrderId: string;
  }>;
}

export interface VisitData {
  technicianId: string;
  visitDate: string;
  vesselName: string | null;
  orderNumber: string | null;
  serviceOrderId: string;
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

      // Get technicians from the company
      const { data: companyTechnicians, error: techError } = await supabase
        .from('technicians')
        .select('id, user_id, company_id, profiles:profiles(full_name)')
        .eq('company_id', profile.company_id);

      if (techError) throw techError;

      const technicianIds = (companyTechnicians || []).map(t => t.id);
      if (technicianIds.length === 0) return [];

      // Build query with filters - now including service_order and vessel
      let query = supabase
        .from('time_entries')
        .select(`
          *,
          task:tasks(
            id,
            title,
            service_order:service_orders(order_number, vessel:vessels(name))
          ),
          service_order:service_orders(order_number, vessel:vessels(name))
        `)
        .in('technician_id', technicianIds)
        .order('check_in_at', { ascending: false, nullsFirst: false });

      // Apply date filters based on check_in_at
      if (filters?.startDate) {
        query = query.gte('check_in_at', `${filters.startDate}T00:00:00`);
      }

      if (filters?.endDate) {
        query = query.lte('check_in_at', `${filters.endDate}T23:59:59`);
      }

      if (filters?.technicianId) {
        query = query.eq('technician_id', filters.technicianId);
      }

      const { data, error } = await query;

      if (error) throw error;

      // Map technician data to entries
      const technicianMap = new Map(companyTechnicians?.map(t => [t.id, t]));
      
      return (data || []).map((entry: any) => ({
        ...entry,
        technician: technicianMap.get(entry.technician_id) || null
      })) as TimeEntry[];
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

  // Fetch measurement data (travels and overnight expenses) from service order closures
  const { data: measurementData, isLoading: loadingMeasurements, refetch: refetchMeasurements } = useQuery({
    queryKey: ['hr-measurement-data', filters],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.company_id) return { travels: [], overnights: [] };

      // Get service orders for the period
      let soQuery = supabase
        .from('service_orders')
        .select('id, scheduled_date')
        .eq('company_id', profile.company_id);

      if (filters?.startDate) {
        soQuery = soQuery.gte('scheduled_date', filters.startDate);
      }
      if (filters?.endDate) {
        soQuery = soQuery.lte('scheduled_date', filters.endDate);
      }

      const { data: serviceOrders } = await soQuery;
      const soIds = (serviceOrders || []).map(so => so.id);

      if (soIds.length === 0) return { travels: [], overnights: [] };

      // Get measurements for these service orders
      const { data: measurements } = await supabase
        .from('measurements')
        .select('id, service_order_id, service_order:service_orders(scheduled_date)')
        .in('service_order_id', soIds);

      const measurementIds = (measurements || []).map(m => m.id);
      if (measurementIds.length === 0) return { travels: [], overnights: [] };

      // Fetch travels and overnight expenses in parallel
      const [travelsResult, expensesResult] = await Promise.all([
        supabase
          .from('measurement_travels')
          .select('*, measurement:measurements(service_order_id, service_order:service_orders(scheduled_date))')
          .in('measurement_id', measurementIds),
        supabase
          .from('measurement_expenses')
          .select('*, measurement:measurements(service_order_id, service_order:service_orders(scheduled_date))')
          .in('measurement_id', measurementIds)
          .eq('expense_type', 'hospedagem')
      ]);

      const travels = (travelsResult.data || []).map((t: any) => ({
        date: t.measurement?.service_order?.scheduled_date || '',
        fromCity: t.from_city,
        toCity: t.to_city,
        serviceOrderId: t.measurement?.service_order_id || '',
      }));

      const overnights = (expensesResult.data || []).map((e: any) => ({
        date: e.measurement?.service_order?.scheduled_date || '',
        description: e.description || 'Hospedagem',
        serviceOrderId: e.measurement?.service_order_id || '',
      }));

      return { travels, overnights } as MeasurementData;
    },
    enabled: !!user,
  });

  // Fetch visit_technicians data to get which days each technician was at a vessel
  const { data: visitsData, isLoading: loadingVisits, refetch: refetchVisits } = useQuery({
    queryKey: ['hr-visits-data', filters],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.company_id) return [];

      // Get technicians from the company
      const { data: companyTechnicians } = await supabase
        .from('technicians')
        .select('id')
        .eq('company_id', profile.company_id);

      const technicianIds = (companyTechnicians || []).map(t => t.id);
      if (technicianIds.length === 0) return [];

      // Build query for visit_technicians
      let query = supabase
        .from('visit_technicians')
        .select(`
          technician_id,
          is_lead,
          visit:service_visits(
            visit_date,
            service_order:service_orders(
              id,
              order_number,
              vessel:vessels(name)
            )
          )
        `)
        .in('technician_id', technicianIds);

      const { data, error } = await query;

      if (error) {
        console.error('Error fetching visits:', error);
        return [];
      }

      // Transform data and filter by date
      const visits: VisitData[] = [];
      (data || []).forEach((vt: any) => {
        if (!vt.visit?.visit_date) return;
        
        const visitDate = vt.visit.visit_date;
        
        // Apply date filters
        if (filters?.startDate && visitDate < filters.startDate) return;
        if (filters?.endDate && visitDate > filters.endDate) return;
        if (filters?.technicianId && vt.technician_id !== filters.technicianId) return;

        visits.push({
          technicianId: vt.technician_id,
          visitDate: visitDate,
          vesselName: vt.visit.service_order?.vessel?.name || null,
          orderNumber: vt.visit.service_order?.order_number || null,
          serviceOrderId: vt.visit.service_order?.id || '',
        });
      });

      return visits;
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

  const updateTimeEntry = useMutation({
    mutationFn: async (data: UpdateTimeEntryData) => {
      const { id, ...updateData } = data;
      const { error } = await supabase
        .from('time_entries')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Registro atualizado com sucesso' });
      queryClient.invalidateQueries({ queryKey: ['hr-time-entries'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar registro', description: error.message, variant: 'destructive' });
    },
  });

  const createTimeEntry = useMutation({
    mutationFn: async (data: CreateTimeEntryData) => {
      // Extract date from check_in_at for entry_date
      const entryDate = data.check_in_at.split('T')[0];
      const checkInTime = data.check_in_at.split('T')[1]?.slice(0, 5) || '08:00';
      const checkOutTime = data.check_out_at.split('T')[1]?.slice(0, 5) || '17:00';

      const { error } = await supabase
        .from('time_entries')
        .insert({
          technician_id: data.technician_id,
          check_in_at: data.check_in_at,
          check_out_at: data.check_out_at,
          service_order_id: data.service_order_id || null,
          hours_normal: data.hours_normal,
          hours_extra: data.hours_extra,
          hours_night: data.hours_night,
          hours_standby: data.hours_standby,
          is_travel: data.is_travel || false,
          is_overnight: data.is_overnight || false,
          notes: data.notes || null,
          // Legacy fields for compatibility
          entry_date: entryDate,
          start_time: checkInTime,
          end_time: checkOutTime,
          entry_type: 'work_normal',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Registro criado com sucesso' });
      queryClient.invalidateQueries({ queryKey: ['hr-time-entries'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao criar registro', description: error.message, variant: 'destructive' });
    },
  });

  const deleteTimeEntry = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('time_entries')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Registro excluído com sucesso' });
      queryClient.invalidateQueries({ queryKey: ['hr-time-entries'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao excluir registro', description: error.message, variant: 'destructive' });
    },
  });

  return {
    timeEntries: timeEntries || [],
    adjustments: adjustments || [],
    measurementData: measurementData || { travels: [], overnights: [] },
    visitsData: visitsData || [],
    isLoading: loadingEntries || loadingAdjustments || loadingMeasurements || loadingVisits,
    refetch: () => {
      refetchEntries();
      refetchAdjustments();
      refetchMeasurements();
      refetchVisits();
    },
    createAdjustment,
    updateTimeEntry,
    createTimeEntry,
    deleteTimeEntry,
  };
};

export const getEntryTypeLabel = (type: TimeEntry['entry_type']) => {
  const labels = {
    work_normal: 'HN',
    work_extra: 'HE',
    work_night: 'HNot',
    standby: 'Sob',
  };
  return labels[type] || type;
};
