import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, Pin } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useCorpFeed } from '@/hooks/useCorpFeed';
import FeedCommentSection from './FeedCommentSection';
import FeedMediaPreview from './FeedMediaPreview';
import { cn } from '@/lib/utils';

const postTypeMap: Record<string, { label: string; variant: 'default' | 'secondary' }> = {
  announcement: { label: 'Comunicado', variant: 'default' },
  update: { label: 'Atualização', variant: 'secondary' },
  general: { label: 'Geral', variant: 'secondary' },
};

interface FeedPostCardProps {
  post: any;
  comments: any[];
}

const FeedPostCard = ({ post, comments }: FeedPostCardProps) => {
  const { likePost, unlikePost } = useCorpFeed();
  const [showComments, setShowComments] = useState(false);

  const initials = post.author?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '??';
  const pt = postTypeMap[post.post_type] || { label: post.post_type, variant: 'secondary' as const };

  const handleLike = () => {
    if (post.liked_by_me) {
      unlikePost.mutate(post.id);
    } else {
      likePost.mutate(post.id);
    }
  };

  return (
    <Card className={cn(post.pinned && 'border-primary/40 bg-primary/5')}>
      <CardHeader className="pb-2 px-4 pt-4">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              {post.author?.avatar_url && <AvatarImage src={post.author.avatar_url} />}
              <AvatarFallback className="text-xs">{initials}</AvatarFallback>
            </Avatar>
            <div>
              <p className="text-sm font-medium">{post.author?.full_name || 'Desconhecido'}</p>
              <p className="text-xs text-muted-foreground">
                {formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR })}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            {post.pinned && <Pin className="h-4 w-4 text-primary" />}
            <Badge variant={pt.variant} className="text-[10px]">{pt.label}</Badge>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-3 space-y-3">
        {post.title && <p className="font-semibold text-sm">{post.title}</p>}
        <p className="text-sm whitespace-pre-wrap">{post.content}</p>

        {post.attachments?.length > 0 && (
          <FeedMediaPreview attachments={post.attachments} />
        )}

        {/* Action bar */}
        <div className="flex items-center gap-1 pt-1 border-t border-border">
          <Button
            variant="ghost"
            size="sm"
            className={cn('gap-1.5 text-xs h-8', post.liked_by_me && 'text-red-500')}
            onClick={handleLike}
          >
            <Heart className={cn('h-4 w-4', post.liked_by_me && 'fill-current')} />
            {post.likes_count > 0 && post.likes_count}
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="gap-1.5 text-xs h-8"
            onClick={() => setShowComments(!showComments)}
          >
            <MessageCircle className="h-4 w-4" />
            {post.comments_count > 0 && post.comments_count}
          </Button>
        </div>

        {/* Comments */}
        {showComments && (
          <FeedCommentSection postId={post.id} comments={comments} />
        )}
      </CardContent>
    </Card>
  );
};

export default FeedPostCard;
