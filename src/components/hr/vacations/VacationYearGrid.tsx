import { useMemo } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { conflictTypeLabel, VacationConflict, VacationRequest, VacationRules } from "@/hooks/useVacations";
import { computeVacationOverlaps, monthStartCounts } from "@/lib/hr/vacationOverlaps";
import { OverlapList } from "./OverlapList";

const MONTHS = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];

interface Bar {
  request: VacationRequest;
  startMonth: number;
  endMonth: number;
  continuesBefore: boolean;
  continuesAfter: boolean;
  conflicts: VacationConflict[];
}

interface Row {
  name: string;
  position: string | null;
  lanes: Bar[][];
}

function buildLanes(bars: Bar[]): Bar[][] {
  const lanes: Bar[][] = [];
  bars
    .slice()
    .sort((a, b) => a.startMonth - b.startMonth)
    .forEach((bar) => {
      const lane = lanes.find((l) => l.every((b) => b.endMonth < bar.startMonth || b.startMonth > bar.endMonth));
      if (lane) lane.push(bar);
      else lanes.push([bar]);
    });
  return lanes.map((l) => l.sort((a, b) => a.startMonth - b.startMonth));
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
  const overlapsByRequest = useMemo(() => computeVacationOverlaps(requests), [requests]);

  const conflictsByRequest = useMemo(() => {
    const map = new Map<string, VacationConflict[]>();
    conflicts.forEach((c) => {
      if (c.resolvido) return;
      map.set(c.programacao_id, [...(map.get(c.programacao_id) ?? []), c]);
    });
    return map;
  }, [conflicts]);

  const rows = useMemo<Row[]>(() => {
    const byEmployee = new Map<string, { name: string; position: string | null; bars: Bar[] }>();
    requests
      .filter((r) => !["rejected", "cancelled"].includes(r.status))
      .forEach((r) => {
        const start = parseISO(r.start_date);
        const end = parseISO(r.end_date);
        if (end.getFullYear() < year || start.getFullYear() > year) return;
        const startMonth = start.getFullYear() < year ? 0 : start.getMonth();
        const endMonth = end.getFullYear() > year ? 11 : end.getMonth();
        const key = r.employee_id;
        if (!byEmployee.has(key)) {
          byEmployee.set(key, {
            name: r.employee?.full_name ?? "—",
            position: r.employee?.position ?? null,
            bars: [],
          });
        }
        byEmployee.get(key)!.bars.push({
          request: r,
          startMonth,
          endMonth,
          continuesBefore: start.getFullYear() < year,
          continuesAfter: end.getFullYear() > year,
          conflicts: conflictsByRequest.get(r.id) ?? [],
        });
      });
    return [...byEmployee.values()]
      .map((e) => ({ name: e.name, position: e.position, lanes: buildLanes(e.bars) }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [requests, year, conflictsByRequest]);

  /** conflito de caixa: colaboradores que INICIAM férias em cada mês */
  const monthTotals = useMemo(() => monthStartCounts(requests, year), [requests, year]);

  const limit = rules?.max_ferias_por_mes ?? 3;

  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Nenhuma programação de férias registrada para {year}.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[820px] border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-background px-2 py-2 text-left font-medium">Colaborador</th>
            {MONTHS.map((m, i) => (
              <th key={m} className="px-1 py-2 text-center font-medium">
                <div>{m}</div>
                <div
                  title={`${monthTotals[i]} colaborador(es) iniciando férias em ${m} (limite de caixa: ${limit})`}
                  className={cn(
                    "text-xs font-normal",
                    monthTotals[i] >= limit ? "text-destructive" : "text-muted-foreground"
                  )}
                >
                  {monthTotals[i]} início{monthTotals[i] === 1 ? "" : "s"}
                </div>
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) =>
            row.lanes.map((lane, laneIndex) => {
              const cells: JSX.Element[] = [];
              let m = 0;
              while (m < 12) {
                const bar = lane.find((b) => b.startMonth === m);
                if (bar) {
                  const span = bar.endMonth - bar.startMonth + 1;
                  const overlaps = overlapsByRequest.get(bar.request.id) ?? [];
                  const startsInMonth = monthTotals[parseISO(bar.request.start_date).getMonth()];
                  const cashConflict =
                    parseISO(bar.request.start_date).getFullYear() === year && startsInMonth >= limit;
                  const sectorConflict = overlaps.some((o) => o.sameDepartment);
                  const conflicted = bar.conflicts.length > 0 || cashConflict || sectorConflict;
                  cells.push(
                    <td key={`b-${m}`} colSpan={span} className="px-1 py-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <button
                            type="button"
                            className={cn(
                              "flex h-6 w-full items-center justify-center gap-1 text-xs font-medium text-primary-foreground",
                              conflicted ? "bg-destructive" : "bg-primary",
                              bar.continuesBefore ? "rounded-l-none" : "rounded-l",
                              bar.continuesAfter ? "rounded-r-none" : "rounded-r"
                            )}
                          >
                            {bar.continuesBefore && "«"}
                            {bar.request.requested_days}d
                            {bar.continuesAfter && "»"}
                          </button>
                        </PopoverTrigger>
                        <PopoverContent align="center" className="w-96 space-y-2">
                          <div>
                            <p className="text-sm font-medium">{row.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {format(parseISO(bar.request.start_date), "dd 'de' MMMM 'de' yyyy", {
                                locale: ptBR,
                              })}{" "}
                              →{" "}
                              {format(parseISO(bar.request.end_date), "dd 'de' MMMM 'de' yyyy", {
                                locale: ptBR,
                              })}{" "}
                              · {bar.request.requested_days} dias
                              {bar.request.sell_days > 0 && ` + ${bar.request.sell_days}d abono`}
                            </p>
                          </div>
                          {bar.conflicts.length > 0 && (
                            <div className="space-y-1">
                              {bar.conflicts.map((c) => (
                                <div key={c.id}>
                                  <p className="text-xs font-medium text-destructive">
                                    {conflictTypeLabel[c.tipo_conflito]}
                                  </p>
                                  <p className="text-xs text-muted-foreground">{c.descricao}</p>
                                </div>
                              ))}
                            </div>
                          )}
                          <OverlapList overlaps={overlaps} />
                        </PopoverContent>
                      </Popover>
                    </td>
                  );
                  m += span;
                } else {
                  const saturated = monthTotals[m] > limit;
                  cells.push(
                    <td key={`e-${m}`} className="px-1 py-2">
                      <div className={cn("h-6 rounded", saturated ? "bg-destructive/5" : "bg-muted/40")} />
                    </td>
                  );
                  m += 1;
                }
              }
              return (
                <tr key={`${row.name}-${laneIndex}`} className="border-t">
                  <td className="sticky left-0 z-10 bg-background px-2 py-2">
                    {laneIndex === 0 ? (
                      <>
                        <div className="font-medium">{row.name}</div>
                        {row.position && (
                          <div className="text-xs text-muted-foreground">{row.position}</div>
                        )}
                      </>
                    ) : (
                      <span className="text-xs text-muted-foreground">↳ outra parcela</span>
                    )}
                  </td>
                  {cells}
                </tr>
              );
            })
          )}
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
  );
}
