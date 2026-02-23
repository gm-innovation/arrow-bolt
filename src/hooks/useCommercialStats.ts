import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { startOfMonth, endOfMonth } from 'date-fns';

export interface CommercialKPIs {
  pipelineTotal: number;
  openOpportunities: number;
  conversionRate: number;
  monthlyClosedValue: number;
}

export interface StageStat {
  stage: string;
  label: string;
  count: number;
  value: number;
  color: string;
}

const STAGE_CONFIG: Record<string, { label: string; color: string }> = {
  identified: { label: 'Identificada', color: 'hsl(210, 80%, 55%)' },
  qualified: { label: 'Qualificada', color: 'hsl(200, 80%, 50%)' },
  proposal: { label: 'Proposta', color: 'hsl(45, 90%, 50%)' },
  negotiation: { label: 'Negociação', color: 'hsl(30, 90%, 55%)' },
  closed_won: { label: 'Fechada (Ganha)', color: 'hsl(140, 70%, 45%)' },
  closed_lost: { label: 'Fechada (Perdida)', color: 'hsl(0, 70%, 55%)' },
};

export const useCommercialStats = () => {
  const { user } = useAuth();

  return useQuery({
    queryKey: ['commercial-stats', user?.id],
    queryFn: async () => {
      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user!.id)
        .single();

      if (!profile?.company_id) throw new Error('Empresa não encontrada');

      const { data: opportunities, error } = await supabase
        .from('crm_opportunities')
        .select('stage, estimated_value, closed_at')
        .eq('company_id', profile.company_id);

      if (error) throw error;

      const all = opportunities || [];
      const now = new Date();
      const monthStart = startOfMonth(now).toISOString();
      const monthEnd = endOfMonth(now).toISOString();

      // KPIs
      const openStages = ['identified', 'qualified', 'proposal', 'negotiation'];
      const pipelineTotal = all
        .filter(o => openStages.includes(o.stage))
        .reduce((sum, o) => sum + (o.estimated_value || 0), 0);

      const openOpportunities = all.filter(o => openStages.includes(o.stage)).length;

      const closedWon = all.filter(o => o.stage === 'closed_won').length;
      const closedLost = all.filter(o => o.stage === 'closed_lost').length;
      const totalClosed = closedWon + closedLost;
      const conversionRate = totalClosed > 0 ? (closedWon / totalClosed) * 100 : 0;

      const monthlyClosedValue = all
        .filter(o => o.stage === 'closed_won' && o.closed_at && o.closed_at >= monthStart && o.closed_at <= monthEnd)
        .reduce((sum, o) => sum + (o.estimated_value || 0), 0);

      // Stage stats for chart
      const stageStats: StageStat[] = Object.entries(STAGE_CONFIG).map(([stage, config]) => {
        const stageOpps = all.filter(o => o.stage === stage);
        return {
          stage,
          label: config.label,
          count: stageOpps.length,
          value: stageOpps.reduce((sum, o) => sum + (o.estimated_value || 0), 0),
          color: config.color,
        };
      });

      const kpis: CommercialKPIs = { pipelineTotal, openOpportunities, conversionRate, monthlyClosedValue };

      return { kpis, stageStats };
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });
};
