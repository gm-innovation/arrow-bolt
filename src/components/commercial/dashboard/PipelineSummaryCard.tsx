import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Target } from "lucide-react";
import { useNavigate } from "react-router-dom";

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

interface Props {
  count: number;
  value: number;
}

export const PipelineSummaryCard = ({ count, value }: Props) => {
  const navigate = useNavigate();
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <Target className="h-4 w-4 text-primary" />
          Pipeline de Oportunidades
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Oportunidades</span>
          <span className="font-semibold">{count}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Valor Total</span>
          <span className="font-semibold">{formatCurrency(value)}</span>
        </div>
        <Button variant="link" className="p-0 h-auto text-xs" onClick={() => navigate("/commercial/opportunities")}>
          Ver Pipeline Completo →
        </Button>
      </CardContent>
    </Card>
  );
};
