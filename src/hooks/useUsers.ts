import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

interface UserData {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  role: string | null;
  active: boolean;
}

export const useUsers = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['users', user?.id],
    queryFn: async () => {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profileData?.company_id) throw new Error('Empresa não encontrada');

      const { data: usersData, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          phone,
          created_at,
          user_roles (role),
          technicians (active)
        `)
        .eq('company_id', profileData.company_id);

      if (error) throw error;

      const formattedUsers: UserData[] = usersData?.map((u: any) => ({
        id: u.id,
        full_name: u.full_name,
        email: u.email,
        phone: u.phone,
        created_at: u.created_at,
        role: u.user_roles?.[0]?.role || null,
        active: u.technicians?.[0]?.active ?? true,
      })) || [];

      return formattedUsers;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['users'] });
  };

  return {
    users,
    isLoading,
    error,
    invalidate,
  };
};
