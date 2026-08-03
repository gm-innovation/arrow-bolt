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
        .select('id, full_name, email, phone, created_at')
        .eq('company_id', profileData.company_id);

      if (error) throw error;

      const ids = (usersData || []).map((u) => u.id);
      if (ids.length === 0) return [];

      // user_roles e technicians referenciam auth.users (sem FK com profiles),
      // por isso são buscados separadamente em vez de embed do PostgREST.
      const [rolesResult, techResult] = await Promise.all([
        supabase.from('user_roles').select('user_id, role').in('user_id', ids),
        supabase.from('technicians').select('user_id, active').in('user_id', ids),
      ]);

      const roleByUser = new Map<string, string>();
      (rolesResult.data || []).forEach((r: any) => {
        if (!roleByUser.has(r.user_id)) roleByUser.set(r.user_id, r.role);
      });
      const activeByUser = new Map<string, boolean>();
      (techResult.data || []).forEach((t: any) => activeByUser.set(t.user_id, t.active));

      const formattedUsers: UserData[] = (usersData || []).map((u: any) => ({
        id: u.id,
        full_name: u.full_name,
        email: u.email,
        phone: u.phone,
        created_at: u.created_at,
        role: roleByUser.get(u.id) || null,
        active: activeByUser.get(u.id) ?? true,
      }));

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
