import { useEffect, useRef } from "react";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { MessageSquare } from "lucide-react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Message } from "@/hooks/useChat";
import { useAuth } from "@/contexts/AuthContext";
import { cn } from "@/lib/utils";
import { ChatInput } from "./ChatInput";

interface ChatWindowProps {
  messages: Message[];
  conversationTitle?: string;
  onSendMessage: (content: string, attachmentUrl?: string) => void;
  isSending?: boolean;
  isLoading?: boolean;
}

export const ChatWindow = ({
  messages,
  conversationTitle,
  onSendMessage,
  isSending,
  isLoading,
}: ChatWindowProps) => {
  const { user } = useAuth();
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  if (!messages.length && !isLoading) {
    return (
      <div className="flex flex-col h-full">
        <div className="flex-1 flex items-center justify-center">
          <div className="text-center text-muted-foreground">
            <MessageSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg font-medium">Nenhuma mensagem ainda</p>
            <p className="text-sm">Envie a primeira mensagem para iniciar a conversa</p>
          </div>
        </div>
        <ChatInput onSend={onSendMessage} isSending={isSending} />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      {conversationTitle && (
        <div className="p-4 border-b border-border">
          <h3 className="font-semibold">{conversationTitle}</h3>
        </div>
      )}

      {/* Messages */}
      <ScrollArea className="flex-1 p-4">
        {isLoading ? (
          <div className="text-center text-muted-foreground py-8">
            Carregando mensagens...
          </div>
        ) : (
          <div className="space-y-4">
            {messages.map((message, index) => {
              const isOwn = message.sender_id === user?.id;
              const showAvatar =
                index === 0 ||
                messages[index - 1].sender_id !== message.sender_id;

              return (
                <div
                  key={message.id}
                  className={cn(
                    "flex items-end gap-2",
                    isOwn ? "flex-row-reverse" : "flex-row"
                  )}
                >
                  {showAvatar ? (
                    <Avatar className="h-8 w-8">
                      {message.sender?.avatar_url && (
                        <AvatarImage 
                          src={message.sender.avatar_url} 
                          alt={message.sender?.full_name || "User"} 
                          className="object-cover"
                        />
                      )}
                      <AvatarFallback
                        className={cn(
                          "text-xs",
                          isOwn
                            ? "bg-primary text-primary-foreground"
                            : "bg-secondary text-secondary-foreground"
                        )}
                      >
                        {getInitials(message.sender?.full_name || "U")}
                      </AvatarFallback>
                    </Avatar>
                  ) : (
                    <div className="w-8" />
                  )}
                  <div
                    className={cn(
                      "max-w-[70%] rounded-lg px-4 py-2",
                      isOwn
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground"
                    )}
                  >
                    {showAvatar && !isOwn && (
                      <p className="text-xs font-medium mb-1 opacity-70">
                        {message.sender?.full_name}
                      </p>
                    )}
                    <p className="text-sm whitespace-pre-wrap break-words">
                      {message.content}
                    </p>
                    <p
                      className={cn(
                        "text-xs mt-1",
                        isOwn ? "text-primary-foreground/70" : "text-muted-foreground"
                      )}
                    >
                      {message.created_at &&
                        formatDistanceToNow(new Date(message.created_at), {
                          addSuffix: true,
                          locale: ptBR,
                        })}
                    </p>
                  </div>
                </div>
              );
            })}
            <div ref={scrollRef} />
          </div>
        )}
      </ScrollArea>

      {/* Input */}
      <ChatInput onSend={onSendMessage} isSending={isSending} />
    </div>
  );
};
