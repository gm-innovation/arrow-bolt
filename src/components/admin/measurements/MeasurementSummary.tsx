import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

interface MeasurementSummaryProps {
  measurement: any;
}

export const MeasurementSummary = ({ measurement }: MeasurementSummaryProps) => {
  return (
    <Card className="border-primary">
      <CardHeader>
        <CardTitle>Resumo Financeiro</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 gap-4">
          <div className="flex justify-between">
            <span className="text-muted-foreground">Mão de Obra:</span>
            <span className="font-medium">
              R$ {Number(measurement.subtotal_man_hours || 0).toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Materiais:</span>
            <span className="font-medium">
              R$ {Number(measurement.subtotal_materials || 0).toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Serviços:</span>
            <span className="font-medium">
              R$ {Number(measurement.subtotal_services || 0).toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-muted-foreground">Deslocamento:</span>
            <span className="font-medium">
              R$ {Number(measurement.subtotal_travels || 0).toFixed(2)}
            </span>
          </div>

          <div className="flex justify-between col-span-2">
            <span className="text-muted-foreground">Despesas:</span>
            <span className="font-medium">
              R$ {Number(measurement.subtotal_expenses || 0).toFixed(2)}
            </span>
          </div>
        </div>

        <Separator />

        <div className="flex justify-between text-lg">
          <span className="font-semibold">SUBTOTAL:</span>
          <span className="font-semibold">
            R$ {Number(measurement.subtotal || 0).toFixed(2)}
          </span>
        </div>

        <div className="flex justify-between text-muted-foreground">
          <span>
            {Number(measurement.tax_percentage || 0) === 0 
              ? 'Impostos (Isento):' 
              : `Impostos (${measurement.tax_percentage}%):`}
          </span>
          <span>R$ {Number(measurement.tax_amount || 0).toFixed(2)}</span>
        </div>

        <Separator className="border-primary" />

        <div className="flex justify-between text-xl">
          <span className="font-bold">TOTAL FINAL:</span>
          <span className="font-bold text-primary">
            R$ {Number(measurement.total_amount || 0).toFixed(2)}
          </span>
        </div>

        {measurement.status === 'finalized' && (
          <div className="mt-4 p-3 bg-muted rounded-lg text-sm text-center">
            <span className="font-medium">Medição Finalizada</span>
            {measurement.finalized_at && (
              <div className="text-xs text-muted-foreground mt-1">
                {new Date(measurement.finalized_at).toLocaleString('pt-BR')}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
