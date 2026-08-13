import { parseISO, differenceInCalendarDays } from "date-fns";
import type { VacationRequest } from "@/hooks/useVacations";

export interface VacationOverlap {
  request: VacationRequest;
  /** dias de interseção com a programação de referência */
  overlapDays: number;
  overlapStart: string;
  overlapEnd: string;
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
      const info = { overlapDays: days, overlapStart: toISO(start), overlapEnd: toISO(end) };
      map.set(a.id, [...(map.get(a.id) ?? []), { request: b, ...info }]);
      map.set(b.id, [...(map.get(b.id) ?? []), { request: a, ...info }]);
    }
  }

  map.forEach((v) => v.sort((x, y) => y.overlapDays - x.overlapDays));
  return map;
}

/** Colaboradores de férias em um dia específico (ISO yyyy-MM-dd). */
export function requestsOnDay(requests: VacationRequest[], iso: string) {
  return requests.filter((r) => ACTIVE(r) && r.start_date <= iso && r.end_date >= iso);
}
