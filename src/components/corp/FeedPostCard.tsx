import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MessageCircle, Pin, Users, User, MoreHorizontal, Trash2 } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useCorpFeed } from '@/hooks/useCorpFeed';
import { useAuth } from '@/contexts/AuthContext';
import FeedCommentSection from './FeedCommentSection';
import FeedMediaPreview from './FeedMediaPreview';
import FeedUserProfileCard from './FeedUserProfileCard';
import FeedReactionPicker, { ReactionType } from './FeedReactionPicker';
import FeedPollDisplay from './FeedPollDisplay';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

const ROLE_LABELS: Record<string, string> = {
  technician: 'Técnico', admin: 'Administrador', hr: 'RH', manager: 'Gerente',
  commercial: 'Comercial', qualidade: 'Qualidade', compras: 'Suprimentos',
  financeiro: 'Financeiro', super_admin: 'Super Admin', director: 'Diretor', corp: 'Corporativo',
};

interface FeedPostCardProps {
  post: any;
  comments: any[];
}

const renderContentWithMentions = (content: string, mentions: any[]) => {
  if (!mentions || mentions.length === 0) {
    return <p className="text-sm whitespace-pre-wrap">{content}</p>;
  }
  const mentionMap = new Map(mentions.map((m: any) => [m.display_name, m]));
  const pattern = mentions.map((m: any) => `@${m.display_name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}`).join('|');
  if (!pattern) return <p className="text-sm whitespace-pre-wrap">{content}</p>;
  const regex = new RegExp(`(${pattern})`, 'g');
  const parts = content.split(regex);
  return (
    <p className="text-sm whitespace-pre-wrap">
      {parts.map((part, i) => {
        const name = part.startsWith('@') ? part.slice(1) : null;
        const mention = name ? mentionMap.get(name) : null;
        if (mention) {
          const isGroup = mention.mention_type === 'group';
          const isRole = mention.mention_type === 'role';
          return (
            <span key={i} className={cn('inline-flex items-center gap-0.5 rounded-full px-1.5 py-0 text-[11px] font-semibold align-baseline',
              isRole || isGroup ? 'bg-primary/10 text-primary' : 'bg-accent text-accent-foreground')}>
              {isRole || isGroup ? <Users className="h-3 w-3 inline" /> : <User className="h-3 w-3 inline" />}
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
  const { user } = useAuth();
  const { reactToPost, removeReaction, deletePost } = useCorpFeed();
  const navigate = useNavigate();
  const [showComments, setShowComments] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const isAuthor = user?.id === post.author_id;
  const initials = post.author?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '??';
  const roleMentions = (post.mentions || []).filter((m: any) => m.mention_type === 'role' || m.mention_type === 'group');
  const authorRole = post.author_role;

  const handleReact = (type: ReactionType) => {
    reactToPost.mutate({ postId: post.id, reactionType: type });
  };

  const handleRemoveReaction = () => {
    removeReaction.mutate(post.id);
  };

  const handleDelete = () => {
    deletePost.mutate(post.id);
    setShowDeleteDialog(false);
  };

  const hasPoll = post.post_type === 'poll';

  return (
    <>
      <Card className={cn(post.pinned && 'border-primary/40 bg-primary/5')}>
        <CardHeader className="pb-2 px-4 pt-4">
          <div className="flex items-start justify-between">
            <FeedUserProfileCard
              author={{ id: post.author?.id, full_name: post.author?.full_name, avatar_url: post.author?.avatar_url, hire_date: post.author?.hire_date, birth_date: post.author?.birth_date }}
              role={authorRole}
              groups={post.author_groups}
            >
              <button className="flex items-center gap-3 text-left cursor-pointer group" onClick={() => navigate(`/corp/profile/${post.author?.id}`)}>
                <Avatar className="h-10 w-10 ring-2 ring-transparent group-hover:ring-primary/20 transition-all">
                  {post.author?.avatar_url && <AvatarImage src={post.author.avatar_url} />}
                  <AvatarFallback className="text-xs">{initials}</AvatarFallback>
                </Avatar>
                <div>
                  <p className="text-sm font-medium group-hover:text-primary transition-colors">{post.author?.full_name || 'Desconhecido'}</p>
                  <div className="flex items-center gap-1.5">
                    {authorRole && <Badge variant="secondary" className="text-[9px] h-4 px-1.5 font-medium">{ROLE_LABELS[authorRole] || authorRole}</Badge>}
                    <span className="text-xs text-muted-foreground">{formatDistanceToNow(new Date(post.created_at), { addSuffix: true, locale: ptBR })}</span>
                  </div>
                </div>
              </button>
            </FeedUserProfileCard>
            <div className="flex items-center gap-1">
              {post.pinned && <Pin className="h-4 w-4 text-primary" />}
              {isAuthor && (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className="h-8 w-8">
                      <MoreHorizontal className="h-4 w-4" />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuItem
                      className="text-destructive focus:text-destructive"
                      onClick={() => setShowDeleteDialog(true)}
                    >
                      <Trash2 className="h-4 w-4 mr-2" />
                      Excluir publicação
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              )}
            </div>
          </div>
        </CardHeader>

        <CardContent className="px-4 pb-3 space-y-3">
          {roleMentions.length > 0 && (
            <div className="flex flex-wrap gap-1">
              {roleMentions.map((m: any) => (
                <span key={m.id} className="inline-flex items-center gap-1 rounded-full bg-primary/10 text-primary px-2 py-0.5 text-[10px] font-medium">
                  <Users className="h-3 w-3" />Direcionado a @{m.display_name}
                </span>
              ))}
            </div>
          )}

          {post.title && <p className="font-semibold text-sm">{post.title}</p>}
          {post.content && renderContentWithMentions(post.content, post.mentions)}

          {post.attachments?.length > 0 && <FeedMediaPreview attachments={post.attachments} />}

          {hasPoll && <FeedPollDisplay postId={post.id} />}

          {(post.total_reactions > 0 || post.comments_count > 0) && (
            <div className="flex items-center justify-between text-xs text-muted-foreground pb-1">
              <div />
              {post.comments_count > 0 && (
                <button onClick={() => setShowComments(!showComments)} className="hover:underline hover:text-primary ml-auto">
                  {post.comments_count} {post.comments_count === 1 ? 'comentário' : 'comentários'}
                </button>
              )}
            </div>
          )}

          <div className="flex items-center border-t border-border pt-1">
            <FeedReactionPicker
              myReaction={post.my_reaction}
              reactionCounts={post.reaction_counts || {}}
              onReact={handleReact}
              onRemoveReaction={handleRemoveReaction}
            />
            <Button variant="ghost" size="sm" className="flex-1 gap-1.5 text-xs h-9" onClick={() => setShowComments(!showComments)}>
              <MessageCircle className="h-4 w-4" />Comentar
            </Button>
          </div>

          {showComments && <FeedCommentSection postId={post.id} comments={comments} />}
        </CardContent>
      </Card>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir publicação</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir esta publicação? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
};

export default FeedPostCard;
