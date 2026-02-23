import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export const useDepartments = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: departments = [], isLoading } = useQuery({
    queryKey: ['departments'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('departments')
        .select('*, manager:profiles!departments_manager_id_fkey(id, full_name)')
        .order('name');
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createDepartment = useMutation({
    mutationFn: async (dept: { name: string; description?: string; manager_id?: string; company_id: string }) => {
      const { data, error } = await supabase.from('departments').insert(dept).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast({ title: 'Departamento criado com sucesso' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao criar departamento', description: error.message, variant: 'destructive' });
    },
  });

  const updateDepartment = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; name?: string; description?: string; manager_id?: string; active?: boolean }) => {
      const { data, error } = await supabase.from('departments').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['departments'] });
      toast({ title: 'Departamento atualizado' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao atualizar departamento', description: error.message, variant: 'destructive' });
    },
  });

  return { departments, isLoading, createDepartment, updateDepartment };
};
