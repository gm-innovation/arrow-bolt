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
      // Auto-join creator
      await supabase.from('corp_group_members').insert({ group_id: data.id, user_id: user!.id });
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corp-groups'] });
      toast({ title: 'Grupo criado com sucesso' });
    },
    onError: (e: any) => toast({ title: 'Erro ao criar grupo', description: e.message, variant: 'destructive' }),
  });

  const joinGroup = useMutation({
    mutationFn: async (groupId: string) => {
      const { error } = await supabase.from('corp_group_members').insert({ group_id: groupId, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corp-groups'] });
      toast({ title: 'Você entrou no grupo' });
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
      toast({ title: 'Você saiu do grupo' });
    },
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

  return { groups, isLoading, createGroup, joinGroup, leaveGroup, deleteGroup };
};
