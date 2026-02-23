import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useNavigate } from "react-router-dom";
import { Opportunity } from "@/hooks/useOpportunities";
import { ArrowRight } from "lucide-react";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(v);

const stageLabels: Record<string, string> = {
  identified: 'Identificada',
  qualified: 'Qualificada',
  proposal: 'Proposta',
  negotiation: 'Negociação',
  closed_won: 'Ganha',
  closed_lost: 'Perdida',
};

const stageColors: Record<string, string> = {
  identified: 'bg-blue-100 text-blue-800',
  qualified: 'bg-cyan-100 text-cyan-800',
  proposal: 'bg-yellow-100 text-yellow-800',
  negotiation: 'bg-orange-100 text-orange-800',
  closed_won: 'bg-green-100 text-green-800',
  closed_lost: 'bg-red-100 text-red-800',
};

interface Props {
  opportunities: Opportunity[];
}

export const RecentOpportunities = ({ opportunities }: Props) => {
  const navigate = useNavigate();
  const recent = opportunities.slice(0, 5);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">Oportunidades Recentes</CardTitle>
        <Button variant="ghost" size="sm" onClick={() => navigate('/commercial/opportunities')}>
          Ver todas <ArrowRight className="ml-1 h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent>
        {recent.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-8">Nenhuma oportunidade registrada</p>
        ) : (
          <div className="space-y-3">
            {recent.map((opp) => (
              <div key={opp.id} className="flex items-center justify-between p-3 rounded-lg border">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium truncate">{opp.title}</p>
                  <p className="text-xs text-muted-foreground">{opp.client_name}</p>
                </div>
                <div className="flex items-center gap-2 ml-2">
                  {opp.estimated_value && (
                    <span className="text-sm font-semibold whitespace-nowrap">
                      {formatCurrency(opp.estimated_value)}
                    </span>
                  )}
                  <Badge variant="secondary" className={stageColors[opp.stage] || ''}>
                    {stageLabels[opp.stage] || opp.stage}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
