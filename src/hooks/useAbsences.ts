import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/hooks/use-toast';

export interface Absence {
  id: string;
  technician_id: string;
  company_id: string;
  absence_type: 'vacation' | 'day_off' | 'medical_exam' | 'training' | 'sick_leave' | 'other';
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  reason?: string;
  status: 'scheduled' | 'in_progress' | 'completed' | 'cancelled';
  approved_by?: string;
  approved_at?: string;
  notes?: string;
  created_by?: string;
  created_at: string;
  updated_at: string;
  technician?: {
    id: string;
    user_id: string;
    profiles?: {
      full_name: string;
    };
  };
}

export interface CreateAbsenceData {
  technician_id: string;
  absence_type: Absence['absence_type'];
  start_date: string;
  end_date: string;
  start_time?: string;
  end_time?: string;
  reason?: string;
  notes?: string;
}

export const useAbsences = (filters?: { technicianId?: string; startDate?: string; endDate?: string }) => {
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const { data: absences, isLoading, refetch } = useQuery({
    queryKey: ['absences', filters],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.company_id) return [];

      let query = supabase
        .from('technician_absences')
        .select(`
          *,
          technician:technicians(
            id,
            user_id,
            profiles:profiles(full_name)
          )
        `)
        .eq('company_id', profile.company_id)
        .order('start_date', { ascending: false });

      if (filters?.technicianId) {
        query = query.eq('technician_id', filters.technicianId);
      }

      if (filters?.startDate) {
        query = query.gte('end_date', filters.startDate);
      }

      if (filters?.endDate) {
        query = query.lte('start_date', filters.endDate);
      }

      const { data, error } = await query;

      if (error) throw error;
      return data as Absence[];
    },
    enabled: !!user,
  });

  const createAbsence = useMutation({
    mutationFn: async (data: CreateAbsenceData) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.company_id) throw new Error('Company not found');

      const { data: result, error } = await supabase
        .from('technician_absences')
        .insert({
          ...data,
          company_id: profile.company_id,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return result;
    },
    onSuccess: () => {
      toast({ title: 'Ausência agendada com sucesso' });
      queryClient.invalidateQueries({ queryKey: ['absences'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao agendar ausência', description: error.message, variant: 'destructive' });
    },
  });

  const updateAbsence = useMutation({
    mutationFn: async ({ id, ...data }: Partial<Absence> & { id: string }) => {
      const { error } = await supabase
        .from('technician_absences')
        .update(data)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Ausência atualizada com sucesso' });
      queryClient.invalidateQueries({ queryKey: ['absences'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao atualizar ausência', description: error.message, variant: 'destructive' });
    },
  });

  const deleteAbsence = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('technician_absences')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      toast({ title: 'Ausência removida com sucesso' });
      queryClient.invalidateQueries({ queryKey: ['absences'] });
    },
    onError: (error: Error) => {
      toast({ title: 'Erro ao remover ausência', description: error.message, variant: 'destructive' });
    },
  });

  return {
    absences: absences || [],
    isLoading,
    refetch,
    createAbsence,
    updateAbsence,
    deleteAbsence,
  };
};

export const getAbsenceTypeLabel = (type: Absence['absence_type']) => {
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

export const getAbsenceStatusLabel = (status: Absence['status']) => {
  const labels = {
    scheduled: 'Agendada',
    in_progress: 'Em Andamento',
    completed: 'Concluída',
    cancelled: 'Cancelada',
  };
  return labels[status] || status;
};
