import { format, parseISO } from "date-fns";
import type { VacationOverlap } from "@/lib/hr/vacationOverlaps";

const d = (iso: string) => format(parseISO(iso), "dd/MM/yyyy");

export function OverlapList({
  overlaps,
  title = "Sobreposição com",
}: {
  overlaps: VacationOverlap[];
  title?: string;
}) {
  if (overlaps.length === 0) return null;
  return (
    <div className="space-y-1">
      <p className="text-xs font-medium">{title}</p>
      <ul className="space-y-1">
        {overlaps.map((o) => (
          <li key={o.request.id} className="text-xs text-muted-foreground">
            <span className="font-medium text-foreground">
              {o.request.employee?.full_name ?? "—"}
            </span>
            {o.request.employee?.position ? ` (${o.request.employee.position})` : ""}
            {" · "}
            {d(o.request.start_date)} → {d(o.request.end_date)} · {o.request.requested_days}d
            <div>
              coincidem {o.overlapDays} dia{o.overlapDays > 1 ? "s" : ""}: {d(o.overlapStart)} →{" "}
              {d(o.overlapEnd)}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
