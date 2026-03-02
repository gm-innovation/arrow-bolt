import { useState } from 'react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Button } from '@/components/ui/button';
import { Heart } from 'lucide-react';
import { cn } from '@/lib/utils';

const REACTIONS = [
  { type: 'like', emoji: '👍', label: 'Curtir' },
  { type: 'love', emoji: '❤️', label: 'Amei' },
  { type: 'celebrate', emoji: '🎉', label: 'Parabéns' },
  { type: 'support', emoji: '💪', label: 'Apoio' },
  { type: 'funny', emoji: '😄', label: 'Haha' },
  { type: 'insightful', emoji: '💡', label: 'Genial' },
] as const;

export type ReactionType = typeof REACTIONS[number]['type'];

interface FeedReactionPickerProps {
  myReaction?: string | null;
  reactionCounts: Record<string, number>;
  onReact: (type: ReactionType) => void;
  onRemoveReaction: () => void;
}

const FeedReactionPicker = ({ myReaction, reactionCounts, onReact, onRemoveReaction }: FeedReactionPickerProps) => {
  const [open, setOpen] = useState(false);

  const totalReactions = Object.values(reactionCounts).reduce((a, b) => a + b, 0);
  const topReactions = Object.entries(reactionCounts)
    .filter(([, count]) => count > 0)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 3);

  const myReactionData = REACTIONS.find(r => r.type === myReaction);

  const handleReact = (type: ReactionType) => {
    if (myReaction === type) {
      onRemoveReaction();
    } else {
      onReact(type);
    }
    setOpen(false);
  };

  return (
    <div className="flex items-center gap-2">
      {/* Reaction counts display */}
      {totalReactions > 0 && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <span className="flex -space-x-0.5">
            {topReactions.map(([type]) => {
              const r = REACTIONS.find(r => r.type === type);
              return r ? <span key={type} className="text-sm">{r.emoji}</span> : null;
            })}
          </span>
          <span>{totalReactions}</span>
        </div>
      )}

      {/* Reaction button with popover */}
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button
            variant="ghost"
            size="sm"
            className={cn('flex-1 gap-1.5 text-xs h-9', myReaction && 'text-primary font-semibold')}
            onMouseEnter={() => setOpen(true)}
          >
            {myReactionData ? (
              <span className="text-base">{myReactionData.emoji}</span>
            ) : (
              <Heart className="h-4 w-4" />
            )}
            {myReactionData ? myReactionData.label : 'Curtir'}
          </Button>
        </PopoverTrigger>
        <PopoverContent
          className="w-auto p-1.5 flex gap-0.5"
          side="top"
          align="start"
          sideOffset={4}
          onMouseLeave={() => setOpen(false)}
        >
          {REACTIONS.map(r => (
            <button
              key={r.type}
              onClick={() => handleReact(r.type)}
              className={cn(
                'text-xl hover:scale-125 transition-transform p-1 rounded',
                myReaction === r.type && 'bg-accent'
              )}
              title={r.label}
            >
              {r.emoji}
            </button>
          ))}
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default FeedReactionPicker;
