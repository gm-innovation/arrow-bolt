import { useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Bar, ComposedChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis, CartesianGrid } from "recharts";
import { useQualityNCRs } from "@/hooks/useQualityNCRs";
import { computeNcrPareto, PeriodKey } from "@/lib/qualityChartAggregations";
import ChartCard from "./ChartCard";
import EmptyChartState from "./EmptyChartState";

interface Props {
  period: PeriodKey;
}

const NcrParetoChart = ({ period }: Props) => {
  const { ncrs, isLoading } = useQualityNCRs() as any;
  const navigate = useNavigate();

  const data = useMemo(() => computeNcrPareto(ncrs ?? [], period), [ncrs, period]);

  const top = data[0];
  const cumulativeAt80 = data.findIndex((d) => d.cumulativePct >= 80);
  const description =
    cumulativeAt80 >= 0 && data.length > 1
      ? `${cumulativeAt80 + 1} origem(ns) concentram ~80% das RNCs.`
      : top
      ? `Maior incidência: "${top.label}" (${top.count}).`
      : "Distribuição de RNCs por origem.";

  return (
    <ChartCard
      title="Pareto de RNCs por origem"
      description={description}
      footer="Regra 80/20: foque nas barras à esquerda para o maior ganho."
    >
      {isLoading ? (
        <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Carregando…</div>
      ) : data.length === 0 ? (
        <EmptyChartState message="Nenhuma RNC registrada no período selecionado." />
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <ComposedChart
            data={data}
            margin={{ top: 8, right: 12, bottom: 8, left: 0 }}
            onClick={(state: any) => {
              const label = state?.activeLabel;
              if (label && label !== "Outros") {
                navigate(`/quality/ncrs?source=${encodeURIComponent(label)}`);
              }
            }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
              interval={0}
              angle={-20}
              textAnchor="end"
              height={60}
            />
            <YAxis yAxisId="left" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} allowDecimals={false} />
            <YAxis
              yAxisId="right"
              orientation="right"
              domain={[0, 100]}
              tickFormatter={(v) => `${v}%`}
              tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }}
            />
            <Tooltip
              cursor={{ fill: "hsl(var(--muted) / 0.3)" }}
              contentStyle={{
                background: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
              formatter={(value: any, name: string) =>
                name === "% acumulado" ? [`${value}%`, name] : [value, name]
              }
            />
            <Bar yAxisId="left" dataKey="count" name="RNCs" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
            <Line
              yAxisId="right"
              type="monotone"
              dataKey="cumulativePct"
              name="% acumulado"
              stroke="hsl(var(--destructive))"
              strokeWidth={2}
              dot={{ r: 3 }}
            />
          </ComposedChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
};

export default NcrParetoChart;
