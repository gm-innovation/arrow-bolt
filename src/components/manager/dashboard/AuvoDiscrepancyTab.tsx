import { Fragment, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ArrowRight, ChevronRight, PackageX } from "lucide-react";
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
import { useAuvoCriticalSummary, type AuvoCriticalItem } from "@/hooks/useAuvoCriticalSummary";
import { AuvoInsightsPanel } from "@/components/admin/auvo/AuvoInsightsPanel";

const currency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

const CLASSIFICATION_LABEL: Record<string, string> = {
  stock_not_reported: "Baixa sem relato",
  reported_not_in_stock: "Relato sem baixa",
  quantity_mismatch: "Quantidade divergente",
};

const PAGE_SIZE = 10;

interface Group {
  key: string;
  orderNumber: string | null;
  customerName: string | null;
  vesselName: string | null;
  technicians: string[];
  dates: string[];
  items: AuvoCriticalItem[];
  photoGaps: AuvoPhotoGapItem[];
  notReportedCount: number;
  totalRisk: number;
  oldestDays: number;
}


const buildGroups = (items: AuvoCriticalItem[]): Group[] => {
  const map = new Map<string, Group>();

  for (const item of items) {
    const key = item.orderNumber
      ? `os:${item.orderNumber}`
      : `svc:${item.serviceGroupId ?? item.customerName ?? "sem-servico"}`;

    let group = map.get(key);
    if (!group) {
      group = {
        key,
        orderNumber: item.orderNumber,
        customerName: item.customerName,
        vesselName: item.vesselName,
        technicians: [],
        dates: [],
        items: [],
        notReportedCount: 0,
        totalRisk: 0,
        oldestDays: 0,
      };
      map.set(key, group);
    }

    group.items.push(item);
    group.totalRisk += item.valueAtRisk;
    group.oldestDays = Math.max(group.oldestDays, item.daysOpen);
    if (item.classification === "stock_not_reported") group.notReportedCount += 1;
    if (item.technicianName && !group.technicians.includes(item.technicianName)) {
      group.technicians.push(item.technicianName);
    }
    if (item.taskDate && !group.dates.includes(item.taskDate)) group.dates.push(item.taskDate);
    if (!group.customerName && item.customerName) group.customerName = item.customerName;
    if (!group.vesselName && item.vesselName) group.vesselName = item.vesselName;
  }

  return Array.from(map.values()).sort(
    (a, b) =>
      b.notReportedCount - a.notReportedCount ||
      b.totalRisk - a.totalRisk ||
      b.oldestDays - a.oldestDays,
  );
};

const formatDates = (dates: string[]) => {
  const sorted = dates.slice().sort();
  if (sorted.length === 0) return null;
  const first = format(parseISO(sorted[0]), "dd/MM/yyyy", { locale: ptBR });
  if (sorted.length === 1) return first;
  const last = format(parseISO(sorted[sorted.length - 1]), "dd/MM/yyyy", { locale: ptBR });
  return `${first} – ${last}`;
};

export const AuvoDiscrepancyTab = () => {
  const navigate = useNavigate();
  const { data, isLoading } = useAuvoCriticalSummary();
  const [expanded, setExpanded] = useState<Record<string, boolean>>({});
  const [visible, setVisible] = useState(PAGE_SIZE);

  const groups = useMemo(() => buildGroups(data?.items ?? []), [data?.items]);
  const shown = groups.slice(0, visible);

  const toggle = (key: string) => setExpanded((prev) => ({ ...prev, [key]: !prev[key] }));

  const goToAudit = (group: Group) =>
    navigate("/manager/auvo-audit", {
      state: { search: group.orderNumber || group.customerName || group.items[0]?.itemName },
    });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <PackageX className="h-5 w-5" />
            Divergências pendentes de revisão
          </CardTitle>
          <CardDescription>
            Agrupadas por OS. Serviços com mais materiais baixados do estoque e não relatados
            aparecem primeiro — são os de maior risco financeiro.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <Skeleton className="h-48 w-full" />
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-8" />
                    <TableHead>Serviço (OS)</TableHead>
                    <TableHead>Cliente / Embarcação</TableHead>
                    <TableHead>Técnicos</TableHead>
                    <TableHead className="text-center">Materiais</TableHead>
                    <TableHead className="text-center">Em aberto</TableHead>
                    <TableHead className="text-right">Risco total</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {shown.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="py-8 text-center text-muted-foreground">
                        Nenhuma divergência aguardando revisão.
                      </TableCell>
                    </TableRow>
                  )}
                  {shown.map((group) => {
                    const isOpen = !!expanded[group.key];
                    return (
                      <Fragment key={group.key}>
                        <TableRow
                          className="cursor-pointer"
                          onClick={() => toggle(group.key)}
                        >
                          <TableCell>
                            <ChevronRight
                              className={`h-4 w-4 text-muted-foreground transition-transform ${
                                isOpen ? "rotate-90" : ""
                              }`}
                            />
                          </TableCell>
                          <TableCell className="font-medium">
                            <div>{group.orderNumber || "Sem OS"}</div>
                            {formatDates(group.dates) && (
                              <div className="text-xs font-normal text-muted-foreground">
                                {formatDates(group.dates)}
                              </div>
                            )}
                          </TableCell>
                          <TableCell>
                            <div className="text-sm">{group.customerName || "—"}</div>
                            {group.vesselName && (
                              <div className="text-xs text-muted-foreground">
                                {group.vesselName}
                              </div>
                            )}
                          </TableCell>
                          <TableCell className="max-w-[200px] text-sm">
                            <span className="line-clamp-2">
                              {group.technicians.join(", ") || "—"}
                            </span>
                          </TableCell>
                          <TableCell className="text-center">
                            <div className="flex flex-col items-center gap-1">
                              <span className="text-sm">{group.items.length} itens</span>
                              {group.notReportedCount > 0 && (
                                <Badge variant="destructive">
                                  {group.notReportedCount} sem relato
                                </Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell className="text-center">{group.oldestDays}d</TableCell>
                          <TableCell className="text-right font-medium">
                            {currency(group.totalRisk)}
                          </TableCell>
                          <TableCell>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                goToAudit(group);
                              }}
                            >
                              Revisar
                              <ArrowRight className="ml-1.5 h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>

                        {isOpen && (
                          <TableRow className="bg-muted/40">
                            <TableCell />
                            <TableCell colSpan={7} className="py-3">
                              <Table>
                                <TableHeader>
                                  <TableRow>
                                    <TableHead>Material</TableHead>
                                    <TableHead className="text-center">Estoque</TableHead>
                                    <TableHead className="text-center">Relatório</TableHead>
                                    <TableHead>Classificação</TableHead>
                                    <TableHead className="text-right">Valor em risco</TableHead>
                                  </TableRow>
                                </TableHeader>
                                <TableBody>
                                  {group.items.map((item) => (
                                    <TableRow key={item.id}>
                                      <TableCell>{item.itemName}</TableCell>
                                      <TableCell className="text-center">
                                        {item.stockQuantity}
                                      </TableCell>
                                      <TableCell className="text-center">
                                        {item.reportedQuantity}
                                      </TableCell>
                                      <TableCell>
                                        <Badge
                                          variant={
                                            item.classification === "stock_not_reported"
                                              ? "destructive"
                                              : "outline"
                                          }
                                        >
                                          {CLASSIFICATION_LABEL[item.classification] ??
                                            item.classification}
                                        </Badge>
                                      </TableCell>
                                      <TableCell className="text-right">
                                        {currency(item.valueAtRisk)}
                                      </TableCell>
                                    </TableRow>
                                  ))}
                                </TableBody>
                              </Table>
                            </TableCell>
                          </TableRow>
                        )}
                      </Fragment>
                    );
                  })}
                </TableBody>
              </Table>

              {groups.length > visible && (
                <div className="mt-4 flex justify-center">
                  <Button variant="outline" onClick={() => setVisible((v) => v + PAGE_SIZE)}>
                    Ver mais ({groups.length - visible} serviços)
                  </Button>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      <AuvoInsightsPanel />
    </div>
  );
};
