import { Card, CardHeader, CardTitle } from "@/components/ui/card";
import { Gauge } from "lucide-react";
import { IndicatorsTab } from "../Planning";

const PlanningIndicators = () => (
  <div className="space-y-4">
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Gauge className="h-4 w-4" /> Indicadores
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Indicadores vinculados a objetivos com meta, frequência e medições periódicas.
        </p>
      </CardHeader>
    </Card>
    <IndicatorsTab />
  </div>
);

export default PlanningIndicators;
