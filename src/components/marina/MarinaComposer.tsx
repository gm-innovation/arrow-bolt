import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Send, Square } from "lucide-react";

interface Props {
  onSend: (message: string) => void;
  onStop: () => void;
  streaming: boolean;
  threadId?: string;
  placeholder?: string;
}

export function MarinaComposer({ onSend, onStop, streaming, threadId, placeholder }: Props) {

  const [value, setValue] = useState("");
  const ref = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    ref.current?.focus();
  }, [threadId]);

  useEffect(() => {
    if (!streaming) ref.current?.focus();
  }, [streaming]);

  const submit = () => {
    const text = value.trim();
    if (!text || streaming) return;
    setValue("");
    onSend(text);
  };

  return (
    <div className="border-t border-border bg-background p-3">
      <div className="flex items-end gap-2">
        <Textarea
          ref={ref}
          value={value}
          onChange={(e) => setValue(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              submit();
            }
          }}
          rows={1}
          placeholder={placeholder ?? "Pergunte à Marina — dados do Arrow, pesquisa, análises…"}
          className="min-h-[44px] max-h-40 resize-none"
        />
        {streaming ? (
          <Button variant="outline" size="icon" onClick={onStop} aria-label="Parar">
            <Square className="h-4 w-4" />
          </Button>
        ) : (
          <Button size="icon" onClick={submit} disabled={!value.trim()} aria-label="Enviar">
            <Send className="h-4 w-4" />
          </Button>
        )}
      </div>
      <p className="mt-2 text-[11px] text-muted-foreground">
        A Marina consulta o Arrow com as suas permissões e pesquisa fora quando precisa. Confira números críticos na tela de origem.
      </p>
    </div>
  );
}
