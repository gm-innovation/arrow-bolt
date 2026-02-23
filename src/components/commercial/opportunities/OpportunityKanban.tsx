import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Opportunity } from "@/hooks/useOpportunities";
import { OpportunityCard } from "./OpportunityCard";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Inbox } from "lucide-react";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(v);

const STAGES = [
  { id: 'identified', label: 'Identificada', color: 'border-t-blue-500', bg: 'bg-blue-50 dark:bg-blue-950/30' },
  { id: 'qualified', label: 'Qualificada', color: 'border-t-cyan-500', bg: 'bg-cyan-50 dark:bg-cyan-950/30' },
  { id: 'proposal', label: 'Proposta', color: 'border-t-yellow-500', bg: 'bg-yellow-50 dark:bg-yellow-950/30' },
  { id: 'negotiation', label: 'Negociação', color: 'border-t-orange-500', bg: 'bg-orange-50 dark:bg-orange-950/30' },
  { id: 'closed_won', label: 'Ganha', color: 'border-t-green-500', bg: 'bg-green-50 dark:bg-green-950/30' },
  { id: 'closed_lost', label: 'Perdida', color: 'border-t-red-500', bg: 'bg-red-50 dark:bg-red-950/30' },
];

interface Props {
  opportunities: Opportunity[];
  onStageChange: (id: string, stage: string) => void;
  onCardClick: (opp: Opportunity) => void;
}

export const OpportunityKanban = ({ opportunities, onStageChange, onCardClick }: Props) => {
  const isMobile = useIsMobile();
  const [openStages, setOpenStages] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    STAGES.forEach(s => { initial[s.id] = true; });
    return initial;
  });

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const newStage = result.destination.droppableId;
    const oppId = result.draggableId;
    if (newStage !== result.source.droppableId) {
      onStageChange(oppId, newStage);
    }
  };

  const toggleStage = (stageId: string) => {
    setOpenStages(prev => ({ ...prev, [stageId]: !prev[stageId] }));
  };

  const renderColumn = (stage: typeof STAGES[0], stageOpps: Opportunity[], total: number) => (
    <Droppable droppableId={stage.id} key={stage.id}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={`p-2 space-y-2 min-h-[80px] rounded-b-lg transition-colors duration-200 ${
            snapshot.isDraggingOver ? stage.bg : ''
          }`}
        >
          {stageOpps.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
              <Inbox className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-xs">Nenhuma oportunidade</p>
            </div>
          ) : (
            stageOpps.map((opp, index) => (
              <Draggable key={opp.id} draggableId={opp.id} index={index}>
                {(provided, snapshot) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.draggableProps}
                    {...provided.dragHandleProps}
                    className={`transition-shadow duration-200 rounded-lg ${
                      snapshot.isDragging ? 'shadow-lg ring-2 ring-primary/20' : 'hover:shadow-md'
                    }`}
                  >
                    <OpportunityCard opportunity={opp} onClick={() => onCardClick(opp)} />
                  </div>
                )}
              </Draggable>
            ))
          )}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );

  if (isMobile) {
    return (
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="space-y-2">
          {STAGES.map(stage => {
            const stageOpps = opportunities.filter(o => o.stage === stage.id);
            const total = stageOpps.reduce((s, o) => s + (o.estimated_value || 0), 0);

            return (
              <Collapsible key={stage.id} open={openStages[stage.id]} onOpenChange={() => toggleStage(stage.id)}>
                <div className={`rounded-lg border border-t-4 ${stage.color} bg-card`}>
                  <CollapsibleTrigger className="w-full p-3 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <h3 className="text-sm font-semibold">{stage.label}</h3>
                      <span className="text-xs bg-muted rounded-full px-2 py-0.5">{stageOpps.length}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs text-muted-foreground">{formatCurrency(total)}</span>
                      <ChevronDown className={`h-4 w-4 transition-transform ${openStages[stage.id] ? 'rotate-180' : ''}`} />
                    </div>
                  </CollapsibleTrigger>
                  <CollapsibleContent>
                    {renderColumn(stage, stageOpps, total)}
                  </CollapsibleContent>
                </div>
              </Collapsible>
            );
          })}
        </div>
      </DragDropContext>
    );
  }

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4 min-h-[500px] snap-x snap-mandatory md:snap-none">
        {STAGES.map(stage => {
          const stageOpps = opportunities.filter(o => o.stage === stage.id);
          const total = stageOpps.reduce((s, o) => s + (o.estimated_value || 0), 0);

          return (
            <div key={stage.id} className={`flex-shrink-0 w-[260px] snap-start bg-muted/50 rounded-lg border-t-4 ${stage.color}`}>
              <div className="p-3 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{stage.label}</h3>
                  <span className="text-xs bg-muted rounded-full px-2 py-0.5">{stageOpps.length}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{formatCurrency(total)}</p>
              </div>
              {renderColumn(stage, stageOpps, total)}
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
};
