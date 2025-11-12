import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export const useMeasurements = (serviceOrderId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Buscar medição de uma OS específica
  const { data: measurement, isLoading } = useQuery({
    queryKey: ['measurement', serviceOrderId],
    queryFn: async () => {
      if (!serviceOrderId) return null;

      const { data, error } = await supabase
        .from('measurements')
        .select(`
          *,
          measurement_man_hours(*),
          measurement_materials(*),
          measurement_services(*),
          measurement_travels(*),
          measurement_expenses(*)
        `)
        .eq('service_order_id', serviceOrderId)
        .single();

      if (error && error.code !== 'PGRST116') throw error;
      return data;
    },
    enabled: !!serviceOrderId,
  });

  // Criar medição
  const createMeasurement = useMutation({
    mutationFn: async (data: {
      service_order_id: string;
      category: 'CATIVO' | 'LABORATORIO' | 'EXTERNO';
    }) => {
      const { data: newMeasurement, error } = await supabase
        .from('measurements')
        .insert({
          service_order_id: data.service_order_id,
          category: data.category,
          created_by: user?.id,
        })
        .select()
        .single();

      if (error) throw error;
      return newMeasurement;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['measurement', data.service_order_id] });
      toast({
        title: 'Medição criada',
        description: 'Medição final criada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao criar medição',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Atualizar categoria da medição
  const updateCategory = useMutation({
    mutationFn: async (data: {
      id: string;
      category: 'CATIVO' | 'LABORATORIO' | 'EXTERNO';
    }) => {
      const { error } = await supabase
        .from('measurements')
        .update({ category: data.category })
        .eq('id', data.id);

      if (error) throw error;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ['measurement'] });
      toast({
        title: 'Categoria atualizada',
        description: 'Categoria da medição atualizada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar categoria',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Finalizar medição
  const finalizeMeasurement = useMutation({
    mutationFn: async (measurementId: string) => {
      const { error } = await supabase
        .from('measurements')
        .update({
          status: 'finalized',
          finalized_by: user?.id,
          finalized_at: new Date().toISOString(),
        })
        .eq('id', measurementId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['measurement'] });
      toast({
        title: 'Medição finalizada',
        description: 'Medição final finalizada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao finalizar medição',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    measurement,
    isLoading,
    createMeasurement,
    updateCategory,
    finalizeMeasurement,
  };
};
