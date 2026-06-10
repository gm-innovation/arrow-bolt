import { useMemo } from "react";
import { Bar, BarChart, CartesianGrid, Cell, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";
import { useQualityDocuments } from "@/hooks/useQualityDocuments";
import { useQualityDevices } from "@/hooks/useQualityDevices";
import { useQualityAudits } from "@/hooks/useQualityAudits";
import { useQualitySuppliers } from "@/hooks/useQualitySuppliers";
import {
  computeUpcomingExpirations,
  peakMonthThreshold,
  EXPIRATION_LABELS,
  ExpirationSeries,
} from "@/lib/qualityChartAggregations";
import ChartCard from "./ChartCard";
import EmptyChartState from "./EmptyChartState";

const SERIES_COLORS: Record<ExpirationSeries, string> = {
  documents: "hsl(var(--primary))",
  devices: "hsl(var(--warning, 38 92% 50%))",
  audits: "hsl(var(--success, 142 71% 45%))",
  suppliers: "hsl(var(--destructive))",
};

const UpcomingExpirationsTrendChart = () => {
  const { documents, isLoading: l1 } = useQualityDocuments() as any;
  const { items: devices, isLoading: l2 } = useQualityDevices() as any;
  const { audits, isLoading: l3 } = useQualityAudits() as any;
  const { items: suppliers, isLoading: l4 } = useQualitySuppliers() as any;

  const isLoading = l1 || l2 || l3 || l4;

  const { months, activeSeries } = useMemo(
    () =>
      computeUpcomingExpirations({
        documents: documents ?? [],
        devices: devices ?? [],
        audits: audits ?? [],
        suppliers: suppliers ?? [],
      }),
    [documents, devices, audits, suppliers],
  );

  const threshold = useMemo(() => peakMonthThreshold(months), [months]);

  const peakMonth = months.reduce((acc, m) => (m.total > (acc?.total ?? 0) ? m : acc), months[0]);
  const description =
    activeSeries.length === 0
      ? "Volume de vencimentos previstos para os próximos 12 meses."
      : peakMonth && peakMonth.total > 0
      ? `Pico previsto em ${peakMonth.monthLabel} (${peakMonth.total} vencimentos).`
      : "Volume de vencimentos previstos para os próximos 12 meses.";

  return (
    <ChartCard
      title="Tendência de Vencimentos · próximos 12 meses"
      description={description}
      footer="Meses em destaque concentram a maior parte da carga prevista. Apenas séries com dados são exibidas."
    >
      {isLoading ? (
        <div className="h-full flex items-center justify-center text-sm text-muted-foreground">Carregando…</div>
      ) : activeSeries.length === 0 ? (
        <EmptyChartState message="Nenhum vencimento programado nos próximos 12 meses." />
      ) : (
        <ResponsiveContainer width="100%" height={280}>
          <BarChart data={months} margin={{ top: 8, right: 12, bottom: 8, left: 0 }}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
            <XAxis dataKey="monthLabel" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <YAxis allowDecimals={false} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
            <Tooltip
              contentStyle={{
                background: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                borderRadius: 8,
                fontSize: 12,
              }}
              labelFormatter={(l, items) => {
                const total = (items?.[0]?.payload as any)?.total ?? 0;
                return `${l} · total ${total}`;
              }}
            />
            <Legend wrapperStyle={{ fontSize: 12 }} />
            {activeSeries.map((k, idx) => (
              <Bar
                key={k}
                dataKey={k}
                stackId="exp"
                name={EXPIRATION_LABELS[k]}
                fill={SERIES_COLORS[k]}
              >
                {idx === activeSeries.length - 1 &&
                  months.map((m) => (
                    <Cell
                      key={m.monthKey}
                      stroke={m.total >= threshold && m.total > 0 ? "hsl(var(--foreground))" : "transparent"}
                      strokeWidth={m.total >= threshold && m.total > 0 ? 2 : 0}
                    />
                  ))}
              </Bar>
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </ChartCard>
  );
};

export default UpcomingExpirationsTrendChart;
