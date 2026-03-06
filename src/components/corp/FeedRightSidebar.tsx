import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Cake, Clock, LogOut, UserPlus, Users, Lock } from 'lucide-react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useCorpGroups } from '@/hooks/useCorpGroups';
import { useNavigate } from 'react-router-dom';
import FeedBadgesCard from './FeedBadgesCard';
import FeedColleaguesList from './FeedColleaguesList';

interface FeedRightSidebarProps {
  companyId: string;
}

const FeedRightSidebar = ({ companyId }: FeedRightSidebarProps) => {
  const queryClient = useQueryClient();
  const navigate = useNavigate();
  const { groups, isLoading: groupsLoading, myPendingRequests, requestJoin, cancelRequest, leaveGroup } = useCorpGroups(companyId);

  const { data: workAnniversaries = [] } = useQuery({
    queryKey: ['feed-work-anniversaries-month', companyId],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('id, full_name, avatar_url, hire_date')
        .eq('company_id', companyId)
        .not('hire_date', 'is', null);
      const now = new Date();
      return (data || [])
        .filter((p: any) => {
          const d = new Date(p.hire_date);
          return d.getMonth() === now.getMonth() && d.getFullYear() < now.getFullYear();
        })
        .map((p: any) => ({
          ...p,
          years: now.getFullYear() - new Date(p.hire_date).getFullYear(),
          day: new Date(p.hire_date).getDate(),
        }))
        .sort((a: any, b: any) => a.day - b.day)
        .slice(0, 8);
    },
    enabled: !!companyId,
  });

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

  const getInitials = (name?: string) =>
    name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';

  const handleRequestJoin = (groupId: string) => {
    requestJoin.mutate(groupId, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-corp-groups'] }),
    });
  };

  const handleLeave = (groupId: string) => {
    leaveGroup.mutate(groupId, {
      onSuccess: () => queryClient.invalidateQueries({ queryKey: ['my-corp-groups'] }),
    });
  };

  return (
    <div className="space-y-4 sticky top-4">
      {/* Badges */}
      <FeedBadgesCard companyId={companyId} />

      {/* Work Anniversaries */}
      {workAnniversaries.length > 0 && (
        <Card>
          <CardHeader className="pb-2 px-4 pt-4">
            <CardTitle className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wider">
              <span className="text-sm">🎖️</span>
              Aniversários de Empresa
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-4 pt-0">
            <div className="space-y-2.5">
              {workAnniversaries.map((p: any) => (
                <div key={p.id} className="flex items-center gap-2">
                  <Avatar className="h-7 w-7">
                    {p.avatar_url && <AvatarImage src={p.avatar_url} />}
                    <AvatarFallback className="text-[9px]">{getInitials(p.full_name)}</AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-medium truncate">{p.full_name}</p>
                    <p className="text-[10px] text-muted-foreground">
                      {p.years} {p.years === 1 ? 'ano' : 'anos'} — dia {p.day}
                    </p>
                  </div>
                  <span className="text-sm">🏅</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

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
                    <p className="text-[10px] text-muted-foreground">Desde {format(new Date(p.hire_date), "dd/MM/yy")}</p>
                  </div>
                  <span className="text-sm">👋</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Groups */}
      <Card>
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-xs font-semibold flex items-center gap-1.5 text-muted-foreground uppercase tracking-wider">
            <Users className="h-3.5 w-3.5 text-primary" />
            Grupos da Empresa
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4 pt-0">
          {groupsLoading ? (
            <p className="text-xs text-muted-foreground">Carregando...</p>
          ) : groups.length === 0 ? (
            <p className="text-xs text-muted-foreground">Nenhum grupo disponível</p>
          ) : (
            <ScrollArea className="max-h-[300px]">
              <div className="space-y-2.5">
                {groups.map((g: any) => {
                  const isRoleBased = g.group_type === 'role_based';
                  const isPending = myPendingRequests.includes(g.id);
                  return (
                    <div key={g.id} className="flex items-center justify-between gap-2">
                      <div className="min-w-0 flex-1 cursor-pointer hover:underline" onClick={() => navigate(`/corp/groups/${g.id}`)}>
                        <p className="text-xs font-medium truncate">{g.name}</p>
                        <div className="flex items-center gap-1 mt-0.5">
                          <Badge variant="secondary" className="text-[9px] h-4 shrink-0">
                            {g.member_count} {g.member_count === 1 ? 'membro' : 'membros'}
                          </Badge>
                          {isRoleBased && (
                            <Badge variant="outline" className="text-[9px] h-4 shrink-0 gap-0.5">
                              <Lock className="h-2 w-2" />Auto
                            </Badge>
                          )}
                        </div>
                      </div>
                      {!isRoleBased && (
                        g.is_member ? (
                          <Button variant="ghost" size="sm" className="h-7 px-2 text-[10px] text-destructive hover:text-destructive"
                            onClick={() => handleLeave(g.id)} disabled={leaveGroup.isPending}>
                            <LogOut className="h-3 w-3 mr-1" />Sair
                          </Button>
                        ) : isPending ? (
                          <Badge variant="outline" className="text-[9px] h-6 gap-0.5">
                            <Clock className="h-2.5 w-2.5" />Pendente
                          </Badge>
                        ) : (
                          <Button variant="outline" size="sm" className="h-7 px-2 text-[10px]"
                            onClick={() => handleRequestJoin(g.id)} disabled={requestJoin.isPending}>
                            Solicitar
                          </Button>
                        )
                      )}
                    </div>
                  );
                })}
              </div>
            </ScrollArea>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default FeedRightSidebar;
