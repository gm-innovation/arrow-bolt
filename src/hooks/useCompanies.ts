import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Company {
  id: string;
  name: string;
  email: string | null;
  phone: string | null;
  address: string | null;
  subscription_plan: 'basic' | 'professional' | 'enterprise' | null;
  payment_status: 'paid' | 'pending' | 'overdue' | null;
  created_at: string;
  updated_at: string;
}

export const useCompanies = () => {
  const { userRole } = useAuth();
  const queryClient = useQueryClient();

  const { data: companies = [], isLoading, error } = useQuery({
    queryKey: ['companies'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('companies')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      return data as Company[];
    },
    enabled: userRole === 'super_admin',
    staleTime: 1000 * 60 * 5,
    gcTime: 1000 * 60 * 10,
  });

  const createCompany = useMutation({
    mutationFn: async (company: Omit<Company, 'id' | 'created_at' | 'updated_at'>) => {
      const { data, error } = await supabase
        .from('companies')
        .insert([company])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });

  const updateCompany = useMutation({
    mutationFn: async ({ id, ...updates }: Partial<Company> & { id: string }) => {
      const { data, error } = await supabase
        .from('companies')
        .update(updates)
        .eq('id', id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });

  const deleteCompany = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from('companies')
        .delete()
        .eq('id', id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['companies'] });
    },
  });

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ['companies'] });
  };

  return {
    companies,
    isLoading,
    error,
    createCompany,
    updateCompany,
    deleteCompany,
    invalidate,
  };
};
