import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const useMeasurementServices = () => {
  const queryClient = useQueryClient();

  // Adicionar serviço
  const addService = useMutation({
    mutationFn: async (data: {
      measurement_id: string;
      name: string;
      value: number;
      description?: string;
    }) => {
      const { error } = await supabase
        .from('measurement_services')
        .insert(data);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['measurement'] });
      toast({
        title: 'Serviço adicionado',
        description: 'Serviço adicionado com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao adicionar serviço',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Remover serviço
  const removeService = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('measurement_services')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['measurement'] });
      toast({
        title: 'Serviço removido',
        description: 'Serviço removido com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao remover serviço',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    addService,
    removeService,
  };
};
