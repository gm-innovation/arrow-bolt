import { useState } from 'react';
import { ThumbsUp, ThumbsDown, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from '@/components/ui/popover';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

interface AIMessageFeedbackProps {
  messageId: string;
  onFeedback: (messageId: string, rating: 'positive' | 'negative', comment?: string) => void;
}

export function AIMessageFeedback({ messageId, onFeedback }: AIMessageFeedbackProps) {
  const [feedback, setFeedback] = useState<'positive' | 'negative' | null>(null);
  const [showComment, setShowComment] = useState(false);
  const [comment, setComment] = useState('');

  const handleFeedback = (rating: 'positive' | 'negative') => {
    if (feedback === rating) return;
    setFeedback(rating);
    
    if (rating === 'negative') {
      setShowComment(true);
    } else {
      onFeedback(messageId, rating);
    }
  };

  const handleSubmitComment = () => {
    if (feedback) {
      onFeedback(messageId, feedback, comment || undefined);
      setShowComment(false);
    }
  };

  if (feedback && !showComment) {
    return (
      <div className="flex items-center gap-1 mt-1">
        <span className="text-xs text-muted-foreground">
          {feedback === 'positive' ? '👍 Obrigado!' : '👎 Obrigado pelo feedback'}
        </span>
      </div>
    );
  }

  return (
    <div className="flex items-center gap-1 mt-1">
      {!showComment ? (
        <>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-6 w-6 rounded-full",
              feedback === 'positive' && "text-green-500"
            )}
            onClick={() => handleFeedback('positive')}
          >
            <ThumbsUp className="h-3 w-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className={cn(
              "h-6 w-6 rounded-full",
              feedback === 'negative' && "text-red-500"
            )}
            onClick={() => handleFeedback('negative')}
          >
            <ThumbsDown className="h-3 w-3" />
          </Button>
        </>
      ) : (
        <Popover open={showComment} onOpenChange={setShowComment}>
          <PopoverTrigger asChild>
            <Button variant="ghost" size="sm" className="h-6 text-xs">
              <MessageSquare className="h-3 w-3 mr-1" />
              Adicionar comentário
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-64 p-3" align="start">
            <div className="space-y-2">
              <p className="text-xs text-muted-foreground">
                O que poderia ser melhorado?
              </p>
              <Textarea
                value={comment}
                onChange={(e) => setComment(e.target.value)}
                placeholder="Seu feedback..."
                className="text-xs min-h-[60px]"
              />
              <div className="flex gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  className="text-xs h-7"
                  onClick={() => setShowComment(false)}
                >
                  Cancelar
                </Button>
                <Button
                  size="sm"
                  className="text-xs h-7"
                  onClick={handleSubmitComment}
                >
                  Enviar
                </Button>
              </div>
            </div>
          </PopoverContent>
        </Popover>
      )}
    </div>
  );
}
