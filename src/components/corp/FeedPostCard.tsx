import { useState } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Heart, MessageCircle, Pin, Users, User } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useCorpFeed } from '@/hooks/useCorpFeed';
import FeedCommentSection from './FeedCommentSection';
import FeedMediaPreview from './FeedMediaPreview';
import { cn } from '@/lib/utils';

interface FeedPostCardProps {
  post: any;
  comments: any[];
}

/** Render post content with inline mention highlights */
const renderContentWithMentions = (content: string, mentions: any[]) => {
  if (!mentions || mentions.length === 0) {
    return <p className="text-sm whitespace-pre-wrap">{content}</p>;
  }

  // Build regex to find all @DisplayName patterns
  const mentionMap = new Map(mentions.map((m: any) => [m.display_name, m]));
  const pattern = mentions
    .map((m: any) => `@${m.display_name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`)
    .join('|');
  
  if (!pattern) return <p className="text-sm whitespace-pre-wrap">{content}</p>;

  const regex = new RegExp(`(${pattern})`, 'g');
  const parts = content.split(regex);

  return (
    <p className="text-sm whitespace-pre-wrap">
      {parts.map((part, i) => {
        const name = part.startsWith('@') ? part.slice(1) : null;
        const mention = name ? mentionMap.get(name) : null;
        if (mention) {
          return (
            <span
              key={i}
              className={cn(
                'inline-flex items-center gap-0.5 rounded-full px-1.5 py-0 text-[11px] font-semibold align-baseline',
                mention.mention_type === 'role'
                  ? 'bg-primary/10 text-primary'
                  : 'bg-accent text-accent-foreground'
              )}
            >
              {mention.mention_type === 'role' ? <Users className="h-3 w-3 inline" /> : <User className="h-3 w-3 inline" />}
              {part}
            </span>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </p>
  );
};

const FeedPostCard = ({ post, comments }: FeedPostCardProps) => {
  const { likePost, unlikePost } = useCorpFeed();
  const [showComments, setShowComments] = useState(false);

  const initials = post.author?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '??';
  const roleMentions = (post.mentions || []).filter((m: any) => m.mention_type === 'role');

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
          {post.pinned && <Pin className="h-4 w-4 text-primary" />}
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-3 space-y-3">
        {/* Role mention indicator */}
        {roleMentions.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {roleMentions.map((m: any) => (
              <span
                key={m.id}
                className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-medium"
              >
                <Users className="h-3 w-3" />
                Direcionado a @{m.display_name}
              </span>
            ))}
          </div>
        )}

        {post.title && <p className="font-semibold text-sm">{post.title}</p>}
        {renderContentWithMentions(post.content, post.mentions)}

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

        {showComments && (
          <FeedCommentSection postId={post.id} comments={comments} />
        )}
      </CardContent>
    </Card>
  );
};

export default FeedPostCard;
