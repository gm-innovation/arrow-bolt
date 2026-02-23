import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useCorpAuditLog = (filters?: { entity_type?: string; limit?: number }) => {
  const { user } = useAuth();

  const { data: logs = [], isLoading } = useQuery({
    queryKey: ['corp-audit-log', filters],
    queryFn: async () => {
      let query = supabase
        .from('corp_audit_log')
        .select('*, user:profiles!corp_audit_log_user_id_fkey(id, full_name)')
        .order('created_at', { ascending: false })
        .limit(filters?.limit || 100);

      if (filters?.entity_type) query = query.eq('entity_type', filters.entity_type);

      const { data, error } = await query;
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  return { logs, isLoading };
};
