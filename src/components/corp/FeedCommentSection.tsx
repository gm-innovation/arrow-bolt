import { useState } from 'react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Trash2, Send } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useAuth } from '@/contexts/AuthContext';
import { useCorpFeed } from '@/hooks/useCorpFeed';

interface FeedCommentSectionProps {
  postId: string;
  comments: any[];
}

const FeedCommentSection = ({ postId, comments }: FeedCommentSectionProps) => {
  const { user } = useAuth();
  const { addComment, deleteComment } = useCorpFeed();
  const [text, setText] = useState('');
  const [showAll, setShowAll] = useState(false);

  const visible = showAll ? comments : comments.slice(0, 3);
  const hasMore = comments.length > 3 && !showAll;

  const handleSend = () => {
    if (!text.trim()) return;
    addComment.mutate({ postId, content: text }, { onSuccess: () => setText('') });
  };

  return (
    <div className="space-y-3">
      {visible.map((c: any) => {
        const initials = c.author?.full_name?.split(' ').map((n: string) => n[0]).join('').slice(0, 2).toUpperCase() || '??';
        return (
          <div key={c.id} className="flex gap-2 group">
            <Avatar className="h-7 w-7 shrink-0">
              {c.author?.avatar_url && <AvatarImage src={c.author.avatar_url} />}
              <AvatarFallback className="text-[10px]">{initials}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <div className="bg-muted rounded-lg px-3 py-1.5">
                <p className="text-xs font-medium">{c.author?.full_name || 'Desconhecido'}</p>
                <p className="text-xs text-foreground">{c.content}</p>
              </div>
              <div className="flex items-center gap-2 mt-0.5 px-1">
                <span className="text-[10px] text-muted-foreground">
                  {formatDistanceToNow(new Date(c.created_at), { addSuffix: true, locale: ptBR })}
                </span>
                {c.author_id === user?.id && (
                  <button
                    onClick={() => deleteComment.mutate(c.id)}
                    className="text-[10px] text-muted-foreground hover:text-destructive opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <Trash2 className="h-3 w-3" />
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {hasMore && (
        <button onClick={() => setShowAll(true)} className="text-xs text-primary hover:underline px-2">
          Ver todos os {comments.length} comentários
        </button>
      )}

      <div className="flex gap-2 items-center">
        <Input
          placeholder="Escreva um comentário..."
          value={text}
          onChange={e => setText(e.target.value)}
          onKeyDown={e => e.key === 'Enter' && !e.shiftKey && handleSend()}
          className="h-8 text-xs"
        />
        <Button size="icon" variant="ghost" className="h-8 w-8 shrink-0" onClick={handleSend} disabled={!text.trim() || addComment.isPending}>
          <Send className="h-3.5 w-3.5" />
        </Button>
      </div>
    </div>
  );
};

export default FeedCommentSection;
