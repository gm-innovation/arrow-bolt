import { useState } from "react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BarChart3 } from "lucide-react";
import { PERIOD_LABELS, PeriodKey } from "@/lib/qualityChartAggregations";
import NcrParetoChart from "./NcrParetoChart";
import ActionPlanStatusDonut from "./ActionPlanStatusDonut";
import CompetencyGapByDeptChart from "./CompetencyGapByDeptChart";
import UpcomingExpirationsTrendChart from "./UpcomingExpirationsTrendChart";

const QualityAnalyticsSection = () => {
  const [period, setPeriod] = useState<PeriodKey>("12m");

  return (
    <section className="space-y-4">
      <div className="flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-primary" />
          <div>
            <h3 className="text-lg font-semibold">Análise visual</h3>
            <p className="text-xs text-muted-foreground">
              Tendências, distribuição e planejamento — visão analítica do SGQ.
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-xs text-muted-foreground hidden sm:inline">Período (RNCs e Planos):</span>
          <Select value={period} onValueChange={(v) => setPeriod(v as PeriodKey)}>
            <SelectTrigger className="h-8 w-[180px] text-xs">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {(Object.keys(PERIOD_LABELS) as PeriodKey[]).map((k) => (
                <SelectItem key={k} value={k} className="text-xs">
                  {PERIOD_LABELS[k]}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <NcrParetoChart period={period} />
        <ActionPlanStatusDonut period={period} />
        <CompetencyGapByDeptChart />
        <UpcomingExpirationsTrendChart />
      </div>
    </section>
  );
};

export default QualityAnalyticsSection;
