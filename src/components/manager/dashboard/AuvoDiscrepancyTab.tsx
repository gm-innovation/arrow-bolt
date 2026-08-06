import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowRight, PackageX } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useAuvoCriticalSummary } from "@/hooks/useAuvoCriticalSummary";
import { AuvoInsightsPanel } from "@/components/admin/auvo/AuvoInsightsPanel";

const currency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

const CLASSIFICATION_LABEL: Record<string, string> = {
  stock_not_reported: "Baixa sem relato",
  reported_not_in_stock: "Relato sem baixa",
  quantity_mismatch: "Quantidade divergente",
};

export const AuvoDiscrepancyTab = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useAuvoCriticalSummary();

  const critical = useMemo(
    () =>
      (data?.items ?? [])
        .slice()
        .sort((a, b) => {
          const aCrit = a.classification === "stock_not_reported" ? 1 : 0;
          const bCrit = b.classification === "stock_not_reported" ? 1 : 0;
          return bCrit - aCrit || b.valueAtRisk - a.valueAtRisk || b.daysOpen - a.daysOpen;
        })
        .slice(0, 25),
    [data?.items],
  );

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackageX className="h-5 w-5" />
            Divergências pendentes de revisão
          </CardTitle>
          <CardDescription>
            Materiais com baixa de estoque sem registro no relatório técnico aparecem primeiro —
            são os de maior risco financeiro.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>OS</TableHead>
                  <TableHead>Material</TableHead>
                  <TableHead>Cliente / Embarcação</TableHead>
                  <TableHead>Técnico</TableHead>
                  <TableHead className="text-center">Estoque</TableHead>
                  <TableHead className="text-center">Relatório</TableHead>
                  <TableHead>Classificação</TableHead>
                  <TableHead className="text-center">Em aberto</TableHead>
                  <TableHead className="text-right">Valor em risco</TableHead>
                  <TableHead />
                </TableRow>
              </TableHeader>
              <TableBody>
                {critical.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={10} className="py-8 text-center text-muted-foreground">
                      Nenhuma divergência aguardando revisão.
                    </TableCell>
                  </TableRow>
                )}
                {critical.map((item) => (
                  <TableRow key={item.id}>
                    <TableCell className="font-medium">{item.orderNumber || "—"}</TableCell>
                    <TableCell>{item.itemName}</TableCell>
                    <TableCell>
                      <div className="text-sm">{item.customerName || "—"}</div>
                      {item.vesselName && (
                        <div className="text-xs text-muted-foreground">{item.vesselName}</div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      <div>{item.technicianName || "—"}</div>
                      {item.taskDate && (
                        <div className="text-xs text-muted-foreground">
                          {format(parseISO(item.taskDate), "dd/MM/yyyy", { locale: ptBR })}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-center">{item.stockQuantity}</TableCell>
                    <TableCell className="text-center">{item.reportedQuantity}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          item.classification === "stock_not_reported" ? "destructive" : "outline"
                        }
                      >
                        {CLASSIFICATION_LABEL[item.classification] ?? item.classification}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-center">{item.daysOpen}d</TableCell>
                    <TableCell className="text-right font-medium">
                      {currency(item.valueAtRisk)}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() =>
                          navigate("/manager/auvo-audit", {
                            state: { search: item.orderNumber || item.itemName },
                          })
                        }
                      >
                        Revisar
                        <ArrowRight className="ml-1.5 h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <AuvoInsightsPanel />
    </div>
  );
};
