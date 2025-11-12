import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export const useCityDistances = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  // Buscar todas as distâncias da empresa
  const { data: distances = [], isLoading } = useQuery({
    queryKey: ['city-distances', user?.id],
    queryFn: async () => {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profileData?.company_id) throw new Error('Empresa não encontrada');

      const { data, error } = await supabase
        .from('city_distances')
        .select('*')
        .eq('company_id', profileData.company_id)
        .order('from_city')
        .order('to_city');

      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  // Adicionar distância
  const addDistance = useMutation({
    mutationFn: async (data: {
      from_city: string;
      to_city: string;
      distance_km: number;
    }) => {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profileData?.company_id) throw new Error('Empresa não encontrada');

      const { error } = await supabase
        .from('city_distances')
        .insert({
          company_id: profileData.company_id,
          ...data,
        });

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['city-distances'] });
      toast({
        title: 'Distância adicionada',
        description: 'Distância entre cidades adicionada com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao adicionar distância',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Remover distância
  const removeDistance = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('city_distances')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['city-distances'] });
      toast({
        title: 'Distância removida',
        description: 'Distância entre cidades removida com sucesso.',
      });
    },
    onError: (error: any) => {
      toast({
        title: 'Erro ao remover distância',
        description: error.message,
        variant: 'destructive',
      });
    },
  });

  // Buscar distância entre duas cidades
  const getDistance = (fromCity: string, toCity: string) => {
    return distances.find(
      (d) =>
        (d.from_city === fromCity && d.to_city === toCity) ||
        (d.from_city === toCity && d.to_city === fromCity)
    );
  };

  return {
    distances,
    isLoading,
    addDistance,
    removeDistance,
    getDistance,
  };
};
