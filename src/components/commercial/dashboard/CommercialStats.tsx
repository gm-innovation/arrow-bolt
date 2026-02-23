import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Users, DollarSign, TrendingUp, AlertTriangle } from "lucide-react";

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(value);

interface Props {
  activeClients: number;
  mrr: number;
  avgTicket: number;
  atRiskClients: number;
  isLoading: boolean;
}

export const CommercialStats = ({ activeClients, mrr, avgTicket, atRiskClients, isLoading }: Props) => {
  if (isLoading) {
    return (
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {[1, 2, 3, 4].map(i => (
          <Card key={i}><CardContent className="p-6"><div className="h-16 animate-pulse bg-muted rounded" /></CardContent></Card>
        ))}
      </div>
    );
  }

  const stats = [
    { title: "Clientes Ativos", value: activeClients.toString(), desc: "Total de clientes", icon: Users, iconClass: "text-primary" },
    { title: "Receita Recorrente", value: formatCurrency(mrr), desc: "MRR estimado", icon: DollarSign, iconClass: "text-chart-2" },
    { title: "Ticket Médio", value: formatCurrency(avgTicket), desc: "Valor médio por oportunidade", icon: TrendingUp, iconClass: "text-chart-3" },
    { title: "Clientes em Risco", value: atRiskClients.toString(), desc: "Com recorrências atrasadas", icon: AlertTriangle, iconClass: "text-destructive" },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {stats.map(({ title, value, desc, icon: Icon, iconClass }) => (
        <Card key={title}>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">{title}</CardTitle>
            <Icon className={`h-4 w-4 ${iconClass}`} />
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
