import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface Props {
  next30: number;
  next60: number;
  next90: number;
}

export const RenewalsSummaryCard = ({ next30, next60, next90 }: Props) => {
  const navigate = useNavigate();
  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="text-base flex items-center gap-2">
          <RefreshCw className="h-4 w-4 text-primary" />
          Renovações Próximas
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">Próximos 30 dias</span>
          <span className="font-semibold">{next30}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">30–60 dias</span>
          <span className="font-semibold">{next60}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-muted-foreground">60–90 dias</span>
          <span className="font-semibold">{next90}</span>
        </div>
        <Button variant="link" className="p-0 h-auto text-xs" onClick={() => navigate("/commercial/recurrences")}>
          Ver Todas →
        </Button>
      </CardContent>
    </Card>
  );
};
