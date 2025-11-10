import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface UserData {
  id: string;
  full_name: string;
  email: string;
  phone: string | null;
  created_at: string;
  role: string | null;
  active: boolean;
  company_id: string | null;
  company_name: string | null;
}

export const useAllUsers = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: users = [], isLoading, error } = useQuery({
    queryKey: ['all-users', user?.id],
    queryFn: async () => {
      // Fetch profiles with companies
      const { data: profilesData, error: profilesError } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          phone,
          created_at,
          company_id,
          companies (name)
        `)
        .order('created_at', { ascending: false });

      if (profilesError) throw profilesError;

      // Fetch user roles separately
      const { data: rolesData, error: rolesError } = await supabase
        .from('user_roles')
        .select('user_id, role');

      if (rolesError) throw rolesError;

      // Fetch technicians separately
      const { data: techniciansData, error: techniciansError } = await supabase
        .from('technicians')
        .select('user_id, active');

      if (techniciansError) throw techniciansError;

      // Create lookup maps
      const rolesMap = new Map(rolesData?.map(r => [r.user_id, r.role]) || []);
      const techniciansMap = new Map(techniciansData?.map(t => [t.user_id, t.active]) || []);

      const formattedUsers: UserData[] = profilesData?.map((u: any) => ({
        id: u.id,
        full_name: u.full_name,
        email: u.email,
        phone: u.phone,
        created_at: u.created_at,
        role: rolesMap.get(u.id) || null,
        active: techniciansMap.get(u.id) ?? true,
        company_id: u.company_id,
        company_name: u.companies?.name || null,
      })) || [];

      return formattedUsers;
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5, // 5 minutes
    gcTime: 1000 * 60 * 10, // 10 minutes
  });

  const createUser = async (userData: {
    email: string;
    password: string;
    full_name: string;
    phone?: string;
    company_id: string;
    role: string;
  }) => {
    try {
      const { data, error } = await supabase.functions.invoke('create-user', {
        body: userData,
      });

      if (error) throw error;
      if (!data?.success) throw new Error('Erro ao criar usuário');

      toast.success('Usuário criado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      return { success: true };
    } catch (error: any) {
      toast.error(error.message || 'Erro ao criar usuário');
      return { success: false, error };
    }
  };

  const updateUser = async (userId: string, userData: {
    full_name?: string;
    phone?: string;
    company_id?: string;
    role?: string;
  }) => {
    try {
      const { data, error } = await supabase.functions.invoke('update-user', {
        body: {
          user_id: userId,
          ...userData,
        },
      });

      if (error) throw error;
      if (!data?.success) throw new Error('Erro ao atualizar usuário');

      toast.success('Usuário atualizado com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      return { success: true };
    } catch (error: any) {
      toast.error(error.message || 'Erro ao atualizar usuário');
      return { success: false, error };
    }
  };

  const toggleUserStatus = async (userId: string, currentActive: boolean) => {
    try {
      const { error } = await supabase
        .from('technicians')
        .update({ active: !currentActive })
        .eq('user_id', userId);

      if (error) throw error;

      toast.success(`Usuário ${!currentActive ? 'ativado' : 'desativado'} com sucesso!`);
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      return { success: true };
    } catch (error: any) {
      toast.error(error.message || 'Erro ao alterar status do usuário');
      return { success: false, error };
    }
  };

  const deleteUser = async (userId: string) => {
    try {
      const { data, error } = await supabase.functions.invoke('delete-user', {
        body: { user_id: userId },
      });

      if (error) throw error;
      if (!data?.success) throw new Error('Erro ao excluir usuário');

      toast.success('Usuário excluído com sucesso!');
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      return { success: true };
    } catch (error: any) {
      toast.error(error.message || 'Erro ao excluir usuário');
      return { success: false, error };
    }
  };

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['all-users'] });
  };

  return {
    users,
    isLoading,
    error,
    createUser,
    updateUser,
    toggleUserStatus,
    deleteUser,
    invalidate,
  };
};
