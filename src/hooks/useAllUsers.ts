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
      const { data: usersData, error } = await supabase
        .from('profiles')
        .select(`
          id,
          full_name,
          email,
          phone,
          created_at,
          company_id,
          companies (name),
          user_roles (role),
          technicians (active)
        `)
        .order('created_at', { ascending: false });

      if (error) throw error;

      const formattedUsers: UserData[] = usersData?.map((u: any) => ({
        id: u.id,
        full_name: u.full_name,
        email: u.email,
        phone: u.phone,
        created_at: u.created_at,
        role: u.user_roles?.[0]?.role || null,
        active: u.technicians?.[0]?.active ?? true,
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
      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.admin.createUser({
        email: userData.email,
        password: userData.password,
        email_confirm: true,
        user_metadata: {
          full_name: userData.full_name,
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Usuário não foi criado');

      // Update profile with company_id and phone
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          company_id: userData.company_id,
          phone: userData.phone || null,
        })
        .eq('id', authData.user.id);

      if (profileError) throw profileError;

      // Create user role
      const roleValue = userData.role === 'tech' ? 'technician' : userData.role;
      const { error: roleError } = await supabase
        .from('user_roles')
        .insert({
          user_id: authData.user.id,
          role: roleValue as 'admin' | 'super_admin' | 'technician',
        });

      if (roleError) throw roleError;

      // If role is tech, create technician entry
      if (userData.role === 'tech') {
        const { error: techError } = await supabase
          .from('technicians')
          .insert({
            user_id: authData.user.id,
            company_id: userData.company_id,
            active: true,
          });

        if (techError) throw techError;
      }

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
      // Update profile
      const { error: profileError } = await supabase
        .from('profiles')
        .update({
          full_name: userData.full_name,
          phone: userData.phone,
          company_id: userData.company_id,
        })
        .eq('id', userId);

      if (profileError) throw profileError;

      // Update role if provided
      if (userData.role) {
        // Delete existing roles
        await supabase
          .from('user_roles')
          .delete()
          .eq('user_id', userId);

        // Insert new role
        const roleValue = userData.role === 'tech' ? 'technician' : userData.role;
        const { error: roleError } = await supabase
          .from('user_roles')
          .insert({
            user_id: userId,
            role: roleValue as 'admin' | 'super_admin' | 'technician',
          });

        if (roleError) throw roleError;

        // Handle technician entry
        if (userData.role === 'tech') {
          // Check if technician entry exists
          const { data: existingTech } = await supabase
            .from('technicians')
            .select('id')
            .eq('user_id', userId)
            .maybeSingle();

          if (!existingTech && userData.company_id) {
            await supabase
              .from('technicians')
              .insert({
                user_id: userId,
                company_id: userData.company_id,
                active: true,
              });
          }
        } else {
          // Remove technician entry if role is not tech
          await supabase
            .from('technicians')
            .delete()
            .eq('user_id', userId);
        }
      }

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
      const { error } = await supabase.auth.admin.deleteUser(userId);

      if (error) throw error;

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
