import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfDay, subDays, format } from 'date-fns';

interface UsageMetrics {
  totalConversations: number;
  totalMessages: number;
  uniqueUsers: number;
  avgResponseTime: number | null;
}

interface SatisfactionData {
  rating: string;
  count: number;
  percentage: number;
}

interface DailyUsage {
  date: string;
  conversations: number;
  messages: number;
}

interface TopQuestion {
  question: string;
  count: number;
}

interface NegativeFeedback {
  id: string;
  comment: string;
  created_at: string;
  message_content: string;
}

export function useAIAnalytics(period: '7d' | '30d' | '90d' = '30d') {
  const { user, userRole } = useAuth();
  
  const daysBack = period === '7d' ? 7 : period === '30d' ? 30 : 90;
  const startDate = startOfDay(subDays(new Date(), daysBack));

  // Fetch company ID from profile
  const { data: profileData } = useQuery({
    queryKey: ['user-profile-company', user?.id],
    queryFn: async () => {
      if (!user?.id) return null;
      const { data } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();
      return data?.company_id;
    },
    enabled: !!user?.id
  });

  const companyId = profileData;

  // Fetch usage metrics
  const { data: usageMetrics, isLoading: loadingMetrics } = useQuery({
    queryKey: ['ai-analytics-metrics', period, companyId],
    queryFn: async (): Promise<UsageMetrics> => {
      let query = supabase
        .from('ai_conversations')
        .select('id, user_id, created_at')
        .gte('created_at', startDate.toISOString());

      if (userRole !== 'super_admin' && companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data: conversations, error: convError } = await query;
      if (convError) throw convError;

      const conversationIds = conversations?.map(c => c.id) || [];
      
      let messagesCount = 0;
      if (conversationIds.length > 0) {
        const { count, error: msgError } = await supabase
          .from('ai_messages')
          .select('*', { count: 'exact', head: true })
          .in('conversation_id', conversationIds);
        
        if (msgError) throw msgError;
        messagesCount = count || 0;
      }

      const uniqueUsers = new Set(conversations?.map(c => c.user_id) || []).size;

      return {
        totalConversations: conversations?.length || 0,
        totalMessages: messagesCount,
        uniqueUsers,
        avgResponseTime: null // TODO: Calculate from metadata if stored
      };
    },
    enabled: !!user
  });

  // Fetch satisfaction data
  const { data: satisfactionData, isLoading: loadingSatisfaction } = useQuery({
    queryKey: ['ai-analytics-satisfaction', period, companyId],
    queryFn: async (): Promise<SatisfactionData[]> => {
      let conversationQuery = supabase
        .from('ai_conversations')
        .select('id')
        .gte('created_at', startDate.toISOString());

      if (userRole !== 'super_admin' && companyId) {
        conversationQuery = conversationQuery.eq('company_id', companyId);
      }

      const { data: conversations } = await conversationQuery;
      const conversationIds = conversations?.map(c => c.id) || [];

      if (conversationIds.length === 0) {
        return [];
      }

      // Get messages from these conversations
      const { data: messages } = await supabase
        .from('ai_messages')
        .select('id')
        .in('conversation_id', conversationIds);

      const messageIds = messages?.map(m => m.id) || [];

      if (messageIds.length === 0) {
        return [];
      }

      const { data: feedback, error } = await supabase
        .from('ai_feedback')
        .select('rating')
        .in('message_id', messageIds);

      if (error) throw error;

      const counts: Record<string, number> = {};
      feedback?.forEach(f => {
        if (f.rating) {
          counts[f.rating] = (counts[f.rating] || 0) + 1;
        }
      });

      const total = Object.values(counts).reduce((a, b) => a + b, 0);
      
      return Object.entries(counts).map(([rating, count]) => ({
        rating,
        count,
        percentage: total > 0 ? Math.round((count / total) * 100) : 0
      }));
    },
    enabled: !!user
  });

  // Fetch daily usage for chart
  const { data: dailyUsage, isLoading: loadingDaily } = useQuery({
    queryKey: ['ai-analytics-daily', period, companyId],
    queryFn: async (): Promise<DailyUsage[]> => {
      let query = supabase
        .from('ai_conversations')
        .select('id, created_at')
        .gte('created_at', startDate.toISOString());

      if (userRole !== 'super_admin' && companyId) {
        query = query.eq('company_id', companyId);
      }

      const { data: conversations, error } = await query;
      if (error) throw error;

      const conversationIds = conversations?.map(c => c.id) || [];
      
      let messages: { conversation_id: string; created_at: string }[] = [];
      if (conversationIds.length > 0) {
        const { data: msgData } = await supabase
          .from('ai_messages')
          .select('conversation_id, created_at')
          .in('conversation_id', conversationIds);
        messages = msgData || [];
      }

      // Group by date
      const dailyMap: Record<string, { conversations: Set<string>; messages: number }> = {};
      
      for (let i = 0; i < daysBack; i++) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd');
        dailyMap[date] = { conversations: new Set(), messages: 0 };
      }

      conversations?.forEach(c => {
        const date = format(new Date(c.created_at), 'yyyy-MM-dd');
        if (dailyMap[date]) {
          dailyMap[date].conversations.add(c.id);
        }
      });

      messages.forEach(m => {
        const date = format(new Date(m.created_at), 'yyyy-MM-dd');
        if (dailyMap[date]) {
          dailyMap[date].messages++;
        }
      });

      return Object.entries(dailyMap)
        .map(([date, data]) => ({
          date,
          conversations: data.conversations.size,
          messages: data.messages
        }))
        .sort((a, b) => a.date.localeCompare(b.date));
    },
    enabled: !!user
  });

  // Fetch top questions (user messages)
  const { data: topQuestions, isLoading: loadingQuestions } = useQuery({
    queryKey: ['ai-analytics-questions', period, companyId],
    queryFn: async (): Promise<TopQuestion[]> => {
      let conversationQuery = supabase
        .from('ai_conversations')
        .select('id')
        .gte('created_at', startDate.toISOString());

      if (userRole !== 'super_admin' && companyId) {
        conversationQuery = conversationQuery.eq('company_id', companyId);
      }

      const { data: conversations } = await conversationQuery;
      const conversationIds = conversations?.map(c => c.id) || [];

      if (conversationIds.length === 0) {
        return [];
      }

      const { data: messages, error } = await supabase
        .from('ai_messages')
        .select('content')
        .in('conversation_id', conversationIds)
        .eq('role', 'user')
        .order('created_at', { ascending: false })
        .limit(500);

      if (error) throw error;

      // Simple keyword extraction - count common words/phrases
      const wordCounts: Record<string, number> = {};
      const stopWords = new Set(['o', 'a', 'os', 'as', 'de', 'da', 'do', 'em', 'um', 'uma', 'que', 'para', 'com', 'não', 'por', 'mais', 'como', 'mas', 'ou', 'se', 'na', 'no', 'é', 'foi', 'ser', 'está', 'são', 'ter', 'eu', 'ele', 'ela', 'isso', 'isso', 'esse', 'essa', 'e', 'qual', 'quais', 'me', 'meu', 'minha', 'seu', 'sua']);

      messages?.forEach(m => {
        const words = m.content.toLowerCase()
          .replace(/[^\w\sáéíóúâêîôûãõàç]/g, '')
          .split(/\s+/)
          .filter(w => w.length > 3 && !stopWords.has(w));

        words.forEach(word => {
          wordCounts[word] = (wordCounts[word] || 0) + 1;
        });
      });

      return Object.entries(wordCounts)
        .sort(([, a], [, b]) => b - a)
        .slice(0, 15)
        .map(([question, count]) => ({ question, count }));
    },
    enabled: !!user
  });

  // Fetch negative feedback
  const { data: negativeFeedback, isLoading: loadingNegative } = useQuery({
    queryKey: ['ai-analytics-negative', period, companyId],
    queryFn: async (): Promise<NegativeFeedback[]> => {
      let conversationQuery = supabase
        .from('ai_conversations')
        .select('id')
        .gte('created_at', startDate.toISOString());

      if (userRole !== 'super_admin' && companyId) {
        conversationQuery = conversationQuery.eq('company_id', companyId);
      }

      const { data: conversations } = await conversationQuery;
      const conversationIds = conversations?.map(c => c.id) || [];

      if (conversationIds.length === 0) {
        return [];
      }

      const { data: messages } = await supabase
        .from('ai_messages')
        .select('id, content')
        .in('conversation_id', conversationIds)
        .eq('role', 'assistant');

      const messageMap = new Map(messages?.map(m => [m.id, m.content]) || []);
      const messageIds = messages?.map(m => m.id) || [];

      if (messageIds.length === 0) {
        return [];
      }

      const { data: feedback, error } = await supabase
        .from('ai_feedback')
        .select('id, comment, created_at, message_id')
        .in('message_id', messageIds)
        .eq('rating', 'negative')
        .order('created_at', { ascending: false })
        .limit(20);

      if (error) throw error;

      return (feedback || []).map(f => ({
        id: f.id,
        comment: f.comment || 'Sem comentário',
        created_at: f.created_at || '',
        message_content: messageMap.get(f.message_id)?.substring(0, 200) || ''
      }));
    },
    enabled: !!user
  });

  const satisfactionRate = (() => {
    if (!satisfactionData || satisfactionData.length === 0) return null;
    const positive = satisfactionData.find(s => s.rating === 'positive')?.count || 0;
    const negative = satisfactionData.find(s => s.rating === 'negative')?.count || 0;
    const total = positive + negative;
    return total > 0 ? Math.round((positive / total) * 100) : null;
  })();

  return {
    usageMetrics,
    satisfactionData,
    satisfactionRate,
    dailyUsage,
    topQuestions,
    negativeFeedback,
    isLoading: loadingMetrics || loadingSatisfaction || loadingDaily || loadingQuestions || loadingNegative
  };
}
