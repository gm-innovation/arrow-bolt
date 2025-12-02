import { MessageSquare, Trash2, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import type { AIConversation } from '@/hooks/useAIChat';

interface AIConversationListProps {
  conversations: AIConversation[];
  currentConversationId: string | null;
  isLoading: boolean;
  onSelect: (conversationId: string) => void;
  onDelete: (conversationId: string) => void;
  onNewConversation: () => void;
}

export function AIConversationList({
  conversations,
  currentConversationId,
  isLoading,
  onSelect,
  onDelete,
  onNewConversation
}: AIConversationListProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      <div className="p-2 border-b">
        <Button
          variant="outline"
          className="w-full justify-start gap-2"
          onClick={onNewConversation}
        >
          <Plus className="h-4 w-4" />
          Nova conversa
        </Button>
      </div>

      <ScrollArea className="flex-1">
        <div className="p-2 space-y-1">
          {conversations.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-4">
              Nenhuma conversa ainda
            </p>
          ) : (
            conversations.map((conv) => (
              <div
                key={conv.id}
                className={cn(
                  "group flex items-center gap-2 p-2 rounded-md cursor-pointer hover:bg-muted/50 transition-colors",
                  currentConversationId === conv.id && "bg-muted"
                )}
                onClick={() => onSelect(conv.id)}
              >
                <MessageSquare className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm truncate">
                    {conv.title || 'Conversa sem título'}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {format(new Date(conv.updated_at), "d 'de' MMM", { locale: ptBR })}
                  </p>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                  onClick={(e) => {
                    e.stopPropagation();
                    onDelete(conv.id);
                  }}
                >
                  <Trash2 className="h-3 w-3 text-muted-foreground hover:text-destructive" />
                </Button>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
