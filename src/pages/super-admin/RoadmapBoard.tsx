import { useMemo } from "react";
import {
  DndContext,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
  useDroppable,
} from "@dnd-kit/core";
import {
  SortableContext,
  useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { GripVertical, Sparkles, Copy, RefreshCw } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import type { PMTicket } from "@/hooks/usePMDashboard";
import { useMoveRoadmapTicket, useGenerateDevPrompt } from "@/hooks/usePMDashboard";

const HORIZONS = [
  { value: "now", label: "Agora", color: "bg-red-500/10 text-red-700 border-red-300" },
  { value: "next", label: "Próximo", color: "bg-amber-500/10 text-amber-700 border-amber-300" },
  { value: "later", label: "Depois", color: "bg-blue-500/10 text-blue-700 border-blue-300" },
  { value: "icebox", label: "Gelo", color: "bg-slate-500/10 text-slate-700 border-slate-300" },
];

export function RoadmapBoard({
  tickets,
  onOpen,
}: {
  tickets: PMTicket[];
  onOpen: (t: PMTicket) => void;
}) {
  const move = useMoveRoadmapTicket();

  const byHorizon = useMemo(() => {
    const map: Record<string, PMTicket[]> = { now: [], next: [], later: [], icebox: [] };
    for (const t of tickets) {
      const h = t.roadmap_horizon ?? "icebox";
      if (!map[h]) map[h] = [];
      map[h].push(t);
    }
    for (const h of Object.keys(map)) {
      map[h].sort((a, b) => {
        const pa = a.roadmap_position ?? 1e9;
        const pb = b.roadmap_position ?? 1e9;
        if (pa !== pb) return pa - pb;
        return (b.rice_score ?? 0) - (a.rice_score ?? 0);
      });
    }
    return map;
  }, [tickets]);

  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 6 } }));

  const findContainer = (id: string): string | null => {
    if (HORIZONS.some((h) => h.value === id)) return id;
    for (const h of Object.keys(byHorizon)) {
      if (byHorizon[h].some((t) => t.id === id)) return h;
    }
    return null;
  };

  const onDragEnd = (e: DragEndEvent) => {
    const { active, over } = e;
    if (!over) return;
    const activeId = String(active.id);
    const overId = String(over.id);
    const from = findContainer(activeId);
    const to = findContainer(overId);
    if (!from || !to) return;

    const targetList = byHorizon[to] ?? [];
    let newIndex: number;
    if (HORIZONS.some((h) => h.value === overId)) {
      newIndex = targetList.length;
    } else {
      newIndex = targetList.findIndex((t) => t.id === overId);
      if (newIndex < 0) newIndex = targetList.length;
    }

    // Compute updated order and issue single move (position = newIndex, others shift on next reorder)
    let ordered: PMTicket[];
    if (from === to) {
      const oldIndex = targetList.findIndex((t) => t.id === activeId);
      if (oldIndex === newIndex) return;
      ordered = arrayMove(targetList, oldIndex, newIndex);
    } else {
      const src = byHorizon[from].filter((t) => t.id !== activeId);
      const moved = tickets.find((t) => t.id === activeId);
      if (!moved) return;
      ordered = [...targetList.slice(0, newIndex), moved, ...targetList.slice(newIndex)];
    }
    // Persist positions for the affected column (batched)
    ordered.forEach((t, idx) => {
      const shouldUpdateHorizon = t.id === activeId && from !== to;
      if ((t.roadmap_position ?? -1) !== idx || shouldUpdateHorizon) {
        move.mutate({ id: t.id, horizon: to, position: idx });
      }
    });
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCorners} onDragEnd={onDragEnd}>
      <div className="grid gap-3 md:grid-cols-4">
        {HORIZONS.map((h) => (
          <RoadmapColumn key={h.value} horizon={h} items={byHorizon[h.value] ?? []} onOpen={onOpen} />
        ))}
      </div>
    </DndContext>
  );
}

function RoadmapColumn({
  horizon,
  items,
  onOpen,
}: {
  horizon: { value: string; label: string; color: string };
  items: PMTicket[];
  onOpen: (t: PMTicket) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({ id: horizon.value });
  return (
    <div
      ref={setNodeRef}
      className={`border rounded-lg p-3 ${horizon.color} ${isOver ? "ring-2 ring-primary/50" : ""}`}
    >
      <div className="font-semibold mb-2 flex items-center justify-between">
        <span>{horizon.label}</span>
        <Badge variant="outline">{items.length}</Badge>
      </div>
      <div className="max-h-[36rem] overflow-y-auto pr-1">
        {items.length === 0 && (
          <div className="text-xs text-muted-foreground italic p-3 border border-dashed rounded text-center">
            Arraste itens aqui
          </div>
        )}
        <SortableContext items={items.map((t) => t.id)} strategy={verticalListSortingStrategy}>
          <Accordion type="multiple" className="space-y-2">
            {items.map((t) => (
              <SortableRoadmapItem key={t.id} ticket={t} onOpen={onOpen} />
            ))}
          </Accordion>
        </SortableContext>
      </div>
    </div>
  );
}

function SortableRoadmapItem({ ticket, onOpen }: { ticket: PMTicket; onOpen: (t: PMTicket) => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: ticket.id });
  const gen = useGenerateDevPrompt();
  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };
  return (
    <AccordionItem
      ref={setNodeRef}
      style={style}
      value={ticket.id}
      className="bg-background rounded border-0 px-2"
    >
      <div className="flex items-start">
        <button
          {...attributes}
          {...listeners}
          className="p-1.5 mt-1.5 cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground touch-none"
          aria-label="Arrastar"
          onClick={(e) => e.stopPropagation()}
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
        <AccordionTrigger className="py-2 hover:no-underline flex-1">
          <div className="flex flex-col items-start gap-1 text-left w-full pr-2">
            <div className="flex items-center justify-between w-full gap-2">
              <span className="font-mono text-[10px] text-muted-foreground">#{ticket.ticket_number}</span>
              {ticket.rice_score != null && (
                <span className="text-[10px] font-bold text-primary">RICE {ticket.rice_score}</span>
              )}
            </div>
            <div className="text-xs font-medium leading-snug">{ticket.title}</div>
          </div>
        </AccordionTrigger>
      </div>
      <AccordionContent className="pb-3 space-y-2 text-xs">
        {ticket.impacted_module && (
          <Badge variant="secondary" className="text-[10px]">{ticket.impacted_module}</Badge>
        )}
        {ticket.description && (
          <div>
            <div className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px] mb-1">Descrição</div>
            <p className="whitespace-pre-wrap leading-relaxed">{ticket.description}</p>
          </div>
        )}
        {ticket.rice_rationale && (
          <div>
            <div className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px] mb-1">Defesa</div>
            <p className="whitespace-pre-wrap italic leading-relaxed">{ticket.rice_rationale}</p>
          </div>
        )}
        <div>
          <div className="flex items-center justify-between mb-1">
            <div className="font-semibold text-muted-foreground uppercase tracking-wide text-[10px]">Prompt para Lovable</div>
            <div className="flex gap-1">
              {ticket.dev_prompt && (
                <Button
                  size="sm"
                  variant="ghost"
                  className="h-6 px-2 text-[10px]"
                  onClick={() => {
                    navigator.clipboard.writeText(ticket.dev_prompt!);
                    toast({ title: "Prompt copiado" });
                  }}
                >
                  <Copy className="h-3 w-3 mr-1" /> Copiar
                </Button>
              )}
              <Button
                size="sm"
                variant="ghost"
                className="h-6 px-2 text-[10px]"
                onClick={() => gen.mutate(ticket.id)}
                disabled={gen.isPending}
              >
                {ticket.dev_prompt ? <RefreshCw className={`h-3 w-3 mr-1 ${gen.isPending ? "animate-spin" : ""}`} /> : <Sparkles className="h-3 w-3 mr-1" />}
                {ticket.dev_prompt ? "Regenerar" : (gen.isPending ? "Gerando..." : "Gerar")}
              </Button>
            </div>
          </div>
          {ticket.dev_prompt ? (
            <Textarea readOnly value={ticket.dev_prompt} className="font-mono text-[10px] h-40" />
          ) : (
            <p className="text-[10px] text-muted-foreground italic">
              Nenhum prompt gerado. Clique em "Gerar" para que a Marina prepare instruções para o Lovable.
            </p>
          )}
        </div>
        <Button size="sm" variant="outline" className="w-full h-7 text-[11px]" onClick={() => onOpen(ticket)}>
          Abrir detalhes
        </Button>
      </AccordionContent>
    </AccordionItem>
  );
}
