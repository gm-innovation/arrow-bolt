import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface ServiceVisit {
  id: string;
  service_order_id: string;
  visit_number: number;
  visit_type: 'initial' | 'continuation' | 'return';
  visit_date: string;
  scheduled_by?: string;
  created_by?: string;
  return_reason?: string;
  status: string;
  created_at: string;
  service_orders?: {
    order_number: string;
    vessels?: { name: string };
    clients?: { name: string };
  };
  visit_technicians?: Array<{
    is_lead: boolean;
    technicians: {
      profiles: { full_name: string } | null;
    } | null;
  }>;
}

export const useServiceVisits = (serviceOrderId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: visits = [], isLoading } = useQuery({
    queryKey: ['service-visits', serviceOrderId],
    queryFn: async () => {
      let query = supabase
        .from('service_visits')
        .select(`
          id,
          service_order_id,
          visit_number,
          visit_type,
          visit_date,
          scheduled_by,
          created_by,
          return_reason,
          status,
          created_at,
          service_orders:service_order_id (
            order_number,
            vessels:vessel_id (name),
            clients:client_id (name)
          ),
          visit_technicians (
            is_lead,
            technicians:technician_id (
              profiles:user_id (full_name)
            )
          )
        `)
        .order('visit_number', { ascending: true });

      if (serviceOrderId) {
        query = query.eq('service_order_id', serviceOrderId);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as ServiceVisit[];
    },
    enabled: !!user?.id,
  });

  const createContinuationVisit = useMutation({
    mutationFn: async ({ serviceOrderId, visitDate }: { serviceOrderId: string; visitDate: string }) => {
      // Get the last visit number
      const { data: lastVisit } = await supabase
        .from('service_visits')
        .select('visit_number, id')
        .eq('service_order_id', serviceOrderId)
        .order('visit_number', { ascending: false })
        .limit(1)
        .single();

      const newVisitNumber = (lastVisit?.visit_number || 0) + 1;

      // Create new visit
      const { data: newVisit, error } = await supabase
        .from('service_visits')
        .insert({
          service_order_id: serviceOrderId,
          visit_number: newVisitNumber,
          visit_type: 'continuation',
          visit_date: visitDate,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Copy technicians from previous visit
      if (lastVisit?.id) {
        const { data: previousTechs } = await supabase
          .from('visit_technicians')
          .select('technician_id, is_lead')
          .eq('visit_id', lastVisit.id);

        if (previousTechs && previousTechs.length > 0) {
          await supabase
            .from('visit_technicians')
            .insert(
              previousTechs.map((tech) => ({
                visit_id: newVisit.id,
                technician_id: tech.technician_id,
                is_lead: tech.is_lead,
                assigned_by: user?.id,
              }))
            );
        }
      }

      return newVisit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-visits'] });
      toast.success('Visita de continuação criada com sucesso');
    },
    onError: (error) => {
      console.error('Error creating continuation visit:', error);
      toast.error('Erro ao criar visita de continuação');
    },
  });

  const createReturnVisit = useMutation({
    mutationFn: async ({
      serviceOrderId,
      visitDate,
      returnReason,
      technicianIds,
      leadTechnicianId,
    }: {
      serviceOrderId: string;
      visitDate: string;
      returnReason: string;
      technicianIds: string[];
      leadTechnicianId?: string;
    }) => {
      // Get the last visit number
      const { data: lastVisit } = await supabase
        .from('service_visits')
        .select('visit_number')
        .eq('service_order_id', serviceOrderId)
        .order('visit_number', { ascending: false })
        .limit(1)
        .single();

      const newVisitNumber = (lastVisit?.visit_number || 0) + 1;

      // Create return visit
      const { data: newVisit, error } = await supabase
        .from('service_visits')
        .insert({
          service_order_id: serviceOrderId,
          visit_number: newVisitNumber,
          visit_type: 'return',
          visit_date: visitDate,
          return_reason: returnReason,
          scheduled_by: user?.id,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;

      // Add technicians to visit
      if (technicianIds.length > 0) {
        await supabase
          .from('visit_technicians')
          .insert(
            technicianIds.map((techId) => ({
              visit_id: newVisit.id,
              technician_id: techId,
              is_lead: techId === leadTechnicianId,
              assigned_by: user?.id,
            }))
          );
      }

      // Log in service history
      await supabase.from('service_history').insert({
        service_order_id: serviceOrderId,
        action: 'return_scheduled',
        description: `Retorno agendado para ${visitDate}. Motivo: ${returnReason}`,
        performed_by: user?.id,
      });

      return newVisit;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-visits'] });
      queryClient.invalidateQueries({ queryKey: ['service-orders'] });
      toast.success('Retorno agendado com sucesso');
    },
    onError: (error) => {
      console.error('Error creating return visit:', error);
      toast.error('Erro ao agendar retorno');
    },
  });

  return {
    visits,
    isLoading,
    createContinuationVisit: createContinuationVisit.mutate,
    createReturnVisit: createReturnVisit.mutate,
    isCreatingContinuation: createContinuationVisit.isPending,
    isCreatingReturn: createReturnVisit.isPending,
  };
};
