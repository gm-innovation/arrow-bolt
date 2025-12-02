import { useState, useRef, KeyboardEvent } from "react";
import { Send, Paperclip, Smile } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { cn } from "@/lib/utils";

interface ChatInputProps {
  onSend: (content: string, attachmentUrl?: string) => void;
  isSending?: boolean;
  placeholder?: string;
}

export const ChatInput = ({
  onSend,
  isSending,
  placeholder = "Digite uma mensagem...",
}: ChatInputProps) => {
  const [message, setMessage] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSend = () => {
    const trimmed = message.trim();
    if (!trimmed || isSending) return;
    
    onSend(trimmed);
    setMessage("");
    
    // Focus back on textarea
    textareaRef.current?.focus();
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <div className="p-4 border-t border-border bg-background">
      <div className="flex items-end gap-2">
        <div className="flex-1 relative">
          <Textarea
            ref={textareaRef}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={placeholder}
            className={cn(
              "min-h-[44px] max-h-[200px] resize-none pr-12",
              "focus-visible:ring-1 focus-visible:ring-primary"
            )}
            rows={1}
            disabled={isSending}
          />
          <Button
            size="icon"
            variant="ghost"
            className="absolute right-2 bottom-1 h-8 w-8 text-muted-foreground hover:text-foreground"
            disabled
            title="Em breve"
          >
            <Smile className="h-4 w-4" />
          </Button>
        </div>
        <Button
          size="icon"
          variant="ghost"
          className="h-10 w-10 text-muted-foreground hover:text-foreground"
          disabled
          title="Anexar arquivo (em breve)"
        >
          <Paperclip className="h-4 w-4" />
        </Button>
        <Button
          size="icon"
          onClick={handleSend}
          disabled={!message.trim() || isSending}
          className="h-10 w-10"
        >
          <Send className="h-4 w-4" />
        </Button>
      </div>
      <p className="text-xs text-muted-foreground mt-2">
        Pressione Enter para enviar, Shift+Enter para nova linha
      </p>
    </div>
  );
};
