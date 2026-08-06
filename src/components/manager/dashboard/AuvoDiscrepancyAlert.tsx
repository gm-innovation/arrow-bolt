import { useNavigate } from "react-router-dom";
import { AlertTriangle, ArrowRight, CheckCircle2, PackageX, Timer } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuvoCriticalSummary } from "@/hooks/useAuvoCriticalSummary";

const currency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

interface Props {
  onOpenDetails?: () => void;
}

export const AuvoDiscrepancyAlert = ({ onOpenDetails }: Props) => {
  const navigate = useNavigate();
  const { data, isLoading } = useAuvoCriticalSummary();

  if (isLoading) return <Skeleton className="h-24 w-full" />;
  if (!data) return null;

  if (data.pendingCount === 0) {
    return (
      <Alert>
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
        <AlertTitle>Materiais das OS conferidos</AlertTitle>
        <AlertDescription>
          Nenhuma divergência de material aguardando revisão no momento.
        </AlertDescription>
      </Alert>
    );
  }

  return (
    <Alert variant="destructive">
      <AlertTriangle className="h-4 w-4" />
      <AlertTitle className="flex flex-wrap items-center gap-2">
        Divergências de material aguardando revisão
        <Badge variant="destructive">{data.pendingCount}</Badge>
      </AlertTitle>
      <AlertDescription className="space-y-3">
        <div className="flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
          <span className="flex items-center gap-1.5 font-medium">
            <PackageX className="h-4 w-4" />
            {data.stockNotReportedCount} baixados do estoque e não relatados
          </span>
          <span className="font-medium">{currency(data.valueAtRisk)} em risco</span>
          {data.oldestDays !== null && (
            <span className="flex items-center gap-1.5">
              <Timer className="h-4 w-4" />
              mais antiga há {data.oldestDays} {data.oldestDays === 1 ? "dia" : "dias"}
            </span>
          )}
        </div>
        <div className="flex flex-wrap gap-2">
          {onOpenDetails && (
            <Button size="sm" variant="outline" onClick={onOpenDetails}>
              Ver divergências
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={() => navigate("/manager/auvo-audit")}>
            Abrir auditoria
            <ArrowRight className="ml-1.5 h-4 w-4" />
          </Button>
        </div>
      </AlertDescription>
    </Alert>
  );
};
