import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Opportunity } from "@/hooks/useOpportunities";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL', notation: 'compact' }).format(v);

const priorityColors: Record<string, string> = {
  low: 'bg-gray-100 text-gray-700',
  medium: 'bg-blue-100 text-blue-700',
  high: 'bg-orange-100 text-orange-700',
  urgent: 'bg-red-100 text-red-700',
};

const priorityLabels: Record<string, string> = {
  low: 'Baixa', medium: 'Média', high: 'Alta', urgent: 'Urgente',
};

interface Props {
  opportunity: Opportunity;
  onClick: () => void;
}

export const OpportunityCard = ({ opportunity, onClick }: Props) => {
  return (
    <div
      className="bg-card border rounded-lg p-3 cursor-pointer hover:shadow-md transition-shadow space-y-2"
      onClick={onClick}
    >
      <p className="text-sm font-medium truncate">{opportunity.title}</p>
      <p className="text-xs text-muted-foreground truncate">{opportunity.client_name}</p>
      
      <div className="flex items-center justify-between">
        {opportunity.estimated_value ? (
          <span className="text-sm font-semibold">{formatCurrency(opportunity.estimated_value)}</span>
        ) : <span />}
        {opportunity.priority && (
          <Badge variant="secondary" className={`text-[10px] ${priorityColors[opportunity.priority] || ''}`}>
            {priorityLabels[opportunity.priority] || opportunity.priority}
          </Badge>
        )}
      </div>

      {opportunity.probability != null && (
        <div className="space-y-1">
          <div className="flex justify-between text-[10px] text-muted-foreground">
            <span>Probabilidade</span>
            <span>{opportunity.probability}%</span>
          </div>
          <Progress value={opportunity.probability} className="h-1.5" />
        </div>
      )}
    </div>
  );
};
