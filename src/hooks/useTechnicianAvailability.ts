import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';

export interface TechnicianAvailability {
  is_available: boolean;
  status_type: string;
  status_description: string;
}

export const useTechnicianAvailability = (technicianId?: string, date?: Date) => {
  const formattedDate = date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');

  const { data, isLoading } = useQuery({
    queryKey: ['technician-availability', technicianId, formattedDate],
    queryFn: async () => {
      if (!technicianId) return null;

      const { data, error } = await supabase.rpc('get_technician_availability', {
        _technician_id: technicianId,
        _check_date: formattedDate,
      });

      if (error) throw error;
      return data?.[0] as TechnicianAvailability | undefined;
    },
    enabled: !!technicianId,
  });

  return {
    availability: data,
    isLoading,
    isAvailable: data?.is_available ?? true,
    statusType: data?.status_type ?? 'available',
    statusDescription: data?.status_description ?? 'Disponível',
  };
};

export const useBatchTechnicianAvailability = (technicianIds: string[], date?: Date) => {
  const formattedDate = date ? format(date, 'yyyy-MM-dd') : format(new Date(), 'yyyy-MM-dd');

  const { data, isLoading } = useQuery({
    queryKey: ['batch-technician-availability', technicianIds, formattedDate],
    queryFn: async () => {
      if (!technicianIds.length) return {};

      const results: Record<string, TechnicianAvailability> = {};

      // Fetch availability for each technician
      await Promise.all(
        technicianIds.map(async (techId) => {
          const { data, error } = await supabase.rpc('get_technician_availability', {
            _technician_id: techId,
            _check_date: formattedDate,
          });

          if (!error && data?.[0]) {
            results[techId] = data[0] as TechnicianAvailability;
          }
        })
      );

      return results;
    },
    enabled: technicianIds.length > 0,
  });

  return {
    availabilityMap: data || {},
    isLoading,
  };
};
