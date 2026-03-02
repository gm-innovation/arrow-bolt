import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export const useGroupDiscussions = (groupId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: discussions = [], isLoading: loadingDiscussions } = useQuery({
    queryKey: ['group-discussions', groupId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('corp_group_discussions')
        .select('*, profiles:profiles!corp_group_discussions_author_id_fkey(id, full_name, avatar_url)')
        .eq('group_id', groupId!)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Get reply counts
      const ids = (data || []).map((d: any) => d.id);
      if (ids.length === 0) return data || [];

      const { data: counts } = await supabase
        .from('corp_group_discussion_posts')
        .select('discussion_id')
        .in('discussion_id', ids);

      const countMap: Record<string, number> = {};
      (counts || []).forEach((c: any) => {
        countMap[c.discussion_id] = (countMap[c.discussion_id] || 0) + 1;
      });

      return (data || []).map((d: any) => ({ ...d, reply_count: countMap[d.id] || 0 }));
    },
    enabled: !!groupId,
  });

  const createDiscussion = useMutation({
    mutationFn: async ({ title, content }: { title: string; content?: string }) => {
      const { error } = await supabase
        .from('corp_group_discussions')
        .insert({ group_id: groupId!, author_id: user!.id, title, content: content || null });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['group-discussions', groupId] });
      toast({ title: 'Discussão criada' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  return { discussions, loadingDiscussions, createDiscussion };
};

export const useDiscussionPosts = (discussionId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: posts = [], isLoading: loadingPosts } = useQuery({
    queryKey: ['discussion-posts', discussionId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('corp_group_discussion_posts')
        .select('*, profiles:profiles!corp_group_discussion_posts_author_id_fkey(id, full_name, avatar_url)')
        .eq('discussion_id', discussionId!)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!discussionId,
  });

  const createPost = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await supabase
        .from('corp_group_discussion_posts')
        .insert({ discussion_id: discussionId!, author_id: user!.id, content });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussion-posts', discussionId] });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  const deletePost = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from('corp_group_discussion_posts').delete().eq('id', postId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['discussion-posts', discussionId] });
    },
  });

  return { posts, loadingPosts, createPost, deletePost };
};
