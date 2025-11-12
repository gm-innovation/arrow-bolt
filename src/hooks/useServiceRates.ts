import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export const useServiceRates = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Buscar todas as taxas da empresa
  const { data: rates = [], isLoading } = useQuery({
    queryKey: ['service-rates', user?.id],
    queryFn: async () => {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profileData?.company_id) throw new Error('Empresa não encontrada');

      const { data, error } = await supabase
        .from('service_rates')
        .select('*')
        .eq('company_id', profileData.company_id)
        .order('role_type')
        .order('hour_type')
        .order('work_type');

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Upsert taxa (criar ou atualizar)
  const upsertRate = useMutation({
    mutationFn: async (data: {
      role_type: 'tecnico' | 'auxiliar' | 'engenheiro' | 'supervisor';
      hour_type: 'work_normal' | 'work_extra' | 'work_night' | 'standby';
      work_type: 'trabalho' | 'espera_deslocamento' | 'laboratorio';
      rate_value: number;
    }) => {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profileData?.company_id) throw new Error('Empresa não encontrada');

      const { error } = await supabase
        .from('service_rates')
        .upsert({
          company_id: profileData.company_id,
          ...data,
        }, {
          onConflict: 'company_id,role_type,hour_type,work_type',
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['service-rates'] });
      toast({
        title: 'Taxa atualizada',
        description: 'Taxa de serviço atualizada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao atualizar taxa',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Buscar taxa específica
  const getRate = (
    role_type: string,
    hour_type: string,
    work_type: string
  ) => {
    return rates.find(
      (r) =>
        r.role_type === role_type &&
        r.hour_type === hour_type &&
        r.work_type === work_type
    );
  };

  return {
    rates,
    isLoading,
    upsertRate,
    getRate,
  };
};
