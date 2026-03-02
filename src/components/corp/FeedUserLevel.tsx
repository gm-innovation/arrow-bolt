import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { Progress } from '@/components/ui/progress';

const TIERS = [
  { name: 'Bronze', minXp: 0, icon: '🥉' },
  { name: 'Prata', minXp: 100, icon: '🥈' },
  { name: 'Ouro', minXp: 300, icon: '🥇' },
  { name: 'Diamante', minXp: 600, icon: '💎' },
  { name: 'Rubi', minXp: 1000, icon: '❤️‍🔥' },
];

function getTier(xp: number) {
  let current = TIERS[0];
  let nextIndex = 1;
  for (let i = TIERS.length - 1; i >= 0; i--) {
    if (xp >= TIERS[i].minXp) {
      current = TIERS[i];
      nextIndex = i + 1;
      break;
    }
  }
  const next = nextIndex < TIERS.length ? TIERS[nextIndex] : null;
  const progress = next
    ? ((xp - current.minXp) / (next.minXp - current.minXp)) * 100
    : 100;
  return { current, next, progress: Math.min(progress, 100) };
}

interface Props {
  userId: string;
  companyId: string;
}

const FeedUserLevel = ({ userId, companyId }: Props) => {
  const { data } = useQuery({
    queryKey: ['user-xp', userId, companyId],
    queryFn: async () => {
      const { data: badges } = await (supabase as any)
        .from('corp_badges')
        .select('xp_value')
        .eq('user_id', userId)
        .eq('company_id', companyId);
      const totalXp = (badges || []).reduce((sum: number, b: any) => sum + (b.xp_value || 10), 0);
      const count = (badges || []).length;
      return { totalXp, count };
    },
    enabled: !!userId && !!companyId,
  });

  if (!data) return null;

  const { totalXp, count } = data;
  const { current, next, progress } = getTier(totalXp);

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5">
          <span className="text-sm">{current.icon}</span>
          <span className="text-[11px] font-semibold text-foreground">{current.name}</span>
        </div>
        <span className="text-[10px] text-muted-foreground font-medium">{totalXp} XP · {count} 🏆</span>
      </div>
      <Progress value={progress} className="h-1.5" />
      {next && (
        <p className="text-[9px] text-muted-foreground text-right">
          {next.minXp - totalXp} XP para {next.icon} {next.name}
        </p>
      )}
    </div>
  );
};

export default FeedUserLevel;
