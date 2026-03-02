import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Briefcase, Calendar, Heart, FileText, Users } from 'lucide-react';
import { formatDistanceToNow, differenceInYears } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const ROLE_LABELS: Record<string, string> = {
  technician: 'Técnico',
  admin: 'Administrador',
  hr: 'RH',
  manager: 'Gerente',
  commercial: 'Comercial',
  qualidade: 'Qualidade',
  compras: 'Suprimentos',
  financeiro: 'Financeiro',
  super_admin: 'Super Admin',
  director: 'Diretor',
  corp: 'Corporativo',
};

interface FeedProfileSidebarProps {
  profile: {
    full_name?: string;
    avatar_url?: string;
    hire_date?: string;
    birth_date?: string;
    company_id?: string;
  } | null;
  role?: string;
}

const FeedProfileSidebar = ({ profile, role }: FeedProfileSidebarProps) => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const initials = profile?.full_name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';
  const tenure = profile?.hire_date
    ? formatDistanceToNow(new Date(profile.hire_date), { locale: ptBR })
    : null;
  const age = profile?.birth_date
    ? differenceInYears(new Date(), new Date(profile.birth_date))
    : null;

  // Fetch user's groups
  const { data: myGroups = [] } = useQuery({
    queryKey: ['my-corp-groups', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('corp_group_members')
        .select('corp_groups:corp_groups!corp_group_members_group_id_fkey(name)')
        .eq('user_id', user!.id);
      return (data || []).map((m: any) => m.corp_groups?.name).filter(Boolean);
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
        {/* Cover area */}
        <div className="h-16 bg-gradient-to-r from-primary/20 to-primary/5 rounded-t-lg" />

        {/* Avatar overlapping cover */}
        <div className="px-4 -mt-8">
          <Avatar className="h-16 w-16 ring-4 ring-card">
            {profile?.avatar_url && <AvatarImage src={profile.avatar_url} />}
            <AvatarFallback className="text-lg font-semibold">{initials}</AvatarFallback>
          </Avatar>
        </div>

        {/* Info */}
        <div className="px-4 pt-2 pb-3 space-y-1">
          <p className="font-semibold text-sm">{profile?.full_name || 'Usuário'}</p>
          {role && (
            <Badge variant="secondary" className="text-[10px] h-5">
              {ROLE_LABELS[role] || role}
            </Badge>
          )}
        </div>

        <Separator />

        {/* Details */}
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
                {myGroups.map((name: string) => (
                  <Badge
                    key={name}
                    variant="outline"
                    className="text-[10px] h-5 gap-1 cursor-pointer hover:bg-accent transition-colors"
                    onClick={() => navigate('/corp/groups')}
                  >
                    <Users className="h-2.5 w-2.5" />
                    {name}
                  </Badge>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Stats */}
        <Separator />
        <div className="px-4 py-3 grid grid-cols-2 gap-2 text-center">
          <div>
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <FileText className="h-3 w-3" />
              <span className="text-[10px] uppercase">Posts</span>
            </div>
            <p className="text-sm font-semibold">{stats?.posts ?? 0}</p>
          </div>
          <div>
            <div className="flex items-center justify-center gap-1 text-muted-foreground">
              <Heart className="h-3 w-3" />
              <span className="text-[10px] uppercase">Curtidas</span>
            </div>
            <p className="text-sm font-semibold">{stats?.likes ?? 0}</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default FeedProfileSidebar;
