import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface CommercialTask {
  id: string;
  company_id: string;
  client_id: string | null;
  opportunity_id: string | null;
  assigned_to: string | null;
  title: string;
  description: string | null;
  priority: string;
  status: string;
  due_date: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
  clients?: { name: string } | null;
  crm_opportunities?: { title: string } | null;
  profiles?: { full_name: string } | null;
}

export const useCommercialTasks = () => {
  const { profile } = useAuth();
  const queryClient = useQueryClient();

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['commercial-tasks', profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      const { data, error } = await supabase
        .from('crm_tasks')
        .select('*, clients(name), crm_opportunities(title), profiles!crm_tasks_assigned_to_fkey(full_name)')
        .eq('company_id', profile.company_id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as CommercialTask[];
    },
    enabled: !!profile?.company_id,
  });

  const createTask = useMutation({
    mutationFn: async (payload: Record<string, any>) => {
      const { error } = await supabase.from('crm_tasks').insert({
        ...payload,
        company_id: profile!.company_id,
        created_by: profile!.id,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commercial-tasks'] });
      toast.success('Tarefa criada com sucesso');
    },
    onError: () => toast.error('Erro ao criar tarefa'),
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, ...payload }: Record<string, any>) => {
      const { error } = await supabase.from('crm_tasks').update(payload).eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commercial-tasks'] });
      toast.success('Tarefa atualizada');
    },
    onError: () => toast.error('Erro ao atualizar tarefa'),
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('crm_tasks').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commercial-tasks'] });
      toast.success('Tarefa excluída');
    },
    onError: () => toast.error('Erro ao excluir tarefa'),
  });

  return { tasks, isLoading, createTask, updateTask, deleteTask };
};
