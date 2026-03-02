import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Award } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

const CATEGORY_EMOJI: Record<string, string> = {
  teamwork: '🤝',
  innovation: '🚀',
  leadership: '👑',
  helpfulness: '💚',
  excellence: '⭐',
};

interface Props {
  companyId: string;
}

const FeedKudosCard = ({ companyId }: Props) => {
  const { data: topKudos = [] } = useQuery({
    queryKey: ['corp-kudos-top', companyId],
    queryFn: async () => {
      const startOfMonth = new Date();
      startOfMonth.setDate(1);
      startOfMonth.setHours(0, 0, 0, 0);

      const { data } = await (supabase as any)
        .from('corp_kudos')
        .select('to_user_id, profiles!corp_kudos_to_user_id_fkey(full_name, avatar_url)')
        .eq('company_id', companyId)
        .gte('created_at', startOfMonth.toISOString());

      const countMap = new Map<string, { name: string; avatar?: string; count: number }>();
      (data || []).forEach((k: any) => {
        const existing = countMap.get(k.to_user_id);
        if (existing) {
          existing.count++;
        } else {
          countMap.set(k.to_user_id, {
            name: k.profiles?.full_name || 'Usuário',
            avatar: k.profiles?.avatar_url,
            count: 1,
          });
        }
      });

      return Array.from(countMap.entries())
        .map(([id, v]) => ({ id, ...v }))
        .sort((a, b) => b.count - a.count)
        .slice(0, 5);
    },
    enabled: !!companyId,
  });

  if (topKudos.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2 px-4 pt-4">
        <CardTitle className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wider">
          <Award className="h-3.5 w-3.5 text-amber-500" />
          Top Kudos do Mês
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <div className="space-y-2.5">
          {topKudos.map((k, i) => {
            const initials = k.name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '??';
            return (
              <div key={k.id} className="flex items-center gap-2">
                <span className="text-xs font-bold text-muted-foreground w-4">{i + 1}.</span>
                <Avatar className="h-7 w-7">
                  {k.avatar && <AvatarImage src={k.avatar} />}
                  <AvatarFallback className="text-[9px]">{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{k.name}</p>
                </div>
                <span className="text-xs font-semibold text-amber-600">{k.count} 🏆</span>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default FeedKudosCard;
