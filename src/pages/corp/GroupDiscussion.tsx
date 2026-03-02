import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { useCorpGroups } from '@/hooks/useCorpGroups';
import { useGroupDiscussions, useDiscussionPosts } from '@/hooks/useGroupDiscussions';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Textarea } from '@/components/ui/textarea';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Send, Trash2, Pin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import GroupInfoSidebar from '@/components/corp/GroupInfoSidebar';
import GroupMembersSidebar from '@/components/corp/GroupMembersSidebar';

const GroupDiscussion = () => {
  const { id: groupId, discussionId } = useParams<{ id: string; discussionId: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [replyContent, setReplyContent] = useState('');

  const { data: profile } = useQuery({
    queryKey: ['my-profile-company', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('profiles').select('company_id').eq('id', user!.id).single();
      return data;
    },
    enabled: !!user,
  });

  const companyId = profile?.company_id || '';
  const { groups, isLoading, myPendingRequests, pendingRequests, requestJoin, leaveGroup, approveRequest, rejectRequest } = useCorpGroups(companyId);
  const { discussions } = useGroupDiscussions(groupId);
  const { posts, loadingPosts, createPost, deletePost } = useDiscussionPosts(discussionId);

  const group = groups.find((g: any) => g.id === groupId);
  const discussion = discussions.find((d: any) => d.id === discussionId);
  const isPending = myPendingRequests.includes(groupId!);
  const groupPendingRequests = pendingRequests.filter((r: any) => r.group_id === groupId);

  const getInitials = (name?: string) =>
    name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '??';

  const handleReply = () => {
    if (!replyContent.trim()) return;
    createPost.mutate(replyContent.trim());
    setReplyContent('');
  };

  if (isLoading) {
    return <div className="text-center text-muted-foreground py-12">Carregando...</div>;
  }

  if (!group || !discussion) {
    return (
      <div className="text-center py-12 space-y-3">
        <p className="text-muted-foreground">Discussão não encontrada.</p>
        <Button variant="outline" onClick={() => navigate(-1)}>Voltar</Button>
      </div>
    );
  }

  return (
    <div className="flex gap-6 max-w-6xl mx-auto">
      {/* Left sidebar */}
      <aside className="hidden lg:block w-[260px] shrink-0">
        <div className="mb-3">
          <Button variant="ghost" size="sm" className="gap-1.5" onClick={() => navigate(`/corp/groups/${groupId}`)}>
            <ArrowLeft className="h-3.5 w-3.5" /> {group.name}
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

      {/* Center - Discussion thread */}
      <main className="flex-1 min-w-0 max-w-[600px] space-y-4">
        {/* Mobile header */}
        <div className="lg:hidden flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => navigate(`/corp/groups/${groupId}`)}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h2 className="font-semibold truncate">{discussion.title}</h2>
        </div>

        {/* Original post */}
        <Card>
          <CardContent className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              {discussion.pinned && <Pin className="h-3.5 w-3.5 text-primary" />}
              <h2 className="font-semibold">{discussion.title}</h2>
            </div>
            <div className="flex items-center gap-2">
              <Avatar className="h-8 w-8">
                {discussion.profiles?.avatar_url && <AvatarImage src={discussion.profiles.avatar_url} />}
                <AvatarFallback className="text-[10px]">{getInitials(discussion.profiles?.full_name)}</AvatarFallback>
              </Avatar>
              <div>
                <p className="text-sm font-medium">{discussion.profiles?.full_name}</p>
                <p className="text-[11px] text-muted-foreground">
                  {formatDistanceToNow(new Date(discussion.created_at), { addSuffix: true, locale: ptBR })}
                </p>
              </div>
            </div>
            {discussion.content && (
              <>
                <Separator />
                <p className="text-sm whitespace-pre-wrap">{discussion.content}</p>
              </>
            )}
          </CardContent>
        </Card>

        {/* Replies */}
        <h3 className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
          Respostas ({posts.length})
        </h3>

        {loadingPosts && <div className="text-center text-muted-foreground py-4 text-sm">Carregando...</div>}

        {posts.map((post: any) => (
          <Card key={post.id}>
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Avatar className="h-8 w-8 shrink-0">
                  {post.profiles?.avatar_url && <AvatarImage src={post.profiles.avatar_url} />}
                  <AvatarFallback className="text-[10px]">{getInitials(post.profiles?.full_name)}</AvatarFallback>
                </Avatar>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium">{post.profiles?.full_name}</p>
                      <span className="text-[11px] text-muted-foreground">
                        {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR })}
                      </span>
                    </div>
                    {post.author_id === user?.id && (
                      <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => deletePost.mutate(post.id)}>
                        <Trash2 className="h-3 w-3 text-muted-foreground" />
                      </Button>
                    )}
                  </div>
                  <p className="text-sm mt-1 whitespace-pre-wrap">{post.content}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {/* Reply input */}
        {group.is_member && (
          <Card>
            <CardContent className="p-3">
              <div className="flex gap-2">
                <Textarea
                  value={replyContent}
                  onChange={e => setReplyContent(e.target.value)}
                  placeholder="Escreva uma resposta..."
                  rows={2}
                  className="min-h-[60px]"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleReply();
                    }
                  }}
                />
                <Button size="icon" className="shrink-0 self-end" onClick={handleReply} disabled={!replyContent.trim() || createPost.isPending}>
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        )}
      </main>

      {/* Right sidebar */}
      <aside className="hidden lg:block w-[260px] shrink-0">
        <GroupMembersSidebar members={group.members} memberCount={group.member_count} />
      </aside>
    </div>
  );
};

export default GroupDiscussion;
