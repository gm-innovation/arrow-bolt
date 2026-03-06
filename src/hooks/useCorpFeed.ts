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
          corp_feed_likes(user_id, reaction_type),
          corp_feed_comments(id),
          corp_feed_attachments(id, file_url, file_name, file_type, file_size, mime_type),
          corp_feed_mentions(id, mention_type, mention_value, display_name)
        `)
        .order('pinned', { ascending: false })
        .order('created_at', { ascending: false });
      if (error) throw error;

      const authorIds = [...new Set((data || []).map((p: any) => p.author_id))];
      const { data: rolesData } = authorIds.length > 0
        ? await supabase.from('user_roles').select('user_id, role').in('user_id', authorIds)
        : { data: [] };
      const roleMap = new Map((rolesData || []).map((r: any) => [r.user_id, r.role]));

      const { data: memberData } = authorIds.length > 0
        ? await supabase.from('corp_group_members')
            .select('user_id, corp_groups:corp_groups!corp_group_members_group_id_fkey(name)')
            .in('user_id', authorIds)
        : { data: [] };
      const groupMap = new Map<string, { name: string }[]>();
      (memberData || []).forEach((m: any) => {
        const list = groupMap.get(m.user_id) || [];
        if (m.corp_groups?.name) list.push({ name: m.corp_groups.name });
        groupMap.set(m.user_id, list);
      });

      return (data || []).map((post: any) => {
        const likes = post.corp_feed_likes || [];
        const reactionCounts: Record<string, number> = {};
        let myReaction: string | null = null;
        likes.forEach((l: any) => {
          const type = l.reaction_type || 'like';
          reactionCounts[type] = (reactionCounts[type] || 0) + 1;
          if (l.user_id === user?.id) myReaction = type;
        });
        const totalReactions = likes.length;

        return {
          ...post,
          total_reactions: totalReactions,
          reaction_counts: reactionCounts,
          my_reaction: myReaction,
          comments_count: post.corp_feed_comments?.length || 0,
          attachments: post.corp_feed_attachments || [],
          mentions: post.corp_feed_mentions || [],
          author_role: roleMap.get(post.author_id) || null,
          author_groups: groupMap.get(post.author_id) || [],
        };
      });
    },
    enabled: !!user,
  });

  const { data: comments = {} } = useQuery({
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
      const ext = file.name.includes('.') ? file.name.substring(file.name.lastIndexOf('.')) : '';
      const path = `${user!.id}/${postId}/${crypto.randomUUID()}${ext}`;
      const { error: uploadError } = await supabase.storage
        .from('corp-feed-media')
        .upload(path, file, { cacheControl: '3600', upsert: false });
      if (uploadError) throw uploadError;
      const { data: urlData } = supabase.storage.from('corp-feed-media').getPublicUrl(path);
      const { error: insertError } = await supabase.from('corp_feed_attachments').insert({
        post_id: postId, file_url: urlData.publicUrl, file_name: file.name,
        file_type: getFileType(file.type), file_size: file.size, mime_type: file.type,
      });
      if (insertError) throw insertError;
    }
  };

  const saveMentions = async (postId: string, mentions: MentionItem[]) => {
    if (mentions.length === 0) return;
    const rows = mentions.map((m) => ({
      post_id: postId, mention_type: m.type, mention_value: m.value, display_name: m.displayName,
    }));
    const { error } = await supabase.from('corp_feed_mentions').insert(rows);
    if (error) throw error;
  };

  const createPoll = async (postId: string, poll: { question: string; options: string[]; group_id?: string }) => {
    const { data: pollRow, error: pollErr } = await (supabase as any)
      .from('corp_feed_polls')
      .insert({ post_id: postId, question: poll.question, group_id: poll.group_id || null })
      .select().single();
    if (pollErr) throw pollErr;
    const optionRows = poll.options.map((opt, i) => ({
      poll_id: pollRow.id, option_text: opt, position: i,
    }));
    const { error: optErr } = await (supabase as any).from('corp_feed_poll_options').insert(optionRows);
    if (optErr) throw optErr;
  };

  const createPost = useMutation({
    mutationFn: async (post: {
      company_id: string; title?: string; content: string; post_type?: string;
      pinned?: boolean; files?: File[]; mentions?: MentionItem[];
      poll?: { question: string; options: string[]; group_id?: string };
    }) => {
      const { files, mentions, poll, ...postData } = post;
      const { data, error } = await supabase
        .from('corp_feed_posts')
        .insert({ ...postData, author_id: user!.id })
        .select().single();
      if (error) throw error;
      if (files && files.length > 0) await uploadAttachments(data.id, files);
      if (mentions && mentions.length > 0) await saveMentions(data.id, mentions);
      if (poll) await createPoll(data.id, poll);
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corp-feed'] });
      toast({ title: 'Post publicado' });
    },
    onError: (error: any) => toast({ title: 'Erro ao publicar', description: error.message, variant: 'destructive' }),
  });

  const updatePost = useMutation({
    mutationFn: async ({ id, ...updates }: { id: string; [key: string]: any }) => {
      const { data, error } = await supabase.from('corp_feed_posts').update(updates).eq('id', id).select().single();
      if (error) throw error;
      return data;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['corp-feed'] }); toast({ title: 'Post atualizado' }); },
    onError: (error: any) => toast({ title: 'Erro ao atualizar', description: error.message, variant: 'destructive' }),
  });

  const deletePost = useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('corp_feed_posts').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => { queryClient.invalidateQueries({ queryKey: ['corp-feed'] }); toast({ title: 'Post removido' }); },
    onError: (error: any) => toast({ title: 'Erro ao remover', description: error.message, variant: 'destructive' }),
  });

  const reactToPost = useMutation({
    mutationFn: async ({ postId, reactionType }: { postId: string; reactionType: string }) => {
      // Remove existing reaction first
      await supabase.from('corp_feed_likes').delete().eq('post_id', postId).eq('user_id', user!.id);
      // Insert new reaction
      const { error } = await supabase.from('corp_feed_likes')
        .insert({ post_id: postId, user_id: user!.id, reaction_type: reactionType } as any);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['corp-feed'] }),
  });

  const removeReaction = useMutation({
    mutationFn: async (postId: string) => {
      const { error } = await supabase.from('corp_feed_likes').delete().eq('post_id', postId).eq('user_id', user!.id);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['corp-feed'] }),
  });

  const addComment = useMutation({
    mutationFn: async ({ postId, content }: { postId: string; content: string }) => {
      const { error } = await supabase.from('corp_feed_comments').insert({ post_id: postId, author_id: user!.id, content });
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corp-feed'] });
      queryClient.invalidateQueries({ queryKey: ['corp-feed-comments'] });
    },
    onError: (error: any) => toast({ title: 'Erro ao comentar', description: error.message, variant: 'destructive' }),
  });

  const deleteComment = useMutation({
    mutationFn: async (commentId: string) => {
      const { error } = await supabase.from('corp_feed_comments').delete().eq('id', commentId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['corp-feed'] });
      queryClient.invalidateQueries({ queryKey: ['corp-feed-comments'] });
    },
  });

  return {
    posts, isLoading, comments,
    createPost, updatePost, deletePost,
    reactToPost, removeReaction,
    addComment, deleteComment,
  };
};
