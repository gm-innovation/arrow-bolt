import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const useMeasurementTravels = () => {
  const queryClient = useQueryClient();

  // Adicionar deslocamento
  const addTravel = useMutation({
    mutationFn: async (data: {
      measurement_id: string;
      travel_type: 'carro_proprio' | 'carro_alugado' | 'passagem_aerea';
      from_city: string;
      to_city: string;
      distance_km?: number;
      km_rate?: number;
      fixed_value?: number;
      total_value: number;
      description?: string;
    }) => {
      const { error } = await supabase
        .from('measurement_travels')
        .insert(data);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['measurement'] });
      toast({
        title: 'Deslocamento adicionado',
        description: 'Deslocamento adicionado com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao adicionar deslocamento',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Remover deslocamento
  const removeTravel = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('measurement_travels')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['measurement'] });
      toast({
        title: 'Deslocamento removido',
        description: 'Deslocamento removido com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao remover deslocamento',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    addTravel,
    removeTravel,
  };
};
