import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DollarSign, Target, TrendingUp, CheckCircle2 } from "lucide-react";
import { CommercialKPIs } from "@/hooks/useCommercialStats";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

interface Props {
  kpis: CommercialKPIs;
  isLoading: boolean;
}

const stats = (kpis: CommercialKPIs) => [
  { title: "Valor do Pipeline", value: formatCurrency(kpis.pipelineTotal), desc: "Oportunidades ativas", icon: DollarSign },
  { title: "Oportunidades Abertas", value: kpis.openOpportunities.toString(), desc: "Em andamento", icon: Target },
  { title: "Taxa de Conversão", value: `${kpis.conversionRate.toFixed(1)}%`, desc: "Ganhas / Total fechadas", icon: TrendingUp },
  { title: "Fechado no Mês", value: formatCurrency(kpis.monthlyClosedValue), desc: "Valor ganho este mês", icon: CheckCircle2 },
];

export const CommercialStats = ({ kpis, isLoading }: Props) => {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}><CardContent className="p-6"><div className="h-16 animate-pulse bg-muted rounded" /></CardContent></Card>
        ))}
      </div>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats(kpis).map(({ title, value, desc, icon: Icon }) => (
        <Card key={title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{value}</div>
            <p className="text-xs text-muted-foreground">{desc}</p>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};
