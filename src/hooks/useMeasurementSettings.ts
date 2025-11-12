import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export const useMeasurementSettings = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Buscar configurações da empresa
  const { data: settings, isLoading } = useQuery({
    queryKey: ['measurement-settings', user?.id],
    queryFn: async () => {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profileData?.company_id) throw new Error('Empresa não encontrada');

      const { data, error } = await supabase
        .from('measurement_settings')
        .select('*')
        .eq('company_id', profileData.company_id)
        .single();

      if (error && error.code !== 'PGRST116') throw error;

      // Se não existe, retornar valores padrão
      if (!data) {
        return {
          km_rate: 2.50,
          default_material_markup: 30.00,
          expense_admin_fee: 20.00,
          tax_cativo: 2.00,
          tax_laboratorio: 5.00,
          tax_externo: 2.00,
        };
      }

      return data;
    },
    enabled: !!user?.id,
  });

  // Atualizar configurações
  const updateSettings = useMutation({
    mutationFn: async (data: {
      km_rate?: number;
      default_material_markup?: number;
      expense_admin_fee?: number;
      tax_cativo?: number;
      tax_laboratorio?: number;
      tax_externo?: number;
    }) => {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profileData?.company_id) throw new Error('Empresa não encontrada');

      const { error } = await supabase
        .from('measurement_settings')
        .upsert({
          company_id: profileData.company_id,
          ...data,
        }, {
          onConflict: 'company_id',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['measurement-settings'] });
      toast({
        title: 'Configurações atualizadas',
        description: 'Configurações de medição atualizadas com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar configurações',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  return {
    settings,
    isLoading,
    updateSettings,
  };
};
