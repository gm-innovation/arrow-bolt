import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Cake, UserPlus, Users } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format, isThisMonth } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface FeedRightSidebarProps {
  companyId: string;
}

const FeedRightSidebar = ({ companyId }: FeedRightSidebarProps) => {
  // Birthdays this month
  const { data: birthdays = [] } = useQuery({
    queryKey: ['feed-birthdays', companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, birth_date')
        .eq('company_id', companyId)
        .not('birth_date', 'is', null);
      return (data || [])
        .filter((p: any) => {
          if (!p.birth_date) return false;
          const d = new Date(p.birth_date);
          const now = new Date();
          return d.getMonth() === now.getMonth();
        })
        .sort((a: any, b: any) => new Date(a.birth_date).getDate() - new Date(b.birth_date).getDate())
        .slice(0, 8);
    },
    enabled: !!companyId,
  });

  // New hires (last 30 days)
  const { data: newHires = [] } = useQuery({
    queryKey: ['feed-new-hires', companyId],
    queryFn: async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, hire_date')
        .eq('company_id', companyId)
        .not('hire_date', 'is', null)
        .gte('hire_date', thirtyDaysAgo.toISOString().split('T')[0])
        .order('hire_date', { ascending: false })
        .limit(5);
      return data || [];
    },
    enabled: !!companyId,
  });

  // Popular groups
  const { data: popularGroups = [] } = useQuery({
    queryKey: ['feed-popular-groups', companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from('corp_groups')
        .select('id, name, corp_group_members(id)')
        .eq('company_id', companyId)
        .order('name');
      return (data || [])
        .map((g: any) => ({ ...g, member_count: g.corp_group_members?.length || 0 }))
        .sort((a: any, b: any) => b.member_count - a.member_count)
        .slice(0, 5);
    },
    enabled: !!companyId,
  });

  const getInitials = (name?: string) =>
    name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';

  return (
    <div className="space-y-4 sticky top-4">
      {/* Birthdays */}
      <Card>
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wider">
            <Cake className="h-3.5 w-3.5 text-primary" />
            Aniversariantes do Mês
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          {birthdays.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum aniversariante este mês</p>
          ) : (
            <div className="space-y-2.5">
              {birthdays.map((p: any) => (
                <div key={p.id} className="flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    {p.avatar_url && <AvatarImage src={p.avatar_url} />}
                    <AvatarFallback className="text-[9px]">{getInitials(p.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{p.full_name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {format(new Date(p.birth_date), "dd 'de' MMM", { locale: ptBR })}
                    </p>
                  </div>
                  <span className="text-sm">🎂</span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* New hires */}
      {newHires.length > 0 && (
        <Card>
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wider">
              <UserPlus className="h-3.5 w-3.5 text-primary" />
              Novos Colaboradores
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="space-y-2.5">
              {newHires.map((p: any) => (
                <div key={p.id} className="flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    {p.avatar_url && <AvatarImage src={p.avatar_url} />}
                    <AvatarFallback className="text-[9px]">{getInitials(p.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{p.full_name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      Desde {format(new Date(p.hire_date), "dd/MM/yy")}
                    </p>
                  </div>
                  <span className="text-sm">👋</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Popular groups */}
      {popularGroups.length > 0 && (
        <Card>
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wider">
              <Users className="h-3.5 w-3.5 text-primary" />
              Grupos Populares
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="space-y-2">
              {popularGroups.map((g: any) => (
                <div key={g.id} className="flex items-center justify-between">
                  <p className="text-xs font-medium truncate">{g.name}</p>
                  <Badge variant="secondary" className="text-[9px] h-4 shrink-0">
                    {g.member_count} {g.member_count === 1 ? 'membro' : 'membros'}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default FeedRightSidebar;
