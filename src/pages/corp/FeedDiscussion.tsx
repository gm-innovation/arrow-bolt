import { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useCorpFeedDiscussionDetail } from '@/hooks/useCorpFeedDiscussions';
import { useAuth } from '@/contexts/AuthContext';
import { useIsMobile } from '@/hooks/use-mobile';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import FeedProfileSidebar from '@/components/corp/FeedProfileSidebar';
import FeedRightSidebar from '@/components/corp/FeedRightSidebar';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { ArrowLeft, Send } from 'lucide-react';
import { Skeleton } from '@/components/ui/skeleton';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';

const FeedDiscussion = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const isMobile = useIsMobile();
  const { discussion, replies, loadingDiscussion, loadingReplies, addReply } = useCorpFeedDiscussionDetail(id);
  const [replyContent, setReplyContent] = useState('');

  const { data: profile } = useQuery({
    queryKey: ['my-profile', user?.id],
    queryFn: async () => {
      const { data } = await supabase
        .from('profiles')
        .select('full_name, avatar_url, company_id, hire_date, birth_date')
        .eq('id', user!.id)
        .single();
      return data;
    },
    enabled: !!user,
  });

  const { data: userRole } = useQuery({
    queryKey: ['my-role', user?.id],
    queryFn: async () => {
      const { data } = await supabase.from('user_roles').select('role').eq('user_id', user!.id).single();
      return data?.role;
    },
    enabled: !!user,
  });

  const companyId = discussion?.company_id || profile?.company_id || '';

  const handleSubmitReply = () => {
    if (!replyContent.trim()) return;
    addReply.mutate(replyContent, { onSuccess: () => setReplyContent('') });
  };

  const getInitials = (name?: string) => name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase() || '??';

  return (
    <div className="max-w-[1100px] mx-auto px-2">
      <div className={isMobile ? 'space-y-4' : 'grid grid-cols-[260px_1fr_260px] gap-5 items-start'}>
        {/* Left sidebar */}
        <div><FeedProfileSidebar profile={profile} role={userRole} /></div>

        {/* Center */}
        <div className="space-y-4 min-w-0">
          <Button variant="ghost" size="sm" className="gap-1.5 text-xs" onClick={() => navigate('/corp/feed')}>
            <ArrowLeft className="h-3.5 w-3.5" />
            Voltar ao Feed
          </Button>

          {loadingDiscussion ? (
            <Skeleton className="h-32 w-full rounded-lg" />
          ) : discussion ? (
            <Card>
              <CardHeader className="pb-2 px-4 pt-4">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    {discussion.author?.avatar_url && <AvatarImage src={discussion.author.avatar_url} />}
                    <AvatarFallback className="text-xs">{getInitials(discussion.author?.full_name)}</AvatarFallback>
                  </Avatar>
                  <div>
                    <p className="text-sm font-medium">{discussion.author?.full_name}</p>
                    <span className="text-xs text-muted-foreground">
                      {formatDistanceToNow(new Date(discussion.created_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="px-4 pb-4">
                <h2 className="text-base font-semibold mb-2">{discussion.title}</h2>
                {discussion.content && <p className="text-sm text-muted-foreground whitespace-pre-wrap">{discussion.content}</p>}
              </CardContent>
            </Card>
          ) : null}

          {/* Reply input */}
          <Card>
            <CardContent className="p-3">
              <div className="flex gap-2">
                <Textarea
                  value={replyContent}
                  onChange={e => setReplyContent(e.target.value)}
                  placeholder="Escreva sua resposta..."
                  rows={2}
                  className="text-sm"
                />
                <Button
                  size="sm"
                  onClick={handleSubmitReply}
                  disabled={!replyContent.trim() || addReply.isPending}
                  className="shrink-0"
                >
                  <Send className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>

          {/* Replies */}
          {loadingReplies ? (
            <div className="space-y-3">{[...Array(3)].map((_, i) => <Skeleton key={i} className="h-20 w-full rounded-lg" />)}</div>
          ) : replies.length === 0 ? (
            <div className="p-6 text-center text-muted-foreground text-sm">Nenhuma resposta ainda. Seja o primeiro!</div>
          ) : (
            <div className="space-y-3">
              {replies.map((reply: any) => (
                <Card key={reply.id}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-3">
                      <Avatar className="h-8 w-8">
                        {reply.author?.avatar_url && <AvatarImage src={reply.author.avatar_url} />}
                        <AvatarFallback className="text-[10px]">{getInitials(reply.author?.full_name)}</AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className="text-xs font-medium">{reply.author?.full_name}</p>
                          <span className="text-[10px] text-muted-foreground">
                            {formatDistanceToNow(new Date(reply.created_at), { addSuffix: true, locale: ptBR })}
                          </span>
                        </div>
                        <p className="text-sm mt-1 whitespace-pre-wrap">{reply.content}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Right sidebar */}
        {!isMobile && companyId && <FeedRightSidebar companyId={companyId} />}
      </div>
    </div>
  );
};

export default FeedDiscussion;
