import CorpLayout from '@/components/corp/CorpLayout';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Pin } from 'lucide-react';
import { useCorpFeed } from '@/hooks/useCorpFeed';
import { useAuth } from '@/contexts/AuthContext';
import { Skeleton } from '@/components/ui/skeleton';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import FeedPostDialog from '@/components/corp/FeedPostDialog';

const postTypeMap: Record<string, { label: string; variant: 'default' | 'info' | 'secondary' }> = {
  announcement: { label: 'Comunicado', variant: 'default' },
  update: { label: 'Atualização', variant: 'info' },
  general: { label: 'Geral', variant: 'secondary' },
};

const CorpFeed = () => {
  const { userRole } = useAuth();
  const { posts, isLoading } = useCorpFeed();
  const canPost = userRole === 'admin' || userRole === 'super_admin' || userRole === 'hr';

  // Derive companyId from first post
  const companyId = (posts as any[])?.[0]?.company_id || '';

  return (
    <CorpLayout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Feed Corporativo</h2>
          {canPost && <FeedPostDialog companyId={companyId} />}
        </div>

        {isLoading ? (
          <div className="space-y-4">
            {[...Array(3)].map((_, i) => <Skeleton key={i} className="h-32 w-full" />)}
          </div>
        ) : posts.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">Nenhum post no feed ainda.</div>
        ) : (
          <div className="space-y-4">
            {(posts as any[]).map(post => {
              const pt = postTypeMap[post.post_type] || { label: post.post_type, variant: 'secondary' as const };
              const initials = post.author?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '??';

              return (
                <Card key={post.id} className={post.pinned ? 'border-primary/40 bg-primary/5' : ''}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                        </Avatar>
                        <div>
                          <p className="text-sm font-medium">{post.author?.full_name || 'Desconhecido'}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(new Date(post.created_at), "dd 'de' MMM 'às' HH:mm", { locale: ptBR })}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        {post.pinned && <Pin className="h-4 w-4 text-primary" />}
                        <Badge variant={pt.variant} size="sm">{pt.label}</Badge>
                      </div>
                    </div>
                    {post.title && <CardTitle className="text-base mt-2">{post.title}</CardTitle>}
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm whitespace-pre-wrap">{post.content}</p>
                  </CardContent>
                </Card>
              );
            })}
          </div>
        )}
      </div>
    </CorpLayout>
  );
};

export default CorpFeed;
