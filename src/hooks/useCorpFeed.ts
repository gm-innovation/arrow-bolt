import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from '@/hooks/use-toast';
import type { MentionItem } from '@/components/corp/FeedMentionInput';

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
          author:profiles!corp_feed_posts_author_id_fkey(id, full_name, avatar_url, hire_date, birth_date),
          corp_feed_likes(user_id),
          corp_feed_comments(id),
          corp_feed_attachments(id, file_url, file_name, file_type, file_size, mime_type),
          corp_feed_mentions(id, mention_type, mention_value, display_name)
        `)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;

      // Fetch author roles for all posts
      const authorIds = [...new Set((data || []).map((p: any) => p.author_id))];
      const { data: rolesData } = authorIds.length > 0
        ? await supabase.from('user_roles').select('user_id, role').in('user_id', authorIds)
        : { data: [] };
      const roleMap = new Map((rolesData || []).map((r: any) => [r.user_id, r.role]));

      // Fetch author group memberships
      const { data: memberData } = authorIds.length > 0
        ? await supabase
            .from('corp_group_members')
            .select('user_id, corp_groups:corp_groups!corp_group_members_group_id_fkey(name)')
            .in('user_id', authorIds)
        : { data: [] };
      const groupMap = new Map<string, { name: string }[]>();
      (memberData || []).forEach((m: any) => {
        const list = groupMap.get(m.user_id) || [];
        if (m.corp_groups?.name) list.push({ name: m.corp_groups.name });
        groupMap.set(m.user_id, list);
      });

      return (data || []).map((post: any) => ({
        ...post,
        likes_count: post.corp_feed_likes?.length || 0,
        comments_count: post.corp_feed_comments?.length || 0,
        liked_by_me: post.corp_feed_likes?.some((l: any) => l.user_id === user?.id) || false,
        attachments: post.corp_feed_attachments || [],
        mentions: post.corp_feed_mentions || [],
        author_role: roleMap.get(post.author_id) || null,
        author_groups: groupMap.get(post.author_id) || [],
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

  const saveMentions = async (postId: string, mentions: MentionItem[]) => {
    if (mentions.length === 0) return;
    const rows = mentions.map((m) => ({
      post_id: postId,
      mention_type: m.type,
      mention_value: m.value,
      display_name: m.displayName,
    }));
    const { error } = await supabase.from('corp_feed_mentions').insert(rows);
    if (error) throw error;
  };

  const createPost = useMutation({
    mutationFn: async (post: {
      company_id: string;
      title?: string;
      content: string;
      post_type?: string;
      pinned?: boolean;
      files?: File[];
      mentions?: MentionItem[];
    }) => {
      const { files, mentions, ...postData } = post;
      const { data, error } = await supabase
        .from('corp_feed_posts')
        .insert({ ...postData, author_id: user!.id })
        .select().single();
      if (error) throw error;

      if (files && files.length > 0) {
        await uploadAttachments(data.id, files);
      }
      if (mentions && mentions.length > 0) {
        await saveMentions(data.id, mentions);
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
