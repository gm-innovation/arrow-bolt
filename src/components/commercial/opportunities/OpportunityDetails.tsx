import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Opportunity, useOpportunityActivities } from "@/hooks/useOpportunities";
import { ActivityTimeline } from "./ActivityTimeline";
import { format } from "date-fns";
import { Plus } from "lucide-react";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const stageLabels: Record<string, string> = {
  identified: 'Identificada', qualified: 'Qualificada', proposal: 'Proposta',
  negotiation: 'Negociação', closed_won: 'Ganha', closed_lost: 'Perdida',
};

const ACTIVITY_TYPES = [
  { value: 'call', label: 'Ligação' },
  { value: 'email', label: 'Email' },
  { value: 'meeting', label: 'Reunião' },
  { value: 'proposal_sent', label: 'Proposta Enviada' },
  { value: 'note', label: 'Nota' },
];

interface Props {
  opportunity: Opportunity | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const OpportunityDetails = ({ opportunity, open, onOpenChange }: Props) => {
  const { activities, isLoading, addActivity } = useOpportunityActivities(opportunity?.id || null);
  const [showAddActivity, setShowAddActivity] = useState(false);
  const [activityType, setActivityType] = useState('note');
  const [activityDesc, setActivityDesc] = useState('');

  const handleAddActivity = () => {
    if (!activityDesc.trim()) return;
    addActivity.mutate({ activity_type: activityType, description: activityDesc }, {
      onSuccess: () => { setActivityDesc(''); setShowAddActivity(false); },
    });
  };

  if (!opportunity) return null;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="text-left">{opportunity.title}</SheetTitle>
        </SheetHeader>

        <div className="space-y-4 mt-4">
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div><span className="text-muted-foreground">Cliente:</span><p className="font-medium">{opportunity.client_name}</p></div>
            <div><span className="text-muted-foreground">Estágio:</span><p><Badge variant="secondary">{stageLabels[opportunity.stage]}</Badge></p></div>
            <div><span className="text-muted-foreground">Valor:</span><p className="font-medium">{opportunity.estimated_value ? formatCurrency(opportunity.estimated_value) : '—'}</p></div>
            <div><span className="text-muted-foreground">Probabilidade:</span><p className="font-medium">{opportunity.probability != null ? `${opportunity.probability}%` : '—'}</p></div>
            <div><span className="text-muted-foreground">Responsável:</span><p>{opportunity.assigned_name || '—'}</p></div>
            <div><span className="text-muted-foreground">Data Prevista:</span><p>{opportunity.expected_close_date ? format(new Date(opportunity.expected_close_date), 'dd/MM/yyyy') : '—'}</p></div>
            {opportunity.buyer_name && <div><span className="text-muted-foreground">Comprador:</span><p>{opportunity.buyer_name}</p></div>}
          </div>

          {opportunity.description && (
            <div className="text-sm"><span className="text-muted-foreground">Descrição:</span><p className="mt-1">{opportunity.description}</p></div>
          )}

          {opportunity.loss_reason && (
            <div className="text-sm"><span className="text-muted-foreground">Motivo da Perda:</span><p className="mt-1 text-destructive">{opportunity.loss_reason}</p></div>
          )}

          <Separator />

          <div className="flex items-center justify-between">
            <h3 className="text-sm font-semibold">Atividades</h3>
            <Button variant="outline" size="sm" onClick={() => setShowAddActivity(!showAddActivity)}>
              <Plus className="h-4 w-4 mr-1" /> Atividade
            </Button>
          </div>

          {showAddActivity && (
            <div className="space-y-3 p-3 rounded-lg border">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={activityType} onValueChange={setActivityType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {ACTIVITY_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input value={activityDesc} onChange={e => setActivityDesc(e.target.value)} placeholder="Descreva a atividade..." />
              </div>
              <Button size="sm" onClick={handleAddActivity} disabled={!activityDesc.trim() || addActivity.isPending}>
                Registrar
              </Button>
            </div>
          )}

          {isLoading ? <div className="h-20 bg-muted animate-pulse rounded" /> : <ActivityTimeline activities={activities} />}
        </div>
      </SheetContent>
    </Sheet>
  );
};
