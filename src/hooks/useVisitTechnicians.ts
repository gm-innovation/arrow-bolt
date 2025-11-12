import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface VisitTechnician {
  id: string;
  visit_id: string;
  technician_id: string;
  is_lead: boolean;
  assigned_at: string;
  technicians: {
    id: string;
    profiles: {
      full_name: string;
      avatar_url?: string;
    };
  };
}

export const useVisitTechnicians = (visitId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: technicians = [], isLoading } = useQuery({
    queryKey: ['visit-technicians', visitId],
    queryFn: async () => {
      if (!visitId) return [];

      const { data, error } = await supabase
        .from('visit_technicians')
        .select(`
          id,
          visit_id,
          technician_id,
          is_lead,
          assigned_at,
          technicians:technician_id (
            id,
            profiles:user_id (
              full_name,
              avatar_url
            )
          )
        `)
        .eq('visit_id', visitId)
        .order('is_lead', { ascending: false })
        .order('assigned_at', { ascending: true });

      if (error) throw error;
      return data as VisitTechnician[];
    },
    enabled: !!visitId && !!user?.id,
  });

  const addTechnician = useMutation({
    mutationFn: async ({
      visitId,
      technicianId,
      isLead = false,
    }: {
      visitId: string;
      technicianId: string;
      isLead?: boolean;
    }) => {
      const { data, error } = await supabase
        .from('visit_technicians')
        .insert({
          visit_id: visitId,
          technician_id: technicianId,
          is_lead: isLead,
          assigned_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visit-technicians'] });
      toast.success('Técnico adicionado à visita');
    },
    onError: (error) => {
      console.error('Error adding technician:', error);
      toast.error('Erro ao adicionar técnico');
    },
  });

  const removeTechnician = useMutation({
    mutationFn: async ({ visitTechnicianId }: { visitTechnicianId: string }) => {
      const { error } = await supabase
        .from('visit_technicians')
        .delete()
        .eq('id', visitTechnicianId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['visit-technicians'] });
      toast.success('Técnico removido da visita');
    },
    onError: (error) => {
      console.error('Error removing technician:', error);
      toast.error('Erro ao remover técnico');
    },
  });

  return {
    technicians,
    isLoading,
    addTechnician: addTechnician.mutate,
    removeTechnician: removeTechnician.mutate,
    isAdding: addTechnician.isPending,
    isRemoving: removeTechnician.isPending,
  };
};
