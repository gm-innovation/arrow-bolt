import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export const useCorpDashboard = () => {
  const { user } = useAuth();

  const { data: stats, isLoading } = useQuery({
    queryKey: ['corp-dashboard'],
    queryFn: async () => {
      const { data: requests, error } = await supabase
        .from('corp_requests')
        .select('id, status, amount, created_at, department_id');
      if (error) throw error;

      const total = requests?.length || 0;
      const pending_manager = requests?.filter(r => r.status === 'pending_manager').length || 0;
      const pending_director = requests?.filter(r => r.status === 'pending_director').length || 0;
      const approved = requests?.filter(r => r.status === 'approved').length || 0;
      const rejected = requests?.filter(r => r.status === 'rejected').length || 0;
      const total_approved_amount = requests
        ?.filter(r => r.status === 'approved' && r.amount)
        .reduce((sum, r) => sum + (r.amount || 0), 0) || 0;

      return {
        total, pending_manager, pending_director, approved, rejected,
        total_approved_amount,
        requests: requests || [],
      };
    },
    enabled: !!user,
  });

  return { stats, isLoading };
};
