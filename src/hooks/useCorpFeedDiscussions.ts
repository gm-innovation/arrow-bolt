import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export const useCorpFeedDiscussions = (companyId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: discussions = [], isLoading } = useQuery({
    queryKey: ['corp-feed-discussions', companyId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('corp_feed_discussions')
        .select('*, author:profiles!corp_feed_discussions_author_id_fkey(id, full_name, avatar_url)')
        .eq('company_id', companyId)
        .order('pinned', { ascending: false })
        .order('updated_at', { ascending: false });
      if (error) throw error;

      // Get reply counts
      const ids = (data || []).map((d: any) => d.id);
      if (ids.length === 0) return data || [];

      const { data: counts } = await (supabase as any)
        .from('corp_feed_discussion_replies')
        .select('discussion_id')
        .in('discussion_id', ids);

      const countMap = new Map<string, number>();
      (counts || []).forEach((c: any) => {
        countMap.set(c.discussion_id, (countMap.get(c.discussion_id) || 0) + 1);
      });

      return (data || []).map((d: any) => ({
        ...d,
        reply_count: countMap.get(d.id) || 0,
      }));
    },
    enabled: !!companyId && !!user,
  });

  const createDiscussion = useMutation({
    mutationFn: async (input: { company_id: string; title: string; content?: string }) => {
      const { data, error } = await (supabase as any)
        .from('corp_feed_discussions')
        .insert({ ...input, author_id: user!.id })
        .select()
        .single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corp-feed-discussions'] });
      toast({ title: 'Discussão criada' });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  return { discussions, isLoading, createDiscussion };
};

export const useCorpFeedDiscussionDetail = (discussionId?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: discussion, isLoading: loadingDiscussion } = useQuery({
    queryKey: ['corp-feed-discussion', discussionId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('corp_feed_discussions')
        .select('*, author:profiles!corp_feed_discussions_author_id_fkey(id, full_name, avatar_url)')
        .eq('id', discussionId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!discussionId && !!user,
  });

  const { data: replies = [], isLoading: loadingReplies } = useQuery({
    queryKey: ['corp-feed-discussion-replies', discussionId],
    queryFn: async () => {
      const { data, error } = await (supabase as any)
        .from('corp_feed_discussion_replies')
        .select('*, author:profiles!corp_feed_discussion_replies_author_id_fkey(id, full_name, avatar_url)')
        .eq('discussion_id', discussionId)
        .order('created_at', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!discussionId && !!user,
  });

  const addReply = useMutation({
    mutationFn: async (content: string) => {
      const { error } = await (supabase as any)
        .from('corp_feed_discussion_replies')
        .insert({ discussion_id: discussionId, author_id: user!.id, content });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corp-feed-discussion-replies', discussionId] });
      queryClient.invalidateQueries({ queryKey: ['corp-feed-discussions'] });
    },
    onError: (e: any) => toast({ title: 'Erro', description: e.message, variant: 'destructive' }),
  });

  return { discussion, replies, loadingDiscussion, loadingReplies, addReply };
};
