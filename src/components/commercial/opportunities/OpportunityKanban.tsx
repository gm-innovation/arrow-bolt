import { DragDropContext, Droppable, Draggable, DropResult } from "@hello-pangea/dnd";
import { Opportunity } from "@/hooks/useOpportunities";
import { OpportunityCard } from "./OpportunityCard";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, Inbox, Mail, Phone, Sparkles, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { useIsMobile } from "@/hooks/use-mobile";
import type { Lead } from "./ConvertLeadDialog";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

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

const LEADS_DROPPABLE_ID = "leads";

interface Props {
  opportunities: Opportunity[];
  onStageChange: (id: string, stage: string) => void;
  onCardClick: (opp: Opportunity) => void;
  leads?: Lead[];
  onConvertLead?: (lead: Lead, targetStage?: string) => void;
  onLeadClick?: (lead: Lead) => void;
}

const LeadMiniCard = ({ lead, onConvert, onOpen }: { lead: Lead; onConvert: () => void; onOpen?: () => void }) => (
  <div
    role={onOpen ? "button" : undefined}
    tabIndex={onOpen ? 0 : undefined}
    onClick={onOpen}
    onKeyDown={onOpen ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOpen(); } } : undefined}
    className={`bg-card border border-dashed border-primary/40 rounded-lg p-3 space-y-1 hover:shadow-md transition-shadow ${onOpen ? "cursor-pointer" : ""}`}
  >
    <div className="flex items-start justify-between gap-2">
      <div className="min-w-0">
        <p className="text-sm font-medium truncate">{lead.company_name || lead.name || "Sem identificação"}</p>
        {lead.company_name && lead.name && (
          <p className="text-xs text-muted-foreground truncate">{lead.name}</p>
        )}
      </div>
      <Badge variant="secondary" className="text-[10px] shrink-0">
        {lead.type === "rfq" ? "RFQ" : "Contato"}
      </Badge>
    </div>
    <div className="space-y-0.5 text-xs text-muted-foreground">
      {lead.email && (
        <p className="flex items-center gap-1 truncate"><Mail className="h-3 w-3" />{lead.email}</p>
      )}
      {lead.phone && (
        <p className="flex items-center gap-1"><Phone className="h-3 w-3" />{lead.phone}</p>
      )}
      {!lead.email && !lead.phone && lead.company_name && (
        <p className="flex items-center gap-1"><Building2 className="h-3 w-3" />{lead.company_name}</p>
      )}
    </div>
    <div className="flex items-center justify-between pt-1">
      <span className="text-[10px] text-muted-foreground">
        {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true, locale: ptBR })}
      </span>
      <Button
        size="sm"
        variant="secondary"
        className="h-6 text-xs px-2"
        onClick={(e) => { e.stopPropagation(); onConvert(); }}
      >
        <Sparkles className="h-3 w-3 mr-1" /> Converter
      </Button>
    </div>
  </div>
);


export const OpportunityKanban = ({ opportunities, onStageChange, onCardClick, leads = [], onConvertLead }: Props) => {
  const isMobile = useIsMobile();
  const [openStages, setOpenStages] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = { [LEADS_DROPPABLE_ID]: true };
    STAGES.forEach(s => { initial[s.id] = true; });
    return initial;
  });

  const handleDragEnd = (result: DropResult) => {
    if (!result.destination) return;
    const destId = result.destination.droppableId;
    const srcId = result.source.droppableId;

    // Dragging a lead
    if (srcId === LEADS_DROPPABLE_ID) {
      if (destId === LEADS_DROPPABLE_ID) return;
      const lead = leads.find(l => l.id === result.draggableId);
      if (lead && onConvertLead) onConvertLead(lead, destId);
      return;
    }

    // Cannot drop opportunities into the leads column
    if (destId === LEADS_DROPPABLE_ID) return;

    if (destId !== srcId) {
      onStageChange(result.draggableId, destId);
    }
  };

  const toggleStage = (stageId: string) => {
    setOpenStages(prev => ({ ...prev, [stageId]: !prev[stageId] }));
  };

  const renderLeadsColumn = () => (
    <Droppable droppableId={LEADS_DROPPABLE_ID}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={`p-2 space-y-2 min-h-[80px] rounded-b-lg transition-colors duration-200 ${
            snapshot.isDraggingOver ? "bg-primary/5" : ""
          }`}
        >
          {leads.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-6 text-muted-foreground">
              <Inbox className="h-8 w-8 mb-2 opacity-40" />
              <p className="text-xs">Nenhum lead pendente</p>
            </div>
          ) : (
            leads.map((lead, index) => (
              <Draggable key={lead.id} draggableId={lead.id} index={index}>
                {(prov, snap) => (
                  <div
                    ref={prov.innerRef}
                    {...prov.draggableProps}
                    {...prov.dragHandleProps}
                    className={`transition-shadow duration-200 rounded-lg ${snap.isDragging ? "shadow-lg ring-2 ring-primary/30" : ""}`}
                  >
                    <LeadMiniCard lead={lead} onConvert={() => onConvertLead?.(lead)} />
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

  const renderColumn = (stage: typeof STAGES[0], stageOpps: Opportunity[]) => (
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

  const showLeads = onConvertLead !== undefined;

  if (isMobile) {
    return (
      <DragDropContext onDragEnd={handleDragEnd}>
        <div className="space-y-2">
          {showLeads && (
            <Collapsible open={openStages[LEADS_DROPPABLE_ID]} onOpenChange={() => toggleStage(LEADS_DROPPABLE_ID)}>
              <div className="rounded-lg border border-t-4 border-t-primary bg-card">
                <CollapsibleTrigger className="w-full p-3 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4 text-primary" />
                    <h3 className="text-sm font-semibold">Leads do Site</h3>
                    <span className="text-xs bg-muted rounded-full px-2 py-0.5">{leads.length}</span>
                  </div>
                  <ChevronDown className={`h-4 w-4 transition-transform ${openStages[LEADS_DROPPABLE_ID] ? 'rotate-180' : ''}`} />
                </CollapsibleTrigger>
                <CollapsibleContent>{renderLeadsColumn()}</CollapsibleContent>
              </div>
            </Collapsible>
          )}
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
                    {renderColumn(stage, stageOpps)}
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
        {showLeads && (
          <div className="flex-shrink-0 w-[260px] snap-start bg-primary/5 rounded-lg border-t-4 border-t-primary">
            <div className="p-3 border-b">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5">
                  <Sparkles className="h-4 w-4 text-primary" />
                  <h3 className="text-sm font-semibold">Leads do Site</h3>
                </div>
                <span className="text-xs bg-muted rounded-full px-2 py-0.5">{leads.length}</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">Arraste para uma coluna ou clique em Converter</p>
            </div>
            {renderLeadsColumn()}
          </div>
        )}
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
              {renderColumn(stage, stageOpps)}
            </div>
          );
        })}
      </div>
    </DragDropContext>
  );
};
