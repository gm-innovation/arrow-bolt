import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

interface CreateRequestParams {
  title: string;
  description?: string;
  priority?: string;
  amount?: number;
  department_id?: string;
  type_id?: string;
  company_id: string;
  dynamic_data?: any;
  status?: string;
  target_user_id?: string;
}

export const useCorpRequests = (filters?: { status?: string; department_id?: string; type_id?: string }) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ['corp-requests', filters],
    queryFn: async () => {
      let query = supabase
        .from('corp_requests')
        .select(`
          *,
          requester:profiles!corp_requests_requester_id_fkey(id, full_name, email),
          department:departments(id, name),
          type:corp_request_types(id, name, requires_approval, requires_director_approval, director_threshold_value, department_id),
          manager_approver:profiles!corp_requests_manager_approver_id_fkey(id, full_name),
          director_approver:profiles!corp_requests_director_approver_id_fkey(id, full_name),
          target:profiles!corp_requests_target_user_id_fkey(id, full_name, email)
        `)
        .order('created_at', { ascending: false });

      if (filters?.status) query = query.eq('status', filters.status);
      if (filters?.department_id) query = query.eq('department_id', filters.department_id);
      if (filters?.type_id) query = query.eq('type_id', filters.type_id);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createRequest = useMutation({
    mutationFn: async (params: CreateRequestParams) => {
      const { data, error } = await supabase
        .from('corp_requests')
        .insert({ ...params, requester_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corp-requests'] });
      queryClient.invalidateQueries({ queryKey: ['corp-dashboard'] });
      toast({ title: 'Solicitação criada com sucesso' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao criar solicitação', description: error.message, variant: 'destructive' });
    },
  });

  const updateRequest = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase.from('corp_requests').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corp-requests'] });
      queryClient.invalidateQueries({ queryKey: ['corp-dashboard'] });
      toast({ title: 'Solicitação atualizada' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao atualizar solicitação', description: error.message, variant: 'destructive' });
    },
  });

  // Diretoria aprova → pending_department (se tipo tem department_id) ou approved
  const approveAsDirector = useMutation({
    mutationFn: async ({ id, typeDepartmentId, amount }: { id: string; typeDepartmentId?: string; amount?: number }) => {
      const updates: any = {
        director_approver_id: user!.id,
        director_approved_at: new Date().toISOString(),
        status: typeDepartmentId ? 'pending_department' : 'approved',
      };
      if (amount !== undefined) {
        updates.approved_amount = amount;
      }
      const { data, error } = await supabase.from('corp_requests').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corp-requests'] });
      queryClient.invalidateQueries({ queryKey: ['corp-dashboard'] });
      toast({ title: 'Solicitação aprovada pela diretoria' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao aprovar', description: error.message, variant: 'destructive' });
    },
  });

  // Financeiro escala reembolso para diretoria
  const escalateToDirector = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.from('corp_requests').update({
        status: 'pending_director',
      }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corp-requests'] });
      toast({ title: 'Solicitação encaminhada para a diretoria' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao encaminhar', description: error.message, variant: 'destructive' });
    },
  });

  // Departamento atualiza valor → se diferente do approved_amount, volta para pending_director
  const updateDepartmentAmount = useMutation({
    mutationFn: async ({ id, newAmount, approvedAmount }: { id: string; newAmount: number; approvedAmount?: number }) => {
      const needsReapproval = approvedAmount !== undefined && approvedAmount !== null && newAmount !== approvedAmount;
      const updates: any = {
        amount: newAmount,
      };
      if (needsReapproval) {
        updates.status = 'pending_director';
        updates.director_approver_id = null;
        updates.director_approved_at = null;
      }
      const { data, error } = await supabase.from('corp_requests').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['corp-requests'] });
      if (data.status === 'pending_director') {
        toast({ title: 'Valor alterado — solicitação retornou para aprovação da diretoria' });
      } else {
        toast({ title: 'Valor atualizado' });
      }
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao atualizar valor', description: error.message, variant: 'destructive' });
    },
  });

  // Departamento inicia atendimento
  const startDepartmentWork = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.from('corp_requests').update({
        status: 'in_progress',
      }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corp-requests'] });
      toast({ title: 'Atendimento iniciado' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao iniciar atendimento', description: error.message, variant: 'destructive' });
    },
  });

  // Departamento conclui
  const completeDepartmentWork = useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await supabase.from('corp_requests').update({
        status: 'completed',
      }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corp-requests'] });
      queryClient.invalidateQueries({ queryKey: ['corp-dashboard'] });
      toast({ title: 'Solicitação concluída' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao concluir', description: error.message, variant: 'destructive' });
    },
  });

  const rejectRequest = useMutation({
    mutationFn: async ({ id, reason }: { id: string; reason: string }) => {
      const { data, error } = await supabase.from('corp_requests').update({
        status: 'rejected',
        rejection_reason: reason,
      }).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corp-requests'] });
      queryClient.invalidateQueries({ queryKey: ['corp-dashboard'] });
      toast({ title: 'Solicitação rejeitada' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao rejeitar', description: error.message, variant: 'destructive' });
    },
  });

  return {
    requests, isLoading,
    createRequest, updateRequest,
    approveAsDirector, rejectRequest,
    escalateToDirector, updateDepartmentAmount,
    startDepartmentWork, completeDepartmentWork,
  };
};
