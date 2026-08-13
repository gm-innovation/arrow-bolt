import { parseISO, differenceInCalendarDays } from "date-fns";
import type { VacationRequest } from "@/hooks/useVacations";

export interface VacationOverlap {
  request: VacationRequest;
  /** dias de interseção com a programação de referência */
  overlapDays: number;
  overlapStart: string;
  overlapEnd: string;
  /** true quando os dois colaboradores são do mesmo setor (risco de desfalque) */
  sameDepartment: boolean;
}

const ACTIVE = (r: VacationRequest) => !["rejected", "cancelled"].includes(r.status);

function toISO(d: Date) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** Mapa programacao_id -> colegas com gozo sobreposto (dias exatos de interseção). */
export function computeVacationOverlaps(
  requests: VacationRequest[]
): Map<string, VacationOverlap[]> {
  const list = requests.filter(ACTIVE);
  const map = new Map<string, VacationOverlap[]>();

  for (let i = 0; i < list.length; i++) {
    for (let j = i + 1; j < list.length; j++) {
      const a = list[i];
      const b = list[j];
      const aStart = parseISO(a.start_date);
      const aEnd = parseISO(a.end_date);
      const bStart = parseISO(b.start_date);
      const bEnd = parseISO(b.end_date);
      const start = aStart > bStart ? aStart : bStart;
      const end = aEnd < bEnd ? aEnd : bEnd;
      const days = differenceInCalendarDays(end, start) + 1;
      if (days <= 0) continue;
      const depA = a.employee?.department_id ?? null;
      const depB = b.employee?.department_id ?? null;
      const sameDepartment = !!depA && !!depB && depA === depB;
      const info = {
        overlapDays: days,
        overlapStart: toISO(start),
        overlapEnd: toISO(end),
        sameDepartment,
      };
      map.set(a.id, [...(map.get(a.id) ?? []), { request: b, ...info }]);
      map.set(b.id, [...(map.get(b.id) ?? []), { request: a, ...info }]);
    }
  }

  map.forEach((v) =>
    v.sort(
      (x, y) =>
        Number(y.sameDepartment) - Number(x.sameDepartment) || y.overlapDays - x.overlapDays
    )
  );
  return map;
}

/**
 * Conflito de caixa: quantos colaboradores distintos INICIAM férias em cada mês
 * do ano informado (independe de setor — o pagamento sai no mês do início).
 */
export function monthStartCounts(requests: VacationRequest[], year: number): number[] {
  const totals = new Array(12).fill(0);
  const seen = new Set<string>();
  requests.filter(ACTIVE).forEach((r) => {
    const start = parseISO(r.start_date);
    if (start.getFullYear() !== year) return;
    const key = `${r.employee_id}-${start.getMonth()}-${r.id}`;
    if (seen.has(key)) return;
    seen.add(key);
    totals[start.getMonth()] += 1;
  });
  return totals;
}

/** Colaboradores de férias em um dia específico (ISO yyyy-MM-dd). */
export function requestsOnDay(requests: VacationRequest[], iso: string) {
  return requests.filter((r) => ACTIVE(r) && r.start_date <= iso && r.end_date >= iso);
}
