import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useDepartmentMembers = (departmentId?: string) => {
  const { user } = useAuth();

  const { data: members = [], isLoading } = useQuery({
    queryKey: ['department-members', departmentId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('department_members')
        .select('id, user_id, profile:profiles!department_members_user_id_fkey(id, full_name, email)')
        .eq('department_id', departmentId);
      if (error) throw error;
      return data;
    },
    enabled: !!user && !!departmentId,
  });

  return { members, isLoading };
};
