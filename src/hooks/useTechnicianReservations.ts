import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import { toast } from 'sonner';

export interface TechnicianReservation {
  id: string;
  company_id: string;
  technician_id: string;
  technician_name?: string;
  reserved_by: string;
  reserved_by_name?: string;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  client_id?: string;
  client_name?: string;
  vessel_id?: string;
  vessel_name?: string;
  service_order_id?: string;
  status: 'pending' | 'confirmed' | 'released' | 'converted' | 'cancelled';
  reason?: string;
  includes_travel: boolean;
  includes_overnight: boolean;
  notes?: string;
  created_at: string;
  updated_at: string;
}

export interface CreateReservationData {
  technician_id: string;
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  client_id?: string;
  vessel_id?: string;
  reason?: string;
  includes_travel?: boolean;
  includes_overnight?: boolean;
  notes?: string;
}

export const useTechnicianReservations = (currentDate?: Date, companyId?: string) => {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  
  const monthStart = currentDate ? format(startOfMonth(currentDate), 'yyyy-MM-dd') : undefined;
  const monthEnd = currentDate ? format(endOfMonth(currentDate), 'yyyy-MM-dd') : undefined;

  const { data: reservations, isLoading } = useQuery({
    queryKey: ['technician-reservations', companyId, monthStart, monthEnd],
    queryFn: async () => {
      if (!companyId) return [];

      let query = supabase
        .from('technician_reservations')
        .select(`
          *,
          technicians!inner (
            profiles:user_id (full_name)
          ),
          reserved_by_profile:reserved_by (full_name),
          clients (name),
          vessels (name)
        `)
        .eq('company_id', companyId)
        .in('status', ['pending', 'confirmed']);

      if (monthStart && monthEnd) {
        query = query
          .or(`start_date.lte.${monthEnd},end_date.gte.${monthStart}`);
      }

      const { data, error } = await query.order('start_date', { ascending: true });

      if (error) {
        console.error('Error fetching reservations:', error);
        return [];
      }

      return (data || []).map((item: any) => ({
        id: item.id,
        company_id: item.company_id,
        technician_id: item.technician_id,
        technician_name: item.technicians?.profiles?.full_name || 'Técnico',
        reserved_by: item.reserved_by,
        reserved_by_name: item.reserved_by_profile?.full_name || 'Coordenador',
        start_date: item.start_date,
        end_date: item.end_date,
        start_time: item.start_time,
        end_time: item.end_time,
        client_id: item.client_id,
        client_name: item.clients?.name,
        vessel_id: item.vessel_id,
        vessel_name: item.vessels?.name,
        service_order_id: item.service_order_id,
        status: item.status,
        reason: item.reason,
        includes_travel: item.includes_travel,
        includes_overnight: item.includes_overnight,
        notes: item.notes,
        created_at: item.created_at,
        updated_at: item.updated_at,
      })) as TechnicianReservation[];
    },
    enabled: !!companyId,
  });

  const createReservation = useMutation({
    mutationFn: async (data: CreateReservationData) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.company_id) throw new Error('Company not found');

      const { error } = await supabase.from('technician_reservations').insert({
        company_id: profile.company_id,
        technician_id: data.technician_id,
        reserved_by: user?.id,
        start_date: data.start_date,
        end_date: data.end_date,
        start_time: data.start_time || null,
        end_time: data.end_time || null,
        client_id: data.client_id || null,
        vessel_id: data.vessel_id || null,
        reason: data.reason || null,
        includes_travel: data.includes_travel || false,
        includes_overnight: data.includes_overnight || false,
        notes: data.notes || null,
        status: 'pending',
      });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technician-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['technician-availability'] });
      queryClient.invalidateQueries({ queryKey: ['batch-technician-availability'] });
      toast.success('Reserva criada com sucesso');
    },
    onError: (error) => {
      console.error('Error creating reservation:', error);
      toast.error('Erro ao criar reserva');
    },
  });

  const updateReservation = useMutation({
    mutationFn: async ({ id, ...data }: Partial<TechnicianReservation> & { id: string }) => {
      const { error } = await supabase
        .from('technician_reservations')
        .update({
          ...data,
          updated_at: new Date().toISOString(),
        })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technician-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['technician-availability'] });
      queryClient.invalidateQueries({ queryKey: ['batch-technician-availability'] });
      toast.success('Reserva atualizada com sucesso');
    },
    onError: (error) => {
      console.error('Error updating reservation:', error);
      toast.error('Erro ao atualizar reserva');
    },
  });

  const cancelReservation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('technician_reservations')
        .update({ status: 'cancelled', updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technician-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['technician-availability'] });
      queryClient.invalidateQueries({ queryKey: ['batch-technician-availability'] });
      toast.success('Reserva cancelada');
    },
    onError: (error) => {
      console.error('Error cancelling reservation:', error);
      toast.error('Erro ao cancelar reserva');
    },
  });

  const releaseReservation = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('technician_reservations')
        .update({ status: 'released', updated_at: new Date().toISOString() })
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technician-reservations'] });
      queryClient.invalidateQueries({ queryKey: ['technician-availability'] });
      toast.success('Técnico liberado');
    },
    onError: (error) => {
      console.error('Error releasing reservation:', error);
      toast.error('Erro ao liberar técnico');
    },
  });

  const convertToServiceOrder = useMutation({
    mutationFn: async ({ reservationId, serviceOrderId }: { reservationId: string; serviceOrderId: string }) => {
      const { error } = await supabase
        .from('technician_reservations')
        .update({ 
          status: 'converted', 
          service_order_id: serviceOrderId,
          updated_at: new Date().toISOString() 
        })
        .eq('id', reservationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['technician-reservations'] });
      toast.success('Reserva convertida em OS');
    },
    onError: (error) => {
      console.error('Error converting reservation:', error);
      toast.error('Erro ao converter reserva');
    },
  });

  return {
    reservations: reservations || [],
    isLoading,
    createReservation,
    updateReservation,
    cancelReservation,
    releaseReservation,
    convertToServiceOrder,
  };
};

// Hook to check for reservation conflicts
export const useReservationConflicts = (technicianIds: string[], startDate: string, endDate: string) => {
  return useQuery({
    queryKey: ['reservation-conflicts', technicianIds, startDate, endDate],
    queryFn: async () => {
      if (!technicianIds.length || !startDate || !endDate) return {};

      const { data, error } = await supabase
        .from('technician_reservations')
        .select(`
          id,
          technician_id,
          start_date,
          end_date,
          status,
          reason,
          reserved_by_profile:reserved_by (full_name)
        `)
        .in('technician_id', technicianIds)
        .in('status', ['pending', 'confirmed'])
        .or(`start_date.lte.${endDate},end_date.gte.${startDate}`);

      if (error) {
        console.error('Error fetching reservation conflicts:', error);
        return {};
      }

      const conflicts: Record<string, { hasConflict: boolean; reservedBy: string; reason?: string }> = {};
      
      technicianIds.forEach(id => {
        const reservation = data?.find(r => r.technician_id === id);
        if (reservation) {
          conflicts[id] = {
            hasConflict: true,
            reservedBy: (reservation as any).reserved_by_profile?.full_name || 'Outro coordenador',
            reason: reservation.reason || undefined,
          };
        } else {
          conflicts[id] = { hasConflict: false, reservedBy: '' };
        }
      });

      return conflicts;
    },
    enabled: technicianIds.length > 0 && !!startDate && !!endDate,
  });
};

// Calendar-specific hook for reservations
export interface CalendarReservation {
  id: string;
  technician_id: string;
  technician_name: string;
  reserved_by_name: string;
  start_date: string;
  end_date: string;
  client_name?: string;
  vessel_name?: string;
  includes_travel: boolean;
  includes_overnight: boolean;
  status: string;
}

export const useCalendarReservations = (currentDate: Date, companyId?: string) => {
  const monthStart = format(startOfMonth(currentDate), 'yyyy-MM-dd');
  const monthEnd = format(endOfMonth(currentDate), 'yyyy-MM-dd');

  const { data: reservations, isLoading } = useQuery({
    queryKey: ['calendar-reservations', companyId, monthStart, monthEnd],
    queryFn: async () => {
      if (!companyId) return [];

      const { data, error } = await supabase
        .from('technician_reservations')
        .select(`
          id,
          technician_id,
          start_date,
          end_date,
          status,
          includes_travel,
          includes_overnight,
          technicians!inner (
            profiles:user_id (full_name)
          ),
          reserved_by_profile:reserved_by (full_name),
          clients (name),
          vessels (name)
        `)
        .eq('company_id', companyId)
        .in('status', ['pending', 'confirmed'])
        .or(`start_date.lte.${monthEnd},end_date.gte.${monthStart}`);

      if (error) {
        console.error('Error fetching calendar reservations:', error);
        return [];
      }

      return (data || []).map((item: any) => ({
        id: item.id,
        technician_id: item.technician_id,
        technician_name: item.technicians?.profiles?.full_name || 'Técnico',
        reserved_by_name: item.reserved_by_profile?.full_name || 'Coordenador',
        start_date: item.start_date,
        end_date: item.end_date,
        client_name: item.clients?.name,
        vessel_name: item.vessels?.name,
        includes_travel: item.includes_travel,
        includes_overnight: item.includes_overnight,
        status: item.status,
      })) as CalendarReservation[];
    },
    enabled: !!companyId,
  });

  return {
    reservations: reservations || [],
    isLoading,
  };
};
