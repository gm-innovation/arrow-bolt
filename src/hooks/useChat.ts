import { useState, useEffect, useCallback } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Conversation {
  id: string;
  title: string | null;
  conversation_type: string | null;
  service_order_id: string | null;
  created_at: string | null;
  updated_at: string | null;
  company_id: string;
  last_message?: Message;
  unread_count?: number;
  participants?: Participant[];
}

export interface Participant {
  id: string;
  user_id: string;
  joined_at: string | null;
  last_read_at: string | null;
  profile?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export interface Message {
  id: string;
  conversation_id: string;
  sender_id: string;
  content: string;
  message_type: string | null;
  attachment_url: string | null;
  created_at: string | null;
  edited_at: string | null;
  sender?: {
    full_name: string;
    avatar_url: string | null;
  };
}

export const useChat = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);

  // Fetch all conversations for the user
  const { data: conversations = [], isLoading: loadingConversations } = useQuery({
    queryKey: ['conversations', user?.id],
    queryFn: async () => {
      if (!user?.id) return [];

      const { data, error } = await supabase
        .from('conversation_participants')
        .select(`
          conversation_id,
          last_read_at,
          conversations (
            id,
            title,
            conversation_type,
            service_order_id,
            created_at,
            updated_at,
            company_id
          )
        `)
        .eq('user_id', user.id);

      if (error) throw error;

      // Get last message and unread count for each conversation
      const conversationsWithDetails = await Promise.all(
        (data || []).map(async (item) => {
          const conv = item.conversations as any;
          
          // Get last message
          const { data: lastMsg } = await supabase
            .from('messages')
            .select('*')
            .eq('conversation_id', conv.id)
            .order('created_at', { ascending: false })
            .limit(1)
            .single();

          // Get unread count
          const lastReadAt = item.last_read_at || '1970-01-01';
          const { count } = await supabase
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('conversation_id', conv.id)
            .gt('created_at', lastReadAt)
            .neq('sender_id', user.id);

          return {
            ...conv,
            last_message: lastMsg,
            unread_count: count || 0,
          } as Conversation;
        })
      );

      return conversationsWithDetails.sort((a, b) => {
        const aTime = a.last_message?.created_at || a.created_at || '';
        const bTime = b.last_message?.created_at || b.created_at || '';
        return new Date(bTime).getTime() - new Date(aTime).getTime();
      });
    },
    enabled: !!user?.id,
  });

  // Fetch messages for active conversation
  const { data: messages = [], isLoading: loadingMessages } = useQuery({
    queryKey: ['messages', activeConversationId],
    queryFn: async () => {
      if (!activeConversationId) return [];

      const { data, error } = await supabase
        .from('messages')
        .select(`
          *,
          sender:profiles!messages_sender_id_fkey (
            full_name,
            avatar_url
          )
        `)
        .eq('conversation_id', activeConversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;
      
      return (data || []).map(msg => ({
        ...msg,
        sender: Array.isArray(msg.sender) ? msg.sender[0] : msg.sender
      })) as Message[];
    },
    enabled: !!activeConversationId,
  });

  // Real-time subscription for messages
  useEffect(() => {
    if (!activeConversationId) return;

    const channel = supabase
      .channel(`messages-${activeConversationId}`)
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'messages',
          filter: `conversation_id=eq.${activeConversationId}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['messages', activeConversationId] });
          queryClient.invalidateQueries({ queryKey: ['conversations'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeConversationId, queryClient]);

  // Send message mutation
  const sendMessage = useMutation({
    mutationFn: async ({ content, attachmentUrl }: { content: string; attachmentUrl?: string }) => {
      if (!user?.id || !activeConversationId) throw new Error('No active conversation');

      const { data, error } = await supabase
        .from('messages')
        .insert({
          conversation_id: activeConversationId,
          sender_id: user.id,
          content,
          attachment_url: attachmentUrl,
          message_type: attachmentUrl ? 'file' : 'text',
        })
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['messages', activeConversationId] });
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
    },
  });

  // Create conversation mutation
  const createConversation = useMutation({
    mutationFn: async ({ 
      title, 
      participantIds, 
      type = 'direct',
      serviceOrderId 
    }: { 
      title?: string; 
      participantIds: string[]; 
      type?: string;
      serviceOrderId?: string;
    }) => {
      if (!user?.id) throw new Error('Not authenticated');

      // Get user's company_id
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) throw new Error('No company found');

      // Create conversation
      const { data: conversation, error: convError } = await supabase
        .from('conversations')
        .insert({
          title,
          conversation_type: type,
          service_order_id: serviceOrderId,
          company_id: profile.company_id,
          created_by: user.id,
        })
        .select()
        .single();

      if (convError) throw convError;

      // Add participants (including creator)
      const allParticipants = [...new Set([user.id, ...participantIds])];
      const { error: partError } = await supabase
        .from('conversation_participants')
        .insert(
          allParticipants.map(userId => ({
            conversation_id: conversation.id,
            user_id: userId,
          }))
        );

      if (partError) throw partError;

      return conversation;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['conversations'] });
      setActiveConversationId(data.id);
    },
  });

  // Mark conversation as read
  const markAsRead = useCallback(async (conversationId: string) => {
    if (!user?.id) return;

    await supabase.rpc('mark_messages_as_read', {
      _conversation_id: conversationId
    });

    queryClient.invalidateQueries({ queryKey: ['conversations'] });
  }, [user?.id, queryClient]);

  // Get total unread count
  const totalUnreadCount = conversations.reduce((sum, conv) => sum + (conv.unread_count || 0), 0);

  return {
    conversations,
    messages,
    activeConversationId,
    setActiveConversationId,
    loadingConversations,
    loadingMessages,
    sendMessage: sendMessage.mutate,
    isSending: sendMessage.isPending,
    createConversation: createConversation.mutate,
    isCreating: createConversation.isPending,
    markAsRead,
    totalUnreadCount,
  };
};
