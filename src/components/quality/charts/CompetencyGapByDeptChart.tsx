import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Legend } from "recharts";
import { useQualityMatrix } from "@/hooks/useQualityMatrix";
import { computeCompetencyGapByGroup } from "@/lib/qualityChartAggregations";
import ChartCard from "./ChartCard";
import EmptyChartState from "./EmptyChartState";

const CompetencyGapByDeptChart = () => {
  const { items, isLoading } = useQualityMatrix() as any;
  const rows = useMemo(() => computeCompetencyGapByGroup(items ?? []), [items]);

  const data = rows.map((r) => ({
    group: r.group,
    Conforme: r.total > 0 ? +((r.conforme / r.total) * 100).toFixed(1) : 0,
    "Gap leve": r.total > 0 ? +((r.gapLeve / r.total) * 100).toFixed(1) : 0,
    "Gap crítico": r.total > 0 ? +((r.gapCritico / r.total) * 100).toFixed(1) : 0,
    _total: r.total,
  }));

  const worst = rows[0];
  const description = worst
    ? `Setor com maior gap crítico: "${worst.group}" (${Math.round(worst.criticoPct)}%).`
    : "Maturidade da matriz de competências por setor/função.";

  const mandatoryCount = (items ?? []).filter((r: any) => r.is_mandatory).length;

  return (
    <ChartCard
      title="Maturidade da Matriz de Competências"
      description={description}
      footer="% de pessoas conformes vs. com gap em requisitos mandatórios."
    >
      {isLoading ? (
        <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Carregando…</div>
      ) : mandatoryCount === 0 ? (
        <EmptyChartState
          variant="setup_pending"
          message="Nenhum requisito mandatório cadastrado na Matriz de Competências. Configure os requisitos para visualizar o gráfico."
          ctaLabel="Abrir Matriz de Competências"
          ctaTo="/quality/competencies?tab=matrix"
        />
      ) : data.length === 0 ? (
        <EmptyChartState message="Sem dados de competências para exibir." />
      ) : (
        <ResponsiveContainer width="100%" height={Math.max(240, data.length * 36 + 60)}>
          <BarChart data={data} layout="vertical" margin={{ top: 8, right: 16, bottom: 8, left: 12 }} stackOffset="expand">
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" horizontal={false} />
            <XAxis
              type="number"
              domain={[0, 100]}
              tickFormatter={(v) => `${Math.round(v * 100)}%`}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            />
            <YAxis
              type="category"
              dataKey="group"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              width={110}
            />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(v: any, n: string) => [`${v}%`, n]}
              labelFormatter={(label, items) => {
                const total = (items?.[0]?.payload as any)?._total ?? 0;
                return `${label} · ${total} avaliações`;
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            <Bar dataKey="Conforme" stackId="g" fill="hsl(var(--success, 142 71% 45%))" />
            <Bar dataKey="Gap leve" stackId="g" fill="hsl(var(--warning, 38 92% 50%))" />
            <Bar dataKey="Gap crítico" stackId="g" fill="hsl(var(--destructive))" />
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
};

export default CompetencyGapByDeptChart;
