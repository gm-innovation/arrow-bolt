import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';

const getFileType = (mime: string): string => {
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('video/')) return 'video';
  if (mime.startsWith('audio/')) return 'audio';
  return 'file';
};

const sanitizeFileName = (name: string): string =>
  name.normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-zA-Z0-9._-]/g, '_');

export const useCorpFeed = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: posts = [], isLoading } = useQuery({
    queryKey: ['corp-feed'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('corp_feed_posts')
        .select(`
          *,
          author:profiles!corp_feed_posts_author_id_fkey(id, full_name, avatar_url),
          corp_feed_likes(user_id),
          corp_feed_comments(id),
          corp_feed_attachments(id, file_url, file_name, file_type, file_size, mime_type)
        `)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;

      return (data || []).map((post: any) => ({
        ...post,
        likes_count: post.corp_feed_likes?.length || 0,
        comments_count: post.corp_feed_comments?.length || 0,
        liked_by_me: post.corp_feed_likes?.some((l: any) => l.user_id === user?.id) || false,
        attachments: post.corp_feed_attachments || [],
      }));
    },
    enabled: !!user,
  });

  const { data: comments = {}, isLoading: commentsLoading } = useQuery({
    queryKey: ['corp-feed-comments'],
    queryFn: async () => {
      const postIds = posts.map((p: any) => p.id);
      if (postIds.length === 0) return {};
      const { data, error } = await supabase
        .from('corp_feed_comments')
        .select('*, author:profiles!corp_feed_comments_author_id_fkey(id, full_name, avatar_url)')
        .in('post_id', postIds)
        .order('created_at', { ascending: true });
      if (error) throw error;
      const grouped: Record<string, any[]> = {};
      (data || []).forEach((c: any) => {
        if (!grouped[c.post_id]) grouped[c.post_id] = [];
        grouped[c.post_id].push(c);
      });
      return grouped;
    },
    enabled: !!user && posts.length > 0,
  });

  const uploadAttachments = async (postId: string, files: File[]) => {
    for (const file of files) {
      const safeName = sanitizeFileName(file.name);
      const path = `${user!.id}/${postId}/${Date.now()}-${safeName}`;
      const { error: uploadError } = await supabase.storage
        .from('corp-feed-media')
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;

      const { data: urlData } = supabase.storage.from('corp-feed-media').getPublicUrl(path);

      const { error: insertError } = await supabase.from('corp_feed_attachments').insert({
        post_id: postId,
        file_url: urlData.publicUrl,
        file_name: file.name,
        file_type: getFileType(file.type),
        file_size: file.size,
        mime_type: file.type,
      });
      if (insertError) throw insertError;
    }
  };

  const createPost = useMutation({
    mutationFn: async (post: { company_id: string; title?: string; content: string; post_type?: string; pinned?: boolean; files?: File[] }) => {
      const { files, ...postData } = post;
      const { data, error } = await supabase
        .from('corp_feed_posts')
        .insert({ ...postData, author_id: user!.id })
        .select().single();
      if (error) throw error;

      if (files && files.length > 0) {
        await uploadAttachments(data.id, files);
      }
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

  const likePost = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from('corp_feed_likes')
        .insert({ post_id: postId, user_id: user!.id });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['corp-feed'] }),
  });

  const unlikePost = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase
        .from('corp_feed_likes')
        .delete()
        .eq('post_id', postId)
        .eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['corp-feed'] }),
  });

  const addComment = useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      const { error } = await supabase
        .from('corp_feed_comments')
        .insert({ post_id: postId, author_id: user!.id, content });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corp-feed'] });
      queryClient.invalidateQueries({ queryKey: ['corp-feed-comments'] });
    },
    onError: (error: any) => {
      toast({ title: 'Erro ao comentar', description: error.message, variant: 'destructive' });
    },
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase
        .from('corp_feed_comments')
        .delete()
        .eq('id', commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corp-feed'] });
      queryClient.invalidateQueries({ queryKey: ['corp-feed-comments'] });
    },
  });

  return {
    posts, isLoading, comments, commentsLoading,
    createPost, updatePost, deletePost,
    likePost, unlikePost, addComment, deleteComment,
  };
};
