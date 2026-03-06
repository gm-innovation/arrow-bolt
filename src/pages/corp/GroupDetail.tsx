import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCorpGroups } from '@/hooks/useCorpGroups';
import { useGroupDiscussions } from '@/hooks/useGroupDiscussions';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Plus, MessageSquare, Pin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import GroupInfoSidebar from '@/components/corp/GroupInfoSidebar';
import GroupMembersSidebar from '@/components/corp/GroupMembersSidebar';
import NewDiscussionDialog from '@/components/corp/NewDiscussionDialog';

const GroupDetail = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [showNewDiscussion, setShowNewDiscussion] = useState(false);

  const { data: profile } = useQuery({
    queryKey: ['my-profile-company', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('company_id').eq('id', user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const companyId = profile?.company_id || '';
  const { groups, isLoading, myPendingRequests, pendingRequests, requestJoin, leaveGroup, approveRequest, rejectRequest, addMember, removeMember } = useCorpGroups(companyId);
  const { discussions, loadingDiscussions, createDiscussion } = useGroupDiscussions(id);

  const group = groups.find((g: any) => g.id === id);
  const isPending = myPendingRequests.includes(id!);
  const groupPendingRequests = pendingRequests.filter((r: any) => r.group_id === id);

  const getInitials = (name?: string) =>
    name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '??';

  if (isLoading) {
    return <div className="text-center text-muted-foreground py-12">Carregando...</div>;
  }

  if (!group) {
    return (
      <div className="text-center py-12 space-y-3">
        <p className="text-muted-foreground">Grupo não encontrado.</p>
        <Button variant="outline" onClick={() => navigate(-1)}>Voltar</Button>
      </div>
    );
  }

  return (
    <div className="flex gap-6 max-w-6xl mx-auto">
      {/* Left sidebar */}
      <aside className="hidden lg:block w-[260px] shrink-0">
        <div className="mb-3">
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => navigate('/corp/feed')}>
            <ArrowLeft className="h-3.5 w-3.5" /> Feed
          </Button>
        </div>
        <GroupInfoSidebar
          group={group}
          isPending={isPending}
          groupPendingRequests={groupPendingRequests}
          requestJoin={requestJoin}
          leaveGroup={leaveGroup}
          approveRequest={approveRequest}
          rejectRequest={rejectRequest}
        />
      </aside>

      {/* Center - Discussions */}
      <main className="flex-1 min-w-0 max-w-[600px] space-y-4">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(-1)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="font-semibold">{group.name}</h2>
        </div>

        {group.is_member && (
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Discussões</h3>
            <Button size="sm" className="gap-1.5" onClick={() => setShowNewDiscussion(true)}>
              <Plus className="h-3.5 w-3.5" /> Nova Discussão
            </Button>
          </div>
        )}

        {!group.is_member && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              Você precisa ser membro deste grupo para ver as discussões.
            </CardContent>
          </Card>
        )}

        {group.is_member && loadingDiscussions && (
          <div className="text-center text-muted-foreground py-8 text-sm">Carregando discussões...</div>
        )}

        {group.is_member && !loadingDiscussions && discussions.length === 0 && (
          <Card>
            <CardContent className="py-8 text-center text-muted-foreground text-sm">
              Nenhuma discussão ainda. Crie a primeira!
            </CardContent>
          </Card>
        )}

        {group.is_member && discussions.map((d: any) => (
          <Card
            key={d.id}
            className="cursor-pointer hover:border-primary/30 transition-colors"
            onClick={() => navigate(`/corp/groups/${id}/discussions/${d.id}`)}
          >
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8 shrink-0 mt-0.5">
                  {d.profiles?.avatar_url && <AvatarImage src={d.profiles.avatar_url} />}
                  <AvatarFallback className="text-[10px]">{getInitials(d.profiles?.full_name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {d.pinned && <Pin className="h-3 w-3 text-primary shrink-0" />}
                    <h4 className="text-sm font-semibold truncate">{d.title}</h4>
                  </div>
                  {d.content && (
                    <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{d.content}</p>
                  )}
                  <div className="flex items-center gap-3 mt-2 text-[11px] text-muted-foreground">
                    <span>{d.profiles?.full_name}</span>
                    <span>{formatDistanceToNow(new Date(d.created_at), { addSuffix: true, locale: ptBR })}</span>
                    <span className="flex items-center gap-1">
                      <MessageSquare className="h-3 w-3" /> {d.reply_count}
                    </span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        <NewDiscussionDialog
          open={showNewDiscussion}
          onOpenChange={setShowNewDiscussion}
          onSubmit={(data) => createDiscussion.mutate(data)}
          isPending={createDiscussion.isPending}
        />
      </main>

      {/* Right sidebar */}
      <aside className="hidden lg:block w-[260px] shrink-0">
        <GroupMembersSidebar members={group.members} memberCount={group.member_count} />
      </aside>
    </div>
  );
};

export default GroupDetail;
