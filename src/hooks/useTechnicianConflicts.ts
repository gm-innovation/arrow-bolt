import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export interface TechnicianConflict {
  technician_id: string;
  has_conflict: boolean;
  conflict_orders: {
    order_number: string;
    vessel_name: string;
  }[];
}

export const useTechnicianConflicts = (technicianIds: string[], date?: Date) => {
  const formattedDate = date ? format(date, 'yyyy-MM-dd') : null;

  const { data, isLoading } = useQuery({
    queryKey: ['technician-conflicts', technicianIds, formattedDate],
    queryFn: async () => {
      if (!technicianIds.length || !formattedDate) return {};

      const results: Record<string, TechnicianConflict> = {};

      // Initialize all technicians as no conflict
      technicianIds.forEach(techId => {
        results[techId] = {
          technician_id: techId,
          has_conflict: false,
          conflict_orders: []
        };
      });

      // Query visit_technicians for the given date
      const { data: visits, error } = await supabase
        .from('visit_technicians')
        .select(`
          technician_id,
          service_visits!inner (
            service_orders!inner (
              order_number,
              scheduled_date,
              status,
              vessels:vessel_id (name)
            )
          )
        `)
        .in('technician_id', technicianIds);

      if (error) {
        console.error('Error fetching technician conflicts:', error);
        return results;
      }

      // Filter and map conflicts
      visits?.forEach((visit: any) => {
        const so = visit.service_visits?.service_orders;
        if (!so) return;

        // Check if scheduled date matches and order is not cancelled
        if (so.scheduled_date === formattedDate && so.status !== 'cancelled') {
          const techId = visit.technician_id;
          if (results[techId]) {
            results[techId].has_conflict = true;
            results[techId].conflict_orders.push({
              order_number: so.order_number,
              vessel_name: so.vessels?.name || 'Sem embarcação'
            });
          }
        }
      });

      return results;
    },
    enabled: technicianIds.length > 0 && !!formattedDate,
  });

  return {
    conflictsMap: data || {},
    isLoading,
  };
};
