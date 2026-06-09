import { Badge } from "@/components/ui/badge";
import type { QualityIndicator, QualityIndicatorMeasurement } from "@/hooks/useQualityPlanning";

export type IndicatorTrend = "green" | "yellow" | "red" | "neutral";

/**
 * Farol vs. meta:
 * verde   = último valor >= meta
 * amarelo = último valor entre 80% e <100% da meta
 * vermelho = último valor < 80% da meta OU sem medição
 */
export const computeIndicatorTrend = (
  indicator: Pick<QualityIndicator, "target_value">,
  measurements: Pick<QualityIndicatorMeasurement, "value" | "period_end">[],
): IndicatorTrend => {
  if (indicator.target_value == null) return "neutral";
  if (!measurements.length) return "red";
  const sorted = [...measurements].sort((a, b) => b.period_end.localeCompare(a.period_end));
  const last = Number(sorted[0].value);
  const target = Number(indicator.target_value);
  if (target === 0) return last >= 0 ? "green" : "red";
  const ratio = last / target;
  if (ratio >= 1) return "green";
  if (ratio >= 0.8) return "yellow";
  return "red";
};

const TONE: Record<IndicatorTrend, string> = {
  green: "border-emerald-600 text-emerald-700 bg-emerald-50",
  yellow: "border-amber-500 text-amber-700 bg-amber-50",
  red: "border-red-500 text-red-700 bg-red-50",
  neutral: "border-muted-foreground text-muted-foreground",
};

const LABEL: Record<IndicatorTrend, string> = {
  green: "No alvo",
  yellow: "Atenção",
  red: "Crítico",
  neutral: "Sem meta",
};

const IndicatorStatusBadge = ({ trend }: { trend: IndicatorTrend }) => (
  <Badge variant="outline" className={TONE[trend]}>
    {LABEL[trend]}
  </Badge>
);

export default IndicatorStatusBadge;
