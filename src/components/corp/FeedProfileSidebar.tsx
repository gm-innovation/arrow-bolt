import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Briefcase, Calendar, Heart, FileText, Users, MessageSquareText, BarChart3, StopCircle } from 'lucide-react';
import { formatDistanceToNow, differenceInYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import { useCorpFeedDiscussions } from '@/hooks/useCorpFeedDiscussions';
import FeedNewDiscussionDialog from './FeedNewDiscussionDialog';
import FeedPollSidebarCreate from './FeedPollSidebarCreate';
import FeedPollDisplay from './FeedPollDisplay';
import AwardBadgeDialog from './AwardBadgeDialog';
import FeedUserLevel from './FeedUserLevel';
import { toast } from '@/hooks/use-toast';

const ROLE_LABELS: Record<string, string> = {
  technician: 'Técnico', admin: 'Administrador', hr: 'RH', manager: 'Gerente',
  commercial: 'Comercial', qualidade: 'Qualidade', compras: 'Suprimentos',
  financeiro: 'Financeiro', super_admin: 'Super Admin', director: 'Diretor', corp: 'Corporativo',
};

interface FeedProfileSidebarProps {
  profile: {
    full_name?: string; avatar_url?: string; hire_date?: string; birth_date?: string; company_id?: string; cover_url?: string;
  } | null;
  role?: string;
  compact?: boolean;
}

const FeedProfileSidebar = ({ profile, role, compact }: FeedProfileSidebarProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const initials = profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';
  const tenure = profile?.hire_date ? formatDistanceToNow(new Date(profile.hire_date), { locale: ptBR }) : null;
  const age = profile?.birth_date ? differenceInYears(new Date(), new Date(profile.birth_date)) : null;
  const companyId = profile?.company_id || '';

  const isAdminOrHR = role === 'admin' || role === 'hr' || role === 'super_admin';
  const canAwardBadge = role === 'hr' || role === 'director' || role === 'super_admin';

  const { discussions } = useCorpFeedDiscussions(companyId);
  const recentDiscussions = discussions.slice(0, 5);

  // Fetch active poll
  const { data: activePoll } = useQuery({
    queryKey: ['active-poll', companyId],
    queryFn: async () => {
      const { data } = await (supabase as any)
        .from('corp_feed_polls')
        .select('*, corp_feed_posts!corp_feed_polls_post_id_fkey(id, company_id, author_id)')
        .eq('status', 'active')
        .limit(10);
      // Filter by company
      const companyPolls = (data || []).filter((p: any) => p.corp_feed_posts?.company_id === companyId);
      return companyPolls.length > 0 ? companyPolls[0] : null;
    },
    enabled: !!companyId,
  });

  const closePoll = useMutation({
    mutationFn: async () => {
      if (!activePoll) return;
      await (supabase as any)
        .from('corp_feed_polls')
        .update({ status: 'closed', closed_at: new Date().toISOString() })
        .eq('id', activePoll.id);
      // Unpin the post
      await supabase
        .from('corp_feed_posts')
        .update({ pinned: false })
        .eq('id', activePoll.post_id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['active-poll'] });
      queryClient.invalidateQueries({ queryKey: ['corp-feed'] });
      queryClient.invalidateQueries({ queryKey: ['poll'] });
      toast({ title: 'Enquete finalizada' });
    },
  });

  // Fetch user's groups
  const { data: myGroups = [] } = useQuery({
    queryKey: ['my-corp-groups', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('corp_group_members')
        .select('corp_groups:corp_groups!corp_group_members_group_id_fkey(id, name)')
        .eq('user_id', user!.id);
      return (data || []).map((m: any) => ({ id: m.corp_groups?.id, name: m.corp_groups?.name })).filter((g: any) => g.name);
    },
    enabled: !!user,
  });

  // Fetch user stats
  const { data: stats } = useQuery({
    queryKey: ['my-feed-stats', user?.id],
    queryFn: async () => {
      const [{ count: postsCount }, { count: likesCount }] = await Promise.all([
        supabase.from('corp_feed_posts').select('id', { count: 'exact', head: true }).eq('author_id', user!.id),
        supabase.from('corp_feed_likes').select('id', { count: 'exact', head: true })
          .in('post_id', (await supabase.from('corp_feed_posts').select('id').eq('author_id', user!.id)).data?.map((p: any) => p.id) || []),
      ]);
      return { posts: postsCount || 0, likes: likesCount || 0 };
    },
    enabled: !!user,
  });

  return (
    <Card className="sticky top-4">
      <CardContent className="p-0">
        <div className="h-16 rounded-t-lg overflow-hidden relative">
          {profile?.cover_url ? (
            <img src={profile.cover_url} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full bg-gradient-to-r from-primary/20 to-primary/5" />
          )}
        </div>
        <div className="px-4 -mt-8 cursor-pointer" onClick={() => navigate(`/corp/profile/${user?.id}`)}>
          <Avatar className="h-16 w-16 ring-4 ring-card hover:ring-primary/20 transition-all">
            {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
            <AvatarFallback className="text-lg font-semibold">{initials}</AvatarFallback>
          </Avatar>
        </div>
        <div className="px-4 pt-2 pb-3 space-y-2">
          <div className="space-y-1">
            <p className="font-semibold text-sm cursor-pointer hover:text-primary transition-colors" onClick={() => navigate(`/corp/profile/${user?.id}`)}>{profile?.full_name || 'Usuário'}</p>
            {role && <Badge variant="secondary" className="text-[10px] h-5">{ROLE_LABELS[role] || role}</Badge>}
          </div>
          {user?.id && companyId && <FeedUserLevel userId={user.id} companyId={companyId} />}
          <Button variant="outline" size="sm" className="w-full text-xs gap-1.5 mt-1" onClick={() => navigate(`/corp/profile/${user?.id}`)}>
            <Users className="h-3.5 w-3.5" /> Ver meu perfil
          </Button>
        </div>

        <Separator />

        <div className="px-4 py-3 space-y-2 text-xs text-muted-foreground">
          {tenure && (
            <div className="flex items-center gap-2">
              <Briefcase className="h-3.5 w-3.5 shrink-0 text-primary/60" />
              <span>Na empresa há <span className="font-medium text-foreground">{tenure}</span></span>
            </div>
          )}
          {age !== null && (
            <div className="flex items-center gap-2">
              <Calendar className="h-3.5 w-3.5 shrink-0 text-primary/60" />
              <span><span className="font-medium text-foreground">{age} anos</span></span>
            </div>
          )}
        </div>

        {/* Groups */}
        {myGroups.length > 0 && (
          <>
            <Separator />
            <div className="px-4 py-3">
              <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2">Meus Grupos</p>
              <div className="flex flex-wrap gap-1">
                {myGroups.map((g: any) => (
                  <Badge key={g.id} variant="outline" className="text-[10px] h-5 gap-1 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => navigate(`/corp/groups/${g.id}`)}>
                    <Users className="h-2.5 w-2.5" />{g.name}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Poll Section */}
        <Separator />
        <div className="px-4 py-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
            <BarChart3 className="h-3 w-3" />
            Enquete
          </p>
          {activePoll ? (
            <div className="space-y-2">
              <FeedPollDisplay postId={activePoll.post_id} />
              {(activePoll.corp_feed_posts?.author_id === user?.id || isAdminOrHR) && (
                <Button variant="outline" size="sm" className="w-full text-xs gap-1.5 text-destructive hover:text-destructive" onClick={() => closePoll.mutate()} disabled={closePoll.isPending}>
                  <StopCircle className="h-3.5 w-3.5" />
                  Finalizar Enquete
                </Button>
              )}
            </div>
          ) : (
            <FeedPollSidebarCreate companyId={companyId} hasActivePoll={false} />
          )}
        </div>

        {/* Discussions */}
        <Separator />
        <div className="px-4 py-3">
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-2 flex items-center gap-1">
            <MessageSquareText className="h-3 w-3" />
            Discussões
          </p>
          {recentDiscussions.length > 0 ? (
            <div className="space-y-1.5 mb-2">
              {recentDiscussions.map((d: any) => (
                <button key={d.id} className="block w-full text-left hover:bg-accent rounded px-1.5 py-1 transition-colors"
                  onClick={() => navigate(`/corp/feed/discussions/${d.id}`)}>
                  <p className="text-xs font-medium truncate">{d.title}</p>
                  <p className="text-[10px] text-muted-foreground">{d.reply_count} {d.reply_count === 1 ? 'resposta' : 'respostas'}</p>
                </button>
              ))}
            </div>
          ) : (
            <p className="text-[10px] text-muted-foreground mb-2">Nenhuma discussão ainda</p>
          )}
          {companyId && <FeedNewDiscussionDialog companyId={companyId} />}
        </div>

        {/* Award Badge (Admin/HR only) */}
        {canAwardBadge && companyId && (
          <>
            <Separator />
            <div className="px-4 py-3">
              <AwardBadgeDialog companyId={companyId} />
            </div>
          </>
        )}

        {/* Stats */}
        <Separator />
        <div className="px-4 py-3 grid grid-cols-2 gap-2 text-center">
          <div>
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <FileText className="h-3 w-3" /><span className="text-[10px] uppercase">Posts</span>
            </div>
            <p className="text-sm font-semibold">{stats?.posts ?? 0}</p>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <Heart className="h-3 w-3" /><span className="text-[10px] uppercase">Curtidas</span>
            </div>
            <p className="text-sm font-semibold">{stats?.likes ?? 0}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FeedProfileSidebar;
