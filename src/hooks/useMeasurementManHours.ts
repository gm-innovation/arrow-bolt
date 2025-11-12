import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const useMeasurementManHours = () => {
  const queryClient = useQueryClient();

  // Adicionar entrada de mão de obra
  const addManHour = useMutation({
    mutationFn: async (data: {
      measurement_id: string;
      entry_date: string;
      start_time: string;
      end_time: string;
      hour_type: 'work_normal' | 'work_extra' | 'work_night' | 'standby';
      work_type: 'trabalho' | 'espera_deslocamento' | 'laboratorio';
      technician_id?: string;
      technician_name: string;
      technician_role: 'tecnico' | 'auxiliar' | 'engenheiro' | 'supervisor';
      total_hours: number;
      hourly_rate: number;
      total_value: number;
    }) => {
      const { error } = await supabase
        .from('measurement_man_hours')
        .insert(data);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['measurement'] });
      toast({
        title: 'Mão de obra adicionada',
        description: 'Entrada de mão de obra adicionada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao adicionar mão de obra',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Remover entrada de mão de obra
  const removeManHour = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('measurement_man_hours')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['measurement'] });
      toast({
        title: 'Mão de obra removida',
        description: 'Entrada de mão de obra removida com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao remover mão de obra',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    addManHour,
    removeManHour,
  };
};
