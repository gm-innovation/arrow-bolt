import { format, parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import type { VacationOverlap } from "@/lib/hr/vacationOverlaps";

const d = (iso: string) => format(parseISO(iso), "dd/MM/yyyy");

function Item({ o, alert }: { o: VacationOverlap; alert: boolean }) {
  return (
    <li className="text-xs text-muted-foreground">
      <span className={cn("font-medium", alert ? "text-destructive" : "text-foreground")}>
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
  );
}

export function OverlapList({ overlaps }: { overlaps: VacationOverlap[] }) {
  if (overlaps.length === 0) return null;
  const same = overlaps.filter((o) => o.sameDepartment);
  const other = overlaps.filter((o) => !o.sameDepartment);

  return (
    <div className="space-y-2">
      {same.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium text-destructive">
            Risco de desfalque — mesmo setor
          </p>
          <ul className="space-y-1">
            {same.map((o) => (
              <Item key={o.request.id} o={o} alert />
            ))}
          </ul>
        </div>
      )}
      {other.length > 0 && (
        <div className="space-y-1">
          <p className="text-xs font-medium">Sobreposição com outros setores (informativo)</p>
          <ul className="space-y-1">
            {other.map((o) => (
              <Item key={o.request.id} o={o} alert={false} />
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
