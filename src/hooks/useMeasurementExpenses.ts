import { useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

export const useMeasurementExpenses = () => {
  const queryClient = useQueryClient();

  // Adicionar despesa
  const addExpense = useMutation({
    mutationFn: async (data: {
      measurement_id: string;
      expense_type: 'hospedagem' | 'alimentacao';
      base_value: number;
      admin_fee_percentage: number;
      admin_fee_amount: number;
      total_value: number;
      description?: string;
    }) => {
      const { error } = await supabase
        .from('measurement_expenses')
        .insert(data);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['measurement'] });
      toast({
        title: 'Despesa adicionada',
        description: 'Despesa adicionada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao adicionar despesa',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Remover despesa
  const removeExpense = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('measurement_expenses')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['measurement'] });
      toast({
        title: 'Despesa removida',
        description: 'Despesa removida com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao remover despesa',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    addExpense,
    removeExpense,
  };
};
