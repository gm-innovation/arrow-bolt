import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AuvoInsightRow {
  key: string;
  label: string;
  detected: number;
  resolved: number;
  pending: number;
  stockNotReported: number;
  valueAtRisk: number;
  valueRecovered: number;
}

export interface AuvoEfficiency {
  detected: number;
  resolved: number;
  pending: number;
  confirmed: number;
  justified: number;
  dismissed: number;
  resolutionRate: number;
  valueAtRisk: number;
  valueRecovered: number;
  valuePending: number;
  avgResolutionHours: number | null;
  byTechnician: AuvoInsightRow[];
  byCustomer: AuvoInsightRow[];
  byMonth: { month: string; detected: number; resolved: number; valueRecovered: number }[];
}

interface Params {
  periodStart: string; // yyyy-MM-dd
  periodEnd: string; // yyyy-MM-dd
}

interface Row {
  id: string;
  classification: string;
  review_status: string;
  value_at_risk: number | null;
  created_at: string;
  reviewed_at: string | null;
  auvo_tasks: {
    technician_name: string | null;
    customer_name: string | null;
    task_date: string | null;
  } | null;
}

const RESOLVED = ["confirmed", "justified", "dismissed"];

const emptyRow = (key: string, label: string): AuvoInsightRow => ({
  key,
  label,
  detected: 0,
  resolved: 0,
  pending: 0,
  stockNotReported: 0,
  valueAtRisk: 0,
  valueRecovered: 0,
});

/**
 * Painel gerencial de divergências Auvo por período.
 * Mede volume detectado, o quanto foi efetivamente tratado (eficiência do
 * sistema) e o valor recuperado por técnico/cliente.
 */
export const useAuvoInsights = ({ periodStart, periodEnd }: Params) => {
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  return useQuery({
    queryKey: ["auvo-insights", companyId, periodStart, periodEnd],
    enabled: !!companyId,
    queryFn: async (): Promise<AuvoEfficiency> => {
      const { data, error } = await supabase
        .from("auvo_material_discrepancies")
        .select(
          `id, classification, review_status, value_at_risk, created_at, reviewed_at,
           auvo_tasks:auvo_task_uid ( technician_name, customer_name, task_date )`,
        )
        .not("classification", "in", "(match,stock_returned)")
        .gte("created_at", `${periodStart}T00:00:00`)
        .lte("created_at", `${periodEnd}T23:59:59`)
        .limit(5000);

      if (error) throw error;
      const rows = (data ?? []) as unknown as Row[];

      const techMap = new Map<string, AuvoInsightRow>();
      const custMap = new Map<string, AuvoInsightRow>();
      const monthMap = new Map<
        string,
        { month: string; detected: number; resolved: number; valueRecovered: number }
      >();

      let resolved = 0;
      let confirmed = 0;
      let justified = 0;
      let dismissed = 0;
      let valueAtRisk = 0;
      let valueRecovered = 0;
      let valuePending = 0;
      let resolutionHoursSum = 0;
      let resolutionHoursCount = 0;

      for (const r of rows) {
        const value = Number(r.value_at_risk ?? 0);
        const isResolved = RESOLVED.includes(r.review_status);
        valueAtRisk += value;

        if (isResolved) {
          resolved += 1;
          valueRecovered += value;
          if (r.review_status === "confirmed") confirmed += 1;
          if (r.review_status === "justified") justified += 1;
          if (r.review_status === "dismissed") dismissed += 1;
          if (r.reviewed_at) {
            const hours =
              (new Date(r.reviewed_at).getTime() - new Date(r.created_at).getTime()) / 3_600_000;
            if (hours >= 0) {
              resolutionHoursSum += hours;
              resolutionHoursCount += 1;
            }
          }
        } else {
          valuePending += value;
        }

        const techKey = r.auvo_tasks?.technician_name?.trim() || "Não informado";
        const custKey = r.auvo_tasks?.customer_name?.trim() || "Não informado";
        for (const [map, key] of [
          [techMap, techKey],
          [custMap, custKey],
        ] as const) {
          const entry = map.get(key) ?? emptyRow(key, key);
          entry.detected += 1;
          entry.valueAtRisk += value;
          if (isResolved) {
            entry.resolved += 1;
            entry.valueRecovered += value;
          } else {
            entry.pending += 1;
          }
          if (r.classification === "stock_not_reported") entry.stockNotReported += 1;
          map.set(key, entry);
        }

        const month = r.created_at.slice(0, 7);
        const m = monthMap.get(month) ?? { month, detected: 0, resolved: 0, valueRecovered: 0 };
        m.detected += 1;
        if (isResolved) {
          m.resolved += 1;
          m.valueRecovered += value;
        }
        monthMap.set(month, m);
      }

      const sortRows = (map: Map<string, AuvoInsightRow>) =>
        Array.from(map.values()).sort(
          (a, b) => b.valueAtRisk - a.valueAtRisk || b.detected - a.detected,
        );

      return {
        detected: rows.length,
        resolved,
        pending: rows.length - resolved,
        confirmed,
        justified,
        dismissed,
        resolutionRate: rows.length ? (resolved / rows.length) * 100 : 0,
        valueAtRisk,
        valueRecovered,
        valuePending,
        avgResolutionHours: resolutionHoursCount
          ? resolutionHoursSum / resolutionHoursCount
          : null,
        byTechnician: sortRows(techMap),
        byCustomer: sortRows(custMap),
        byMonth: Array.from(monthMap.values()).sort((a, b) => a.month.localeCompare(b.month)),
      };
    },
  });
};
