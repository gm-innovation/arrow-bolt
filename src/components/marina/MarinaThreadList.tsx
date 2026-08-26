import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Check, MessageSquarePlus, Pencil, Search, Trash2, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MarinaThread } from "@/hooks/useMarina";

interface Props {
  threads: MarinaThread[];
  activeId?: string;
  onSelect: (id: string) => void;
  onNew: () => void;
  onRename: (id: string, title: string) => void;
  onDelete: (id: string) => void;
}

export function MarinaThreadList({ threads, activeId, onSelect, onNew, onRename, onDelete }: Props) {
  const [query, setQuery] = useState("");
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editValue, setEditValue] = useState("");

  const filtered = threads.filter((t) => (t.title ?? "").toLowerCase().includes(query.toLowerCase()));

  return (
    <div className="flex h-full flex-col border-r border-border bg-muted/30">
      <div className="space-y-2 p-3">
        <Button className="w-full" onClick={onNew}>
          <MessageSquarePlus className="mr-2 h-4 w-4" /> Nova conversa
        </Button>
        <div className="relative">
          <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Buscar conversa" className="pl-8" />
        </div>
      </div>
      <ScrollArea className="flex-1">
        <div className="space-y-1 p-2">
          {filtered.length === 0 && <p className="px-2 py-6 text-center text-xs text-muted-foreground">Nenhuma conversa ainda.</p>}
          {filtered.map((t) => (
            <div
              key={t.id}
              className={cn(
                "group flex items-center gap-1 rounded-md px-2 py-2 text-sm hover:bg-accent",
                activeId === t.id && "bg-accent font-medium",
              )}
            >
              {editingId === t.id ? (
                <>
                  <Input
                    value={editValue}
                    onChange={(e) => setEditValue(e.target.value)}
                    className="h-7 text-xs"
                    autoFocus
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        onRename(t.id, editValue.trim() || "Conversa");
                        setEditingId(null);
                      }
                      if (e.key === "Escape") setEditingId(null);
                    }}
                  />
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6"
                    onClick={() => {
                      onRename(t.id, editValue.trim() || "Conversa");
                      setEditingId(null);
                    }}
                    aria-label="Salvar nome"
                  >
                    <Check className="h-3 w-3" />
                  </Button>
                  <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => setEditingId(null)} aria-label="Cancelar">
                    <X className="h-3 w-3" />
                  </Button>
                </>
              ) : (
                <>
                  <button type="button" className="flex-1 truncate text-left" onClick={() => onSelect(t.id)}>
                    {t.title || "Conversa"}
                  </button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={() => {
                      setEditingId(t.id);
                      setEditValue(t.title ?? "");
                    }}
                    aria-label="Renomear conversa"
                  >
                    <Pencil className="h-3 w-3" />
                  </Button>
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-6 w-6 opacity-0 group-hover:opacity-100"
                    onClick={() => {
                      if (confirm("Apagar esta conversa?")) onDelete(t.id);
                    }}
                    aria-label="Apagar conversa"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>
    </div>
  );
}
