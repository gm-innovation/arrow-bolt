import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const useMeasurementMaterials = () => {
  const queryClient = useQueryClient();

  // Adicionar material
  const addMaterial = useMutation({
    mutationFn: async (data: {
      measurement_id: string;
      name: string;
      quantity: number;
      unit_value: number;
      markup_percentage: number;
      total_value: number;
      external_product_id?: number | null;
      external_product_code?: string | null;
      source?: string;
    }) => {
      const { error } = await supabase
        .from('measurement_materials')
        .insert(data);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['measurement'] });
      toast({
        title: 'Material adicionado',
        description: 'Material adicionado com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao adicionar material',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Atualizar material
  const updateMaterial = useMutation({
    mutationFn: async (data: {
      id: string;
      name?: string;
      quantity?: number;
      unit_value?: number;
      markup_percentage?: number;
      total_value?: number;
    }) => {
      const { id, ...updateData } = data;
      const { error } = await supabase
        .from('measurement_materials')
        .update(updateData)
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['measurement'] });
      toast({
        title: 'Material atualizado',
        description: 'Material atualizado com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar material',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Remover material
  const removeMaterial = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('measurement_materials')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['measurement'] });
      toast({
        title: 'Material removido',
        description: 'Material removido com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao remover material',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    addMaterial,
    updateMaterial,
    removeMaterial,
  };
};
