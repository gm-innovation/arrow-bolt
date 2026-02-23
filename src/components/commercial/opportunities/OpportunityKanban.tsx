import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Opportunity } from "@/hooks/useOpportunities";
import { OpportunityCard } from "./OpportunityCard";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(v);

const STAGES = [
  { id: 'identified', label: 'Identificada', color: 'border-t-blue-500' },
  { id: 'qualified', label: 'Qualificada', color: 'border-t-cyan-500' },
  { id: 'proposal', label: 'Proposta', color: 'border-t-yellow-500' },
  { id: 'negotiation', label: 'Negociação', color: 'border-t-orange-500' },
  { id: 'closed_won', label: 'Ganha', color: 'border-t-green-500' },
  { id: 'closed_lost', label: 'Perdida', color: 'border-t-red-500' },
];

interface Props {
  opportunities: Opportunity[];
  onStageChange: (id: string, stage: string) => void;
  onCardClick: (opp: Opportunity) => void;
}

export const OpportunityKanban = ({ opportunities, onStageChange, onCardClick }: Props) => {
  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const newStage = result.destination.droppableId;
    const oppId = result.draggableId;
    if (newStage !== result.source.droppableId) {
      onStageChange(oppId, newStage);
    }
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="flex gap-3 overflow-x-auto pb-4 min-h-[500px]">
        {STAGES.map(stage => {
          const stageOpps = opportunities.filter(o => o.stage === stage.id);
          const total = stageOpps.reduce((s, o) => s + (o.estimated_value || 0), 0);

          return (
            <div key={stage.id} className={`flex-shrink-0 w-[260px] bg-muted/50 rounded-lg border-t-4 ${stage.color}`}>
              <div className="p-3 border-b">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold">{stage.label}</h3>
                  <span className="text-xs bg-muted rounded-full px-2 py-0.5">{stageOpps.length}</span>
                </div>
                <p className="text-xs text-muted-foreground mt-1">{formatCurrency(total)}</p>
              </div>

              <Droppable droppableId={stage.id}>
                {(provided) => (
                  <div
                    ref={provided.innerRef}
                    {...provided.droppableProps}
                    className="p-2 space-y-2 min-h-[100px]"
                  >
                    {stageOpps.map((opp, index) => (
                      <Draggable key={opp.id} draggableId={opp.id} index={index}>
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            <OpportunityCard opportunity={opp} onClick={() => onCardClick(opp)} />
                          </div>
                        )}
                      </Draggable>
                    ))}
                    {provided.placeholder}
                  </div>
                )}
              </Droppable>
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
};
