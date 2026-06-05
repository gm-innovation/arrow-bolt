import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RTooltip,
  Legend,
} from "recharts";
import {
  AlertTriangle,
  CheckCircle2,
  ClipboardCheck,
  FileText,
  Info,
  Timer,
} from "lucide-react";
import { useQualityKpis } from "@/hooks/useQualityKpis";
import KpiCard from "@/components/quality/KpiCard";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

const PERIODS = [
  { label: "3m", months: 3 },
  { label: "6m", months: 6 },
  { label: "12m", months: 12 },
];

const monthLabel = (iso: string) => {
  try {
    return format(parseISO(iso), "MMM/yy", { locale: ptBR });
  } catch {
    return iso;
  }
};

const QualityReports = () => {
  const { cards, series, recurrence, isLoading } = useQualityKpis();
  const [months, setMonths] = useState(12);

  const filteredSeries = useMemo(() => {
    const arr = series.map((s) => ({ ...s, label: monthLabel(s.month) }));
    return arr.slice(Math.max(0, arr.length - months));
  }, [series, months]);

  const findingsData = useMemo(() => {
    if (!cards) return [];
    return [
      { type: "Maior", value: cards.findings_major_12m },
      { type: "Menor", value: cards.findings_minor_12m },
      { type: "Observação", value: cards.findings_observation_12m },
      { type: "Oportunidade", value: cards.findings_opportunity_12m },
    ];
  }, [cards]);

  const effectivenessPct = useMemo(() => {
    if (!cards || cards.plans_evaluated === 0) return null;
    return Math.round((cards.plans_effective / cards.plans_evaluated) * 100);
  }, [cards]);

  const effectivenessSeries = useMemo(() => {
    return filteredSeries.map((s) => {
      const total = s.plans_effective + s.plans_ineffective;
      return {
        label: s.label,
        eficacia: total > 0 ? Math.round((s.plans_effective / total) * 100) : null,
      };
    });
  }, [filteredSeries]);

  const tooltipStyle = {
    backgroundColor: "hsl(var(--popover))",
    border: "1px solid hsl(var(--border))",
    borderRadius: "var(--radius)",
    color: "hsl(var(--popover-foreground))",
    fontSize: "12px",
  } as const;

  const hasHistory = series.length >= 3;

  if (isLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-8 w-64" />
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-24" />
          ))}
        </div>
        <Skeleton className="h-64" />
      </div>
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-6">
        <div className="flex items-end justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-2xl font-bold text-foreground">Indicadores de Qualidade</h2>
            <p className="text-muted-foreground">
              Painel ISO 9001 §9.1 — Monitoramento, medição, análise e avaliação
            </p>
          </div>
          <div className="flex gap-1 bg-muted p-1 rounded-md">
            {PERIODS.map((p) => (
              <Button
                key={p.label}
                size="sm"
                variant={months === p.months ? "default" : "ghost"}
                onClick={() => setMonths(p.months)}
                className="h-7 px-3 text-xs"
              >
                {p.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Cards de topo */}
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KpiCard
            label="NCRs abertas"
            value={cards?.ncrs_open ?? 0}
            hint={cards?.ncrs_overdue ? `${cards.ncrs_overdue} em atraso` : "Em dia"}
            icon={AlertTriangle}
            to="/quality/ncrs"
            tone={cards?.ncrs_overdue ? "destructive" : "default"}
          />
          <KpiCard
            label="Planos em atraso"
            value={cards?.plans_overdue ?? 0}
            hint={`${cards?.plans_evaluated ?? 0} avaliados (12m)`}
            icon={ClipboardCheck}
            to="/quality/action-plans"
            tone={cards?.plans_overdue ? "warning" : "default"}
          />
          <KpiCard
            label="Eficácia de planos"
            value={effectivenessPct !== null ? `${effectivenessPct}%` : "—"}
            hint={`${cards?.plans_effective ?? 0} eficazes`}
            icon={CheckCircle2}
            tone={effectivenessPct !== null && effectivenessPct >= 80 ? "success" : "default"}
          />
          <KpiCard
            label="Docs vencendo (30d)"
            value={cards?.documents_expiring_30d ?? 0}
            hint={`${cards?.documents_published ?? 0} publicados`}
            icon={FileText}
            to="/quality/documents"
            tone={cards?.documents_expiring_30d ? "warning" : "default"}
          />
        </div>

        {/* Métricas secundárias */}
        <div className="grid gap-4 md:grid-cols-3">
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Timer className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Tempo médio de aprovação</p>
                <p className="text-xl font-semibold">
                  {cards?.avg_approval_days != null ? `${cards.avg_approval_days} dias` : "—"}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <Timer className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Tempo médio de tratamento NCR</p>
                <p className="text-xl font-semibold">
                  {cards?.avg_ncr_resolution_days != null
                    ? `${cards.avg_ncr_resolution_days} dias`
                    : "—"}
                </p>
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-4 flex items-center gap-3">
              <ClipboardCheck className="h-5 w-5 text-muted-foreground" />
              <div>
                <p className="text-xs text-muted-foreground">Análises críticas (12m)</p>
                <p className="text-xl font-semibold">
                  {cards?.reviews_closed_12m ?? 0}
                  <span className="text-sm font-normal text-muted-foreground ml-2">
                    {cards?.review_outputs_open ?? 0} saídas abertas
                  </span>
                </p>
              </div>
            </CardContent>
          </Card>
        </div>

        {!hasHistory && (
          <Card className="border-dashed">
            <CardContent className="p-8 text-center text-muted-foreground">
              Histórico insuficiente para gráficos de tendência. Os indicadores ficarão mais
              precisos conforme novos registros forem criados.
            </CardContent>
          </Card>
        )}

        {hasHistory && (
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">NCRs abertas vs. fechadas</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={filteredSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                    <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                    <RTooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Line
                      type="monotone"
                      dataKey="ncrs_opened"
                      name="Abertas"
                      stroke="hsl(var(--destructive))"
                      strokeWidth={2}
                    />
                    <Line
                      type="monotone"
                      dataKey="ncrs_closed"
                      name="Fechadas"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Findings de auditoria (12m)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={findingsData}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="type" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                    <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                    <RTooltip contentStyle={tooltipStyle} />
                    <Bar dataKey="value" name="Quantidade" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Eficácia de planos (%)</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <LineChart data={effectivenessSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                    <YAxis
                      fontSize={11}
                      stroke="hsl(var(--muted-foreground))"
                      domain={[0, 100]}
                      tickFormatter={(v) => `${v}%`}
                    />
                    <RTooltip contentStyle={tooltipStyle} formatter={(v: any) => (v == null ? "—" : `${v}%`)} />
                    <Line
                      type="monotone"
                      dataKey="eficacia"
                      name="Eficácia"
                      stroke="hsl(var(--primary))"
                      strokeWidth={2}
                      connectNulls
                    />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Auditorias planejadas vs. executadas</CardTitle>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={260}>
                  <BarChart data={filteredSeries}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                    <XAxis dataKey="label" fontSize={11} stroke="hsl(var(--muted-foreground))" />
                    <YAxis fontSize={11} stroke="hsl(var(--muted-foreground))" allowDecimals={false} />
                    <RTooltip contentStyle={tooltipStyle} />
                    <Legend wrapperStyle={{ fontSize: 12 }} />
                    <Bar dataKey="audits_planned" name="Planejadas" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} />
                    <Bar dataKey="audits_executed" name="Executadas" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Causas-raiz recorrentes */}
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              Top 10 causas-raiz mais frequentes (12m)
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-3.5 w-3.5 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent className="max-w-xs">
                  Reincidência baseada em texto idêntico (case-insensitive). Variações de redação contam como causas
                  distintas. Categorização semântica virá em sprint futura.
                </TooltipContent>
              </Tooltip>
            </CardTitle>
          </CardHeader>
          <CardContent>
            {recurrence.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-6">
                Nenhuma causa-raiz registrada nos últimos 12 meses.
              </p>
            ) : (
              <div className="space-y-2">
                {recurrence.map((r, idx) => (
                  <div
                    key={idx}
                    className="flex items-center justify-between gap-3 py-2 border-b border-border last:border-0"
                  >
                    <span className="text-sm text-foreground flex-1 truncate">{r.root_cause_sample}</span>
                    <span className="text-sm font-semibold text-foreground tabular-nums">
                      {r.occurrences}×
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </TooltipProvider>
  );
};

export default QualityReports;
