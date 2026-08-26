import { useEffect, useRef } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Bot, Copy, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import type { MarinaMessage } from "@/hooks/useMarina";

interface Props {
  messages: MarinaMessage[];
  draft: string;
  status: string | null;
  streaming: boolean;
  avatarUrl?: string;
  agentName: string;
  emptyState?: React.ReactNode;
}

function Markdown({ content }: { content: string }) {
  return (
    <div className="prose prose-sm dark:prose-invert max-w-none break-words prose-pre:bg-muted prose-pre:text-foreground prose-headings:mt-3 prose-p:my-2">
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  );
}

export function MarinaMessageList({ messages, draft, status, streaming, avatarUrl, agentName, emptyState }: Props) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages.length, draft, status]);

  const copy = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({ title: "Copiado" });
  };

  if (messages.length === 0 && !draft && !streaming && emptyState) {
    return <div className="flex-1 overflow-y-auto px-4 py-6">{emptyState}</div>;
  }

  return (
    <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
      {messages.map((m) => {
        const sources = (m.metadata as any)?.sources as string[] | undefined;
        return (
          <div key={m.id} className={cn("flex gap-3", m.role === "user" && "justify-end")}>
            {m.role === "assistant" && (
              <Avatar className="h-8 w-8 shrink-0 mt-1">
                <AvatarImage src={avatarUrl} alt={agentName} className="object-cover" />
                <AvatarFallback className="bg-primary/10">
                  <Bot className="h-4 w-4" />
                </AvatarFallback>
              </Avatar>
            )}
            <div className={cn("max-w-[85%] space-y-1", m.role === "user" && "text-right")}>
              <div
                className={cn(
                  "rounded-2xl px-4 py-3 text-sm text-left",
                  m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted",
                )}
              >
                {m.role === "assistant" ? <Markdown content={m.content} /> : <p className="whitespace-pre-wrap">{m.content}</p>}
              </div>
              {m.role === "assistant" && (
                <div className="flex items-center gap-2">
                  {sources?.map((s) => (
                    <Badge key={s} variant="outline" className="text-[10px]">
                      {s === "Arrow" ? "no Arrow" : "web"}
                    </Badge>
                  ))}
                  <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => copy(m.content)} aria-label="Copiar resposta">
                    <Copy className="h-3 w-3" />
                  </Button>
                </div>
              )}
            </div>
          </div>
        );
      })}

      {(draft || status || streaming) && (
        <div className="flex gap-3">
          <Avatar className="h-8 w-8 shrink-0 mt-1">
            <AvatarImage src={avatarUrl} alt={agentName} className="object-cover" />
            <AvatarFallback className="bg-primary/10">
              <Bot className="h-4 w-4" />
            </AvatarFallback>
          </Avatar>
          <div className="max-w-[85%] rounded-2xl bg-muted px-4 py-3 text-sm">
            {draft ? (
              <Markdown content={draft} />
            ) : (
              <span className="flex items-center gap-2 text-muted-foreground">
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                {status ?? "pensando…"}
              </span>
            )}
          </div>
        </div>
      )}
      <div ref={bottomRef} />
    </div>
  );
}
