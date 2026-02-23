import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

export const useCorpFeed = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['corp-feed'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('corp_feed_posts')
        .select('*, author:profiles!corp_feed_posts_author_id_fkey(id, full_name, avatar_url)')
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  const createPost = useMutation({
    mutationFn: async (post: { company_id: string; title?: string; content: string; post_type?: string; pinned?: boolean }) => {
      const { data, error } = await supabase
        .from('corp_feed_posts')
        .insert({ ...post, author_id: user!.id })
        .select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corp-feed'] });
      toast({ title: 'Post publicado' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao publicar', description: error.message, variant: 'destructive' });
    },
  });

  const updatePost = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase.from('corp_feed_posts').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corp-feed'] });
      toast({ title: 'Post atualizado' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' });
    },
  });

  const deletePost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('corp_feed_posts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corp-feed'] });
      toast({ title: 'Post removido' });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' });
    },
  });

  return { posts, isLoading, createPost, updatePost, deletePost };
};
