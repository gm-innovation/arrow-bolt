import { useState } from "react";
import { format, parseISO, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CheckCircle2, ShieldAlert, Timer, TrendingUp } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useAuvoInsights, type AuvoInsightRow } from "@/hooks/useAuvoInsights";

const currency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

const RankingTable = ({ rows, header }: { rows: AuvoInsightRow[]; header: string }) => (
  <Table>
    <TableHeader>
      <TableRow>
        <TableHead>{header}</TableHead>
        <TableHead className="text-center">Detectadas</TableHead>
        <TableHead className="text-center">Corrigidas</TableHead>
        <TableHead className="text-center">Pendentes</TableHead>
        <TableHead className="text-center">Sem relato</TableHead>
        <TableHead className="text-right">Valor em risco</TableHead>
        <TableHead className="text-right">Valor tratado</TableHead>
      </TableRow>
    </TableHeader>
    <TableBody>
      {rows.length === 0 && (
        <TableRow>
          <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
            Nenhuma divergência no período selecionado.
          </TableCell>
        </TableRow>
      )}
      {rows.map((row) => (
        <TableRow key={row.key}>
          <TableCell className="font-medium">{row.label}</TableCell>
          <TableCell className="text-center">{row.detected}</TableCell>
          <TableCell className="text-center text-emerald-600 font-medium">{row.resolved}</TableCell>
          <TableCell className="text-center">
            {row.pending > 0 ? (
              <Badge variant="outline">{row.pending}</Badge>
            ) : (
              <span className="text-muted-foreground">0</span>
            )}
          </TableCell>
          <TableCell className="text-center">
            {row.stockNotReported > 0 ? (
              <Badge variant="destructive">{row.stockNotReported}</Badge>
            ) : (
              <span className="text-muted-foreground">0</span>
            )}
          </TableCell>
          <TableCell className="text-right">{currency(row.valueAtRisk)}</TableCell>
          <TableCell className="text-right">{currency(row.valueRecovered)}</TableCell>
        </TableRow>
      ))}
    </TableBody>
  </Table>
);

export const AuvoInsightsPanel = () => {
  const [periodStart, setPeriodStart] = useState(format(subDays(new Date(), 90), "yyyy-MM-dd"));
  const [periodEnd, setPeriodEnd] = useState(format(new Date(), "yyyy-MM-dd"));
  const { data, isLoading } = useAuvoInsights({ periodStart, periodEnd });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Período de análise</CardTitle>
          <CardDescription>
            Mede quantas divergências o sistema capturou e quantas já foram tratadas pela equipe.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-4">
          <div className="space-y-1">
            <Label htmlFor="insights-start">De</Label>
            <Input
              id="insights-start"
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="w-[170px]"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="insights-end">Até</Label>
            <Input
              id="insights-end"
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="w-[170px]"
            />
          </div>
        </CardContent>
      </Card>

      {isLoading || !data ? (
        <div className="grid gap-4 md:grid-cols-4">
          {[0, 1, 2, 3].map((i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium">Capturadas pelo sistema</CardTitle>
                <ShieldAlert className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{data.detected}</div>
                <p className="text-xs text-muted-foreground">
                  {currency(data.valueAtRisk)} em material sob análise
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium">Corrigidas / tratadas</CardTitle>
                <CheckCircle2 className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent className="space-y-2">
                <div className="text-2xl font-bold text-emerald-600">{data.resolved}</div>
                <Progress value={data.resolutionRate} />
                <p className="text-xs text-muted-foreground">
                  {data.resolutionRate.toFixed(0)}% de eficiência · {data.pending} em aberto
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium">Valor recuperado</CardTitle>
                <TrendingUp className="h-4 w-4 text-emerald-600" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{currency(data.valueRecovered)}</div>
                <p className="text-xs text-muted-foreground">
                  {currency(data.valuePending)} ainda sem justificativa
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2 flex-row items-center justify-between space-y-0">
                <CardTitle className="text-sm font-medium">Tempo médio de tratamento</CardTitle>
                <Timer className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {data.avgResolutionHours === null
                    ? "—"
                    : data.avgResolutionHours < 48
                      ? `${data.avgResolutionHours.toFixed(1)}h`
                      : `${(data.avgResolutionHours / 24).toFixed(1)}d`}
                </div>
                <p className="text-xs text-muted-foreground">
                  {data.confirmed} confirmadas · {data.justified} justificadas · {data.dismissed}{" "}
                  descartadas
                </p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Evolução mensal</CardTitle>
              <CardDescription>Detectadas x corrigidas por mês</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Mês</TableHead>
                    <TableHead className="text-center">Detectadas</TableHead>
                    <TableHead className="text-center">Corrigidas</TableHead>
                    <TableHead className="text-center">Eficiência</TableHead>
                    <TableHead className="text-right">Valor tratado</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.byMonth.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Sem dados no período.
                      </TableCell>
                    </TableRow>
                  )}
                  {data.byMonth.map((m) => (
                    <TableRow key={m.month}>
                      <TableCell className="font-medium">
                        {format(parseISO(`${m.month}-01`), "MMM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell className="text-center">{m.detected}</TableCell>
                      <TableCell className="text-center text-emerald-600">{m.resolved}</TableCell>
                      <TableCell className="text-center">
                        {m.detected ? `${((m.resolved / m.detected) * 100).toFixed(0)}%` : "—"}
                      </TableCell>
                      <TableCell className="text-right">{currency(m.valueRecovered)}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Recorrência</CardTitle>
              <CardDescription>
                Onde as divergências se concentram e o quanto já foi justificado
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="tecnico">
                <TabsList>
                  <TabsTrigger value="tecnico">Por técnico</TabsTrigger>
                  <TabsTrigger value="cliente">Por cliente</TabsTrigger>
                </TabsList>
                <TabsContent value="tecnico">
                  <RankingTable rows={data.byTechnician} header="Técnico" />
                </TabsContent>
                <TabsContent value="cliente">
                  <RankingTable rows={data.byCustomer} header="Cliente" />
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
};
