import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';
import type { Json } from '@/integrations/supabase/types';

export interface AIMessage {
  id?: string;
  role: 'user' | 'assistant';
  content: string;
  image?: string;
  metadata?: Record<string, unknown>;
  created_at?: string;
}

export interface AIConversation {
  id: string;
  title: string | null;
  context: Json;
  created_at: string;
  updated_at: string;
}

export interface ProactiveAlert {
  id: string;
  alert_type: string;
  title: string;
  message: string;
  reference_data?: Json;
}

export interface ReportFields {
  reportedIssue: string;
  executedWork: string;
  result: string;
  brandInfo?: string;
  modelInfo?: string;
  serialNumber?: string;
  observations?: string;
}

interface UseAIChatOptions {
  userRole: string;
  context?: {
    taskTypeId?: string;
    serviceOrderId?: string;
    companyId?: string;
    currentScreen?: string;
    taskId?: string;
    taskData?: Record<string, unknown>;
    serviceOrderData?: Record<string, unknown>;
  };
}

const CHAT_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;

export function useAIChat({ userRole, context }: UseAIChatOptions) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<AIMessage[]>([]);
  const [conversations, setConversations] = useState<AIConversation[]>([]);
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isLoadingConversations, setIsLoadingConversations] = useState(false);
  const [reportPreview, setReportPreview] = useState<ReportFields | null>(null);
  const [proactiveAlerts, setProactiveAlerts] = useState<ProactiveAlert[]>([]);
  const [userCompanyId, setUserCompanyId] = useState<string | null>(context?.companyId || null);

  // Fetch user's company ID if not provided in context
  useEffect(() => {
    const fetchCompanyId = async () => {
      if (!user?.id || context?.companyId) return;
      
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();
      
      if (profile?.company_id) {
        setUserCompanyId(profile.company_id);
      }
    };
    
    fetchCompanyId();
  }, [user?.id, context?.companyId]);

  // Fetch proactive alerts
  const fetchProactiveAlerts = useCallback(async () => {
    if (!user?.id) return;
    
    try {
      const { data, error } = await supabase
        .from('ai_proactive_alerts')
        .select('id, alert_type, title, message, reference_data')
        .eq('user_id', user.id)
        .eq('read', false)
        .order('created_at', { ascending: false })
        .limit(5);

      if (error) throw error;
      setProactiveAlerts(data || []);
    } catch (error) {
      console.error('Error fetching proactive alerts:', error);
    }
  }, [user?.id]);

  // Dismiss alert
  const dismissAlert = useCallback(async (alertId: string) => {
    try {
      await supabase
        .from('ai_proactive_alerts')
        .update({ read: true })
        .eq('id', alertId);
      
      setProactiveAlerts(prev => prev.filter(a => a.id !== alertId));
    } catch (error) {
      console.error('Error dismissing alert:', error);
    }
  }, []);

  // Fetch user's conversations
  const fetchConversations = useCallback(async () => {
    if (!user?.id) return;
    
    setIsLoadingConversations(true);
    try {
      const { data, error } = await supabase
        .from('ai_conversations')
        .select('*')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(20);

      if (error) throw error;
      setConversations((data as AIConversation[]) || []);
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setIsLoadingConversations(false);
    }
  }, [user?.id]);

  // Load messages for a conversation
  const loadConversation = useCallback(async (conversationId: string) => {
    if (!user?.id) return;

    try {
      const { data, error } = await supabase
        .from('ai_messages')
        .select('*')
        .eq('conversation_id', conversationId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      setMessages(data?.map(m => ({
        id: m.id,
        role: m.role as 'user' | 'assistant',
        content: m.content,
        metadata: m.metadata as Record<string, unknown> | undefined,
        created_at: m.created_at || undefined
      })) || []);
      setCurrentConversationId(conversationId);
    } catch (error) {
      console.error('Error loading conversation:', error);
      toast.error('Erro ao carregar conversa');
    }
  }, [user?.id]);

  // Create a new conversation
  const createConversation = useCallback(async (firstMessage?: string): Promise<string | null> => {
    if (!user?.id) return null;

    try {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      const title = firstMessage 
        ? firstMessage.slice(0, 50) + (firstMessage.length > 50 ? '...' : '')
        : 'Nova conversa';

      const { data, error } = await supabase
        .from('ai_conversations')
        .insert({
          user_id: user.id,
          company_id: profile?.company_id || null,
          title,
          context: (context || {}) as Json
        })
        .select()
        .single();

      if (error) throw error;

      setCurrentConversationId(data.id);
      setConversations(prev => [data as AIConversation, ...prev]);
      return data.id;
    } catch (error) {
      console.error('Error creating conversation:', error);
      return null;
    }
  }, [user?.id, context]);

  // Save a message to the database
  const saveMessage = useCallback(async (
    conversationId: string,
    role: 'user' | 'assistant',
    content: string,
    metadata?: Record<string, unknown>
  ): Promise<string | null> => {
    try {
      const { data, error } = await supabase
        .from('ai_messages')
        .insert({
          conversation_id: conversationId,
          role,
          content,
          metadata: (metadata || {}) as Json
        })
        .select()
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error saving message:', error);
      return null;
    }
  }, []);

  // Update conversation title based on first message
  const updateConversationTitle = useCallback(async (conversationId: string, title: string) => {
    try {
      await supabase
        .from('ai_conversations')
        .update({ title: title.slice(0, 50) + (title.length > 50 ? '...' : '') })
        .eq('id', conversationId);
    } catch (error) {
      console.error('Error updating conversation title:', error);
    }
  }, []);

  // Send a message
  const sendMessage = useCallback(async (messageText: string, image?: string) => {
    if (!messageText.trim() || isLoading || !user?.id) return;

    setIsLoading(true);
    let conversationId = currentConversationId;
    const startTime = Date.now();

    // Create conversation if needed
    if (!conversationId) {
      conversationId = await createConversation(messageText);
      if (!conversationId) {
        toast.error('Erro ao criar conversa');
        setIsLoading(false);
        return;
      }
    }

    // Add user message to UI
    const userMsg: AIMessage = { role: 'user', content: messageText.trim(), image };
    setMessages(prev => [...prev, userMsg]);

    // Save user message
    await saveMessage(conversationId, 'user', messageText.trim(), image ? { has_image: true } : undefined);

    // Update title if first message
    if (messages.length === 0) {
      await updateConversationTitle(conversationId, messageText);
    }

    let assistantContent = '';

    try {
      const response = await fetch(CHAT_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
        },
        body: JSON.stringify({
          message: messageText,
          image,
          userRole,
          context: {
            ...context,
            companyId: context?.companyId || userCompanyId,
            conversationId
          },
          messages: messages.map(m => ({ role: m.role, content: m.content }))
        }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || 'Erro ao processar sua solicitação');
      }

      // Check content type to determine response format
      const contentType = response.headers.get('content-type') || '';
      
      if (contentType.includes('application/json')) {
        // Non-streaming response (tool calling)
        const data = await response.json();
        
        if (data.type === 'report_generation' && data.fields) {
          setReportPreview(data.fields);
          assistantContent = data.message || 'Campos do relatório extraídos! Revise abaixo.';
          setMessages(prev => [...prev, { role: 'assistant', content: assistantContent }]);
        } else if (data.content) {
          assistantContent = data.content;
          setMessages(prev => [...prev, { role: 'assistant', content: assistantContent }]);
        }
      } else {
        // Streaming response
        if (!response.body) {
          throw new Error('Resposta sem conteúdo');
        }

        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let textBuffer = '';

        // Add empty assistant message
        setMessages(prev => [...prev, { role: 'assistant', content: '' }]);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          textBuffer += decoder.decode(value, { stream: true });

          let newlineIndex: number;
          while ((newlineIndex = textBuffer.indexOf('\n')) !== -1) {
            let line = textBuffer.slice(0, newlineIndex);
            textBuffer = textBuffer.slice(newlineIndex + 1);

            if (line.endsWith('\r')) line = line.slice(0, -1);
            if (line.startsWith(':') || line.trim() === '') continue;
            if (!line.startsWith('data: ')) continue;

            const jsonStr = line.slice(6).trim();
            if (jsonStr === '[DONE]') break;

            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                assistantContent += content;
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastIdx = newMessages.length - 1;
                  if (newMessages[lastIdx]?.role === 'assistant') {
                    newMessages[lastIdx] = { ...newMessages[lastIdx], content: assistantContent };
                  }
                  return newMessages;
                });
              }
            } catch {
              textBuffer = line + '\n' + textBuffer;
              break;
            }
          }
        }

        // Process remaining buffer
        if (textBuffer.trim()) {
          for (let raw of textBuffer.split('\n')) {
            if (!raw) continue;
            if (raw.endsWith('\r')) raw = raw.slice(0, -1);
            if (raw.startsWith(':') || raw.trim() === '') continue;
            if (!raw.startsWith('data: ')) continue;
            const jsonStr = raw.slice(6).trim();
            if (jsonStr === '[DONE]') continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const content = parsed.choices?.[0]?.delta?.content;
              if (content) {
                assistantContent += content;
                setMessages(prev => {
                  const newMessages = [...prev];
                  const lastIdx = newMessages.length - 1;
                  if (newMessages[lastIdx]?.role === 'assistant') {
                    newMessages[lastIdx] = { ...newMessages[lastIdx], content: assistantContent };
                  }
                  return newMessages;
                });
              }
            } catch { /* ignore */ }
          }
        }
      }

      // Save assistant message with metadata
      const responseTime = Date.now() - startTime;
      const messageId = await saveMessage(conversationId, 'assistant', assistantContent, {
        response_time_ms: responseTime,
        model: image ? 'google/gemini-2.5-pro' : 'google/gemini-2.5-flash'
      });

      // Update the message with its ID for feedback
      if (messageId) {
        setMessages(prev => {
          const newMessages = [...prev];
          const lastIdx = newMessages.length - 1;
          if (newMessages[lastIdx]?.role === 'assistant') {
            newMessages[lastIdx] = { ...newMessages[lastIdx], id: messageId };
          }
          return newMessages;
        });
      }

    } catch (error) {
      console.error('AI Chat error:', error);
      toast.error(error instanceof Error ? error.message : 'Erro ao processar sua solicitação');
      setMessages(prev => prev.filter((_, i) => i !== prev.length - 1 || prev[prev.length - 1].content !== ''));
    } finally {
      setIsLoading(false);
    }
  }, [currentConversationId, messages, user?.id, userRole, context, userCompanyId, isLoading, createConversation, saveMessage, updateConversationTitle]);

  // Start a new conversation
  const startNewConversation = useCallback(() => {
    setCurrentConversationId(null);
    setMessages([]);
    setReportPreview(null);
  }, []);

  // Clear report preview
  const clearReportPreview = useCallback(() => {
    setReportPreview(null);
  }, []);

  // Delete a conversation
  const deleteConversation = useCallback(async (conversationId: string) => {
    try {
      const { error } = await supabase
        .from('ai_conversations')
        .delete()
        .eq('id', conversationId);

      if (error) throw error;

      setConversations(prev => prev.filter(c => c.id !== conversationId));
      if (currentConversationId === conversationId) {
        startNewConversation();
      }
      toast.success('Conversa excluída');
    } catch (error) {
      console.error('Error deleting conversation:', error);
      toast.error('Erro ao excluir conversa');
    }
  }, [currentConversationId, startNewConversation]);

  // Submit feedback
  const submitFeedback = useCallback(async (
    messageId: string,
    rating: 'positive' | 'negative',
    comment?: string
  ) => {
    if (!user?.id) return;

    try {
      const { error } = await supabase
        .from('ai_feedback')
        .insert({
          message_id: messageId,
          user_id: user.id,
          rating,
          comment
        });

      if (error) throw error;
      toast.success('Feedback enviado!');
    } catch (error) {
      console.error('Error submitting feedback:', error);
      toast.error('Erro ao enviar feedback');
    }
  }, [user?.id]);

  // Load conversations and alerts on mount
  useEffect(() => {
    fetchConversations();
    fetchProactiveAlerts();
  }, [fetchConversations, fetchProactiveAlerts]);

  return {
    messages,
    conversations,
    currentConversationId,
    isLoading,
    isLoadingConversations,
    reportPreview,
    proactiveAlerts,
    sendMessage,
    loadConversation,
    startNewConversation,
    deleteConversation,
    submitFeedback,
    fetchConversations,
    clearReportPreview,
    dismissAlert
  };
}
