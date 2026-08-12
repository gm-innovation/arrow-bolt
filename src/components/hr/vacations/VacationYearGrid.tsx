import { useMemo } from "react";
import { parseISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { VacationConflict, VacationRequest, VacationRules } from "@/hooks/useVacations";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

interface Cell {
  request: VacationRequest;
  hasConflict: boolean;
}

export function VacationYearGrid({
  year,
  requests,
  conflicts,
  rules,
}: {
  year: number;
  requests: VacationRequest[];
  conflicts: VacationConflict[];
  rules: VacationRules | null;
}) {
  const conflictsByRequest = useMemo(() => {
    const map = new Map<string, VacationConflict[]>();
    conflicts.forEach((c) => {
      if (c.resolvido) return;
      map.set(c.programacao_id, [...(map.get(c.programacao_id) ?? []), c]);
    });
    return map;
  }, [conflicts]);

  const rows = useMemo(() => {
    const byEmployee = new Map<string, { name: string; position: string | null; cells: Map<number, Cell[]> }>();
    requests
      .filter((r) => !["rejected", "cancelled"].includes(r.status))
      .forEach((r) => {
        const start = parseISO(r.start_date);
        const end = parseISO(r.end_date);
        const months = new Set<number>();
        [start, end].forEach((d) => {
          if (d.getFullYear() === year) months.add(d.getMonth());
        });
        if (months.size === 0) return;
        const key = r.employee_id;
        if (!byEmployee.has(key)) {
          byEmployee.set(key, {
            name: r.employee?.full_name ?? "—",
            position: r.employee?.position ?? null,
            cells: new Map(),
          });
        }
        const row = byEmployee.get(key)!;
        months.forEach((m) => {
          row.cells.set(m, [
            ...(row.cells.get(m) ?? []),
            { request: r, hasConflict: (conflictsByRequest.get(r.id) ?? []).length > 0 },
          ]);
        });
      });
    return [...byEmployee.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [requests, year, conflictsByRequest]);

  const monthTotals = useMemo(() => {
    const totals = new Array(12).fill(0);
    rows.forEach((row) => row.cells.forEach((_v, m) => (totals[m] += 1)));
    return totals;
  }, [rows]);

  const limit = rules?.max_ferias_por_mes ?? 3;

  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Nenhuma programação de férias registrada para {year}.
      </p>
    );
  }

  return (
    <TooltipProvider>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[820px] border-separate border-spacing-0 text-sm">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 bg-background px-2 py-2 text-left font-medium">Colaborador</th>
              {MONTHS.map((m, i) => (
                <th key={m} className="px-1 py-2 text-center font-medium">
                  <div>{m}</div>
                  <div
                    className={cn(
                      "text-xs font-normal",
                      monthTotals[i] > limit ? "text-destructive" : "text-muted-foreground"
                    )}
                  >
                    {monthTotals[i]}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.name} className="border-t">
                <td className="sticky left-0 z-10 bg-background px-2 py-2">
                  <div className="font-medium">{row.name}</div>
                  {row.position && <div className="text-xs text-muted-foreground">{row.position}</div>}
                </td>
                {MONTHS.map((m, i) => {
                  const cells = row.cells.get(i) ?? [];
                  const saturated = monthTotals[i] > limit;
                  if (cells.length === 0) {
                    return (
                      <td key={m} className="px-1 py-2">
                        <div className={cn("h-6 rounded", saturated ? "bg-destructive/5" : "bg-muted/40")} />
                      </td>
                    );
                  }
                  const conflicted = cells.some((c) => c.hasConflict);
                  return (
                    <td key={m} className="px-1 py-2">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <div
                            className={cn(
                              "flex h-6 cursor-default items-center justify-center rounded text-xs font-medium text-primary-foreground",
                              conflicted ? "bg-destructive" : "bg-primary"
                            )}
                          >
                            {cells[0].request.requested_days}d
                          </div>
                        </TooltipTrigger>
                        <TooltipContent>
                          {cells.map((c) => (
                            <div key={c.request.id} className="text-xs">
                              {c.request.start_date} → {c.request.end_date} · {c.request.requested_days}d
                              {c.request.sell_days > 0 && ` + ${c.request.sell_days}d abono`}
                              {c.hasConflict && " · conflito"}
                            </div>
                          ))}
                        </TooltipContent>
                      </Tooltip>
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
        <div className="mt-3 flex flex-wrap items-center gap-3 text-xs text-muted-foreground">
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded bg-primary" /> Programado
          </span>
          <span className="flex items-center gap-1">
            <span className="inline-block h-3 w-3 rounded bg-destructive" /> Com conflito
          </span>
          <Badge variant="outline">Limite: {limit} colaboradores/mês</Badge>
        </div>
      </div>
    </TooltipProvider>
  );
}
