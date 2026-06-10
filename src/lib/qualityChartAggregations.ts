import { parseISO, startOfMonth, format, addMonths, isAfter, isBefore } from "date-fns";

export type PeriodKey = "90d" | "6m" | "12m" | "ytd";

export const PERIOD_LABELS: Record<PeriodKey, string> = {
  "90d": "Últimos 90 dias",
  "6m": "Últimos 6 meses",
  "12m": "Últimos 12 meses",
  ytd: "Ano corrente",
};

export const periodStart = (period: PeriodKey): Date => {
  const now = new Date();
  switch (period) {
    case "90d": {
      const d = new Date(now);
      d.setDate(d.getDate() - 90);
      return d;
    }
    case "6m":
      return addMonths(now, -6);
    case "12m":
      return addMonths(now, -12);
    case "ytd":
      return new Date(now.getFullYear(), 0, 1);
  }
};

const inRange = (iso: string | null | undefined, from: Date, to: Date = new Date()) => {
  if (!iso) return false;
  try {
    const d = parseISO(iso);
    return !isBefore(d, from) && !isAfter(d, to);
  } catch {
    return false;
  }
};

// ---------- Pareto de RNCs ----------
export interface ParetoRow {
  label: string;
  count: number;
  cumulativePct: number;
}

export const computeNcrPareto = (
  ncrs: Array<{ source: string | null; affected_area: string | null; created_at: string }>,
  period: PeriodKey,
  maxBuckets = 8,
): ParetoRow[] => {
  const from = periodStart(period);
  const filtered = ncrs.filter((n) => inRange(n.created_at, from));
  if (filtered.length === 0) return [];

  const groups = new Map<string, number>();
  for (const n of filtered) {
    const key = (n.source && n.source.trim()) || (n.affected_area && n.affected_area.trim()) || "Sem origem";
    groups.set(key, (groups.get(key) ?? 0) + 1);
  }
  const sorted = Array.from(groups.entries()).sort((a, b) => b[1] - a[1]);
  const top = sorted.slice(0, maxBuckets);
  const rest = sorted.slice(maxBuckets);
  if (rest.length > 0) {
    const restTotal = rest.reduce((s, [, c]) => s + c, 0);
    top.push(["Outros", restTotal]);
  }
  const total = top.reduce((s, [, c]) => s + c, 0);
  let acc = 0;
  return top.map(([label, count]) => {
    acc += count;
    return { label, count, cumulativePct: Math.round((acc / total) * 100) };
  });
};

// ---------- Status de Planos de Ação ----------
export type ActionPlanBucket = "completed" | "in_progress" | "overdue" | "not_started";

export interface ActionPlanStatusCounts {
  completed: number;
  in_progress: number;
  overdue: number;
  not_started: number;
  total: number;
}

const NOT_STARTED_STATUSES = new Set(["proposed", "pending", "draft"]);
const COMPLETED_STATUSES = new Set(["effective", "ineffective", "closed", "completed"]);

export const computeActionPlanStatus = (
  plans: Array<{ status: string; target_date: string | null; completed_date: string | null; created_at: string }>,
  period: PeriodKey,
): ActionPlanStatusCounts => {
  const from = periodStart(period);
  const filtered = plans.filter((p) => inRange(p.created_at, from));
  const now = new Date();
  const counts: ActionPlanStatusCounts = {
    completed: 0,
    in_progress: 0,
    overdue: 0,
    not_started: 0,
    total: filtered.length,
  };
  for (const p of filtered) {
    if (COMPLETED_STATUSES.has(p.status)) {
      counts.completed += 1;
      continue;
    }
    const overdue = p.target_date ? isBefore(parseISO(p.target_date), now) : false;
    if (overdue) {
      counts.overdue += 1;
      continue;
    }
    if (NOT_STARTED_STATUSES.has(p.status)) {
      counts.not_started += 1;
    } else {
      counts.in_progress += 1;
    }
  }
  return counts;
};

// ---------- Maturidade Matriz ----------
export interface CompetencyGapRow {
  group: string;
  conforme: number;
  gapLeve: number;
  gapCritico: number;
  total: number;
  criticoPct: number;
}

export const computeCompetencyGapByGroup = (
  rows: Array<{ role: string; gap: number; is_mandatory: boolean }>,
): CompetencyGapRow[] => {
  const mandatory = rows.filter((r) => r.is_mandatory);
  if (mandatory.length === 0) return [];
  const map = new Map<string, { conforme: number; gapLeve: number; gapCritico: number }>();
  for (const r of mandatory) {
    const key = r.role || "Sem função";
    const entry = map.get(key) ?? { conforme: 0, gapLeve: 0, gapCritico: 0 };
    if (r.gap <= 0) entry.conforme += 1;
    else if (r.gap === 1) entry.gapLeve += 1;
    else entry.gapCritico += 1;
    map.set(key, entry);
  }
  const result: CompetencyGapRow[] = [];
  for (const [group, v] of map.entries()) {
    const total = v.conforme + v.gapLeve + v.gapCritico;
    result.push({
      group,
      ...v,
      total,
      criticoPct: total > 0 ? (v.gapCritico / total) * 100 : 0,
    });
  }
  return result.sort((a, b) => b.criticoPct - a.criticoPct);
};

// ---------- Tendência de Vencimentos ----------
export type ExpirationSeries = "documents" | "devices" | "audits" | "suppliers";

export const EXPIRATION_LABELS: Record<ExpirationSeries, string> = {
  documents: "Revisão de documentos",
  devices: "Calibrações",
  audits: "Auditorias",
  suppliers: "Reavaliação de fornecedores",
};

export interface ExpirationMonth {
  monthKey: string; // yyyy-MM
  monthLabel: string;
  documents: number;
  devices: number;
  audits: number;
  suppliers: number;
  total: number;
}

interface ExpirationInputs {
  documents: Array<{ next_review_date: string | null }>;
  devices: Array<{ next_calibration_due: string | null }>;
  audits: Array<{ planned_date: string | null; status: string }>;
  suppliers: Array<{ next_evaluation_due: string | null }>;
}

export const computeUpcomingExpirations = (
  inputs: ExpirationInputs,
): { months: ExpirationMonth[]; activeSeries: ExpirationSeries[] } => {
  const now = new Date();
  const start = startOfMonth(now);
  const months: ExpirationMonth[] = [];
  for (let i = 0; i < 12; i++) {
    const d = addMonths(start, i);
    months.push({
      monthKey: format(d, "yyyy-MM"),
      monthLabel: format(d, "MMM/yy"),
      documents: 0,
      devices: 0,
      audits: 0,
      suppliers: 0,
      total: 0,
    });
  }
  const limit = addMonths(start, 12);

  const bucket = (iso: string | null | undefined, key: ExpirationSeries) => {
    if (!iso) return; // null explicitly excluded
    let d: Date;
    try {
      d = parseISO(iso);
    } catch {
      return;
    }
    if (isBefore(d, start) || !isBefore(d, limit)) return;
    const mk = format(startOfMonth(d), "yyyy-MM");
    const m = months.find((x) => x.monthKey === mk);
    if (!m) return;
    m[key] += 1;
    m.total += 1;
  };

  inputs.documents.forEach((x) => bucket(x.next_review_date, "documents"));
  inputs.devices.forEach((x) => bucket(x.next_calibration_due, "devices"));
  inputs.audits
    .filter((a) => a.status === "planned" || a.status === "in_progress")
    .forEach((x) => bucket(x.planned_date, "audits"));
  inputs.suppliers.forEach((x) => bucket(x.next_evaluation_due, "suppliers"));

  const activeSeries: ExpirationSeries[] = (["documents", "devices", "audits", "suppliers"] as ExpirationSeries[]).filter(
    (k) => months.some((m) => m[k] > 0),
  );

  return { months, activeSeries };
};

export const peakMonthThreshold = (months: ExpirationMonth[]): number => {
  const vals = months.map((m) => m.total).filter((v) => v > 0).sort((a, b) => a - b);
  if (vals.length === 0) return Infinity;
  const idx = Math.floor(vals.length * 0.75);
  return vals[Math.min(idx, vals.length - 1)];
};
