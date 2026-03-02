import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Award } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';

interface Props {
  companyId: string;
}

const FeedBadgesCard = ({ companyId }: Props) => {
  const { data: badges = [] } = useQuery({
    queryKey: ['corp-badges-recent', companyId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('corp_badges')
        .select('*, user:profiles!corp_badges_user_id_fkey(full_name, avatar_url)')
        .eq('company_id', companyId)
        .order('awarded_at', { ascending: false })
        .limit(8);
      return data || [];
    },
    enabled: !!companyId,
  });

  if (badges.length === 0) return null;

  return (
    <Card>
      <CardHeader className="pb-2 px-4 pt-4">
        <CardTitle className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wider">
          <Award className="h-3.5 w-3.5 text-amber-500" />
          Conquistas Recentes
        </CardTitle>
      </CardHeader>
      <CardContent className="px-4 pb-4 pt-0">
        <div className="space-y-2.5">
          {badges.map((b: any) => {
            const initials = b.user?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '??';
            return (
              <div key={b.id} className="flex items-center gap-2">
                <span className="text-sm shrink-0">{b.icon || '🏆'}</span>
                <Avatar className="h-7 w-7 shrink-0">
                  {b.user?.avatar_url && <AvatarImage src={b.user.avatar_url} />}
                  <AvatarFallback className="text-[9px]">{initials}</AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-medium truncate">{b.user?.full_name}</p>
                  <p className="text-[10px] text-muted-foreground truncate">{b.title}</p>
                </div>
              </div>
            );
          })}
        </div>
      </CardContent>
    </Card>
  );
};

export default FeedBadgesCard;
