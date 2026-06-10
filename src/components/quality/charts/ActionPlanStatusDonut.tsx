import { useMemo } from "react";
import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { useQualityActionPlans } from "@/hooks/useQualityActionPlans";
import { computeActionPlanStatus, PeriodKey } from "@/lib/qualityChartAggregations";
import ChartCard from "./ChartCard";
import EmptyChartState from "./EmptyChartState";

interface Props {
  period: PeriodKey;
}

const COLORS = {
  completed: "hsl(var(--success, 142 71% 45%))",
  in_progress: "hsl(var(--primary))",
  overdue: "hsl(var(--destructive))",
  not_started: "hsl(var(--muted-foreground))",
} as const;

const LABELS = {
  completed: "Concluído",
  in_progress: "Em andamento",
  overdue: "Atrasado",
  not_started: "Não iniciado",
} as const;

const ActionPlanStatusDonut = ({ period }: Props) => {
  const { plans, isLoading } = useQualityActionPlans() as any;
  const counts = useMemo(() => computeActionPlanStatus(plans ?? [], period), [plans, period]);

  const data = (Object.keys(LABELS) as Array<keyof typeof LABELS>)
    .map((k) => ({ key: k, name: LABELS[k], value: counts[k], color: COLORS[k] }))
    .filter((d) => d.value > 0);

  const pct = (v: number) => (counts.total > 0 ? Math.round((v / counts.total) * 100) : 0);
  const overdueShare = pct(counts.overdue);
  const description =
    counts.total === 0
      ? "Saúde dos planos de ação no período."
      : overdueShare >= 25
      ? `Atenção: ${overdueShare}% dos planos estão atrasados.`
      : `${pct(counts.completed)}% concluídos, ${pct(counts.in_progress)}% em andamento.`;

  return (
    <ChartCard title="Status dos Planos de Ação" description={description}>
      {isLoading ? (
        <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Carregando…</div>
      ) : counts.total === 0 ? (
        <EmptyChartState message="Nenhum plano de ação criado no período selecionado." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-[1fr_180px] gap-4 items-center h-full">
          <div className="relative">
            <ResponsiveContainer width="100%" height={240}>
              <PieChart>
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--background))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                  formatter={(v: any, n: string) => [`${v} (${pct(v as number)}%)`, n]}
                />
                <Pie data={data} dataKey="value" nameKey="name" innerRadius={60} outerRadius={95} paddingAngle={2}>
                  {data.map((d) => (
                    <Cell key={d.key} fill={d.color} />
                  ))}
                </Pie>
              </PieChart>
            </ResponsiveContainer>
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
              <p className="text-2xl font-bold">{counts.total}</p>
              <p className="text-[10px] uppercase tracking-wide text-muted-foreground">planos</p>
            </div>
          </div>
          <div className="space-y-2">
            {(Object.keys(LABELS) as Array<keyof typeof LABELS>).map((k) => (
              <div key={k} className="flex items-center justify-between text-sm gap-2">
                <div className="flex items-center gap-2 min-w-0">
                  <span className="h-2.5 w-2.5 rounded-sm shrink-0" style={{ background: COLORS[k] }} />
                  <span className="text-muted-foreground truncate">{LABELS[k]}</span>
                </div>
                <span className="font-medium tabular-nums">
                  {counts[k]} <span className="text-muted-foreground text-xs">({pct(counts[k])}%)</span>
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </ChartCard>
  );
};

export default ActionPlanStatusDonut;
