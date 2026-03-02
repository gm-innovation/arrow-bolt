import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export const useCorpGroups = (companyId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: groups = [], isLoading } = useQuery({
    queryKey: ['corp-groups', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('corp_groups')
        .select('*, corp_group_members(id, user_id, profiles:profiles!corp_group_members_user_id_fkey(id, full_name, avatar_url))')
        .eq('company_id', companyId!)
        .order('group_type', { ascending: true })
        .order('name', { ascending: true });
      if (error) throw error;
      return (data || []).map((g: any) => ({
        ...g,
        members: (g.corp_group_members || []).map((m: any) => ({
          id: m.id,
          user_id: m.user_id,
          full_name: m.profiles?.full_name,
          avatar_url: m.profiles?.avatar_url,
        })),
        member_count: g.corp_group_members?.length || 0,
        is_member: g.corp_group_members?.some((m: any) => m.user_id === user?.id) || false,
      }));
    },
    enabled: !!user && !!companyId,
  });

  // Fetch user's pending join requests
  const { data: myPendingRequests = [] } = useQuery({
    queryKey: ['corp-group-my-requests', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('corp_group_join_requests')
        .select('group_id')
        .eq('user_id', user!.id)
        .eq('status', 'pending');
      if (error) throw error;
      return (data || []).map((r: any) => r.group_id);
    },
    enabled: !!user,
  });

  // Fetch pending requests for admin/HR (all groups in company)
  const { data: pendingRequests = [] } = useQuery({
    queryKey: ['corp-group-pending-requests', companyId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('corp_group_join_requests')
        .select('*, profiles:profiles!corp_group_join_requests_user_id_fkey(id, full_name, avatar_url)')
        .eq('status', 'pending');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && !!companyId,
  });

  const requestJoin = useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase
        .from('corp_group_join_requests')
        .insert({ group_id: groupId, user_id: user!.id, status: 'pending' });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corp-group-my-requests'] });
      toast({ title: 'Solicitação enviada', description: 'Aguarde aprovação de um administrador.' });
    },
    onError: (e: any) => toast({ title: 'Erro ao solicitar entrada', description: e.message, variant: 'destructive' }),
  });

  const approveRequest = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('corp_group_join_requests')
        .update({ status: 'approved', reviewed_by: user!.id, reviewed_at: new Date().toISOString() })
        .eq('id', requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corp-groups'] });
      queryClient.invalidateQueries({ queryKey: ['corp-group-pending-requests'] });
      queryClient.invalidateQueries({ queryKey: ['corp-group-my-requests'] });
      toast({ title: 'Solicitação aprovada' });
    },
  });

  const rejectRequest = useMutation({
    mutationFn: async (requestId: string) => {
      const { error } = await supabase
        .from('corp_group_join_requests')
        .update({ status: 'rejected', reviewed_by: user!.id, reviewed_at: new Date().toISOString() })
        .eq('id', requestId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corp-group-pending-requests'] });
      queryClient.invalidateQueries({ queryKey: ['corp-group-my-requests'] });
      toast({ title: 'Solicitação rejeitada' });
    },
  });

  const cancelRequest = useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase
        .from('corp_group_join_requests')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user!.id)
        .eq('status', 'pending');
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corp-group-my-requests'] });
      toast({ title: 'Solicitação cancelada' });
    },
  });

  const leaveGroup = useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase
        .from('corp_group_members')
        .delete()
        .eq('group_id', groupId)
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corp-groups'] });
      queryClient.invalidateQueries({ queryKey: ['my-corp-groups'] });
      toast({ title: 'Você saiu do grupo' });
    },
  });

  const createGroup = useMutation({
    mutationFn: async (group: { name: string; description?: string }) => {
      const { data, error } = await supabase
        .from('corp_groups')
        .insert({
          company_id: companyId!,
          name: group.name,
          description: group.description || null,
          group_type: 'custom',
          created_by: user!.id,
        })
        .select()
        .single();
      if (error) throw error;
      await supabase.from('corp_group_members').insert({ group_id: data.id, user_id: user!.id });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corp-groups'] });
      toast({ title: 'Grupo criado com sucesso' });
    },
    onError: (e: any) => toast({ title: 'Erro ao criar grupo', description: e.message, variant: 'destructive' }),
  });

  const deleteGroup = useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase.from('corp_groups').delete().eq('id', groupId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corp-groups'] });
      toast({ title: 'Grupo removido' });
    },
  });

  return {
    groups,
    isLoading,
    myPendingRequests,
    pendingRequests,
    requestJoin,
    approveRequest,
    rejectRequest,
    cancelRequest,
    leaveGroup,
    createGroup,
    deleteGroup,
  };
};
