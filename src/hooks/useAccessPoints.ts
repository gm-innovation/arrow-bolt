import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface AccessPoint {
  id: string;
  company_id: string;
  name: string;
  location: string | null;
  latitude: number | null;
  longitude: number | null;
  instructions: string | null;
  point_type: 'port' | 'shipyard' | 'marina' | 'heliport' | 'other';
  is_mainland: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateAccessPointData {
  name: string;
  location?: string;
  latitude?: number;
  longitude?: number;
  instructions?: string;
  point_type?: 'port' | 'shipyard' | 'marina' | 'heliport' | 'other';
  is_mainland?: boolean;
}

export function useAccessPoints() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: accessPoints = [], isLoading, error } = useQuery({
    queryKey: ['access-points', user?.id],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.company_id) return [];

      const { data, error } = await supabase
        .from('access_points')
        .select('*')
        .eq('company_id', profile.company_id)
        .order('name');

      if (error) throw error;
      return data as AccessPoint[];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  const createAccessPoint = useMutation({
    mutationFn: async (accessPointData: CreateAccessPointData) => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profile?.company_id) throw new Error('Company not found');

      const { data, error } = await supabase
        .from('access_points')
        .insert({
          ...accessPointData,
          company_id: profile.company_id,
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access-points'] });
    },
  });

  const updateAccessPoint = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<AccessPoint> & { id: string }) => {
      const { data, error } = await supabase
        .from('access_points')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access-points'] });
    },
  });

  const deleteAccessPoint = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('access_points')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['access-points'] });
    },
  });

  return {
    accessPoints,
    isLoading,
    error,
    createAccessPoint,
    updateAccessPoint,
    deleteAccessPoint,
  };
}

// Translate point type to Portuguese
export function translatePointType(type: string): string {
  const types: Record<string, string> = {
    'port': 'Porto',
    'shipyard': 'Estaleiro',
    'marina': 'Marina',
    'heliport': 'Heliporto',
    'other': 'Outro'
  };
  return types[type] || type;
}
