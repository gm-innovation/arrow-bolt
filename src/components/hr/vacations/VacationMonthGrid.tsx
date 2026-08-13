import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO, getDaysInMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { supabase } from "@/integrations/supabase/client";
import { conflictTypeLabel, VacationConflict, VacationRequest, VacationRules } from "@/hooks/useVacations";
import { computeVacationOverlaps } from "@/lib/hr/vacationOverlaps";
import { OverlapList } from "./OverlapList";

function iso(y: number, m: number, d: number) {
  return `${y}-${String(m + 1).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

function useHolidays(companyId?: string | null, year?: number) {
  return useQuery({
    queryKey: ["company-holidays", companyId, year],
    enabled: !!companyId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("company_holidays")
        .select("holiday_date, name, is_recurring")
        .eq("company_id", companyId!);
      if (error) throw error;
      return data ?? [];
    },
  });
}

export function VacationMonthGrid({
  year,
  month,
  requests,
  conflicts,
  rules,
  companyId,
}: {
  year: number;
  month: number;
  requests: VacationRequest[];
  conflicts: VacationConflict[];
  rules: VacationRules | null;
  companyId?: string | null;
}) {
  const holidays = useHolidays(companyId, year);
  const daysInMonth = getDaysInMonth(new Date(year, month, 1));
  const days = useMemo(
    () => Array.from({ length: daysInMonth }, (_, i) => i + 1),
    [daysInMonth]
  );

  const overlapsByRequest = useMemo(() => computeVacationOverlaps(requests), [requests]);

  const conflictsByRequest = useMemo(() => {
    const map = new Map<string, VacationConflict[]>();
    conflicts.forEach((c) => {
      if (c.resolvido) return;
      map.set(c.programacao_id, [...(map.get(c.programacao_id) ?? []), c]);
    });
    return map;
  }, [conflicts]);

  const holidayByIso = useMemo(() => {
    const map = new Map<string, string>();
    (holidays.data ?? []).forEach((h: { holiday_date: string; name: string; is_recurring: boolean }) => {
      const d = parseISO(h.holiday_date);
      map.set(iso(year, d.getMonth(), d.getDate()), h.name);
      if (h.is_recurring) map.set(iso(year, d.getMonth(), d.getDate()), h.name);
    });
    return map;
  }, [holidays.data, year]);

  const rows = useMemo(() => {
    const monthStart = iso(year, month, 1);
    const monthEnd = iso(year, month, daysInMonth);
    const byEmployee = new Map<
      string,
      { name: string; position: string | null; items: VacationRequest[] }
    >();
    requests
      .filter((r) => !["rejected", "cancelled"].includes(r.status))
      .filter((r) => r.start_date <= monthEnd && r.end_date >= monthStart)
      .forEach((r) => {
        if (!byEmployee.has(r.employee_id)) {
          byEmployee.set(r.employee_id, {
            name: r.employee?.full_name ?? "—",
            position: r.employee?.position ?? null,
            items: [],
          });
        }
        byEmployee.get(r.employee_id)!.items.push(r);
      });
    return [...byEmployee.values()].sort((a, b) => a.name.localeCompare(b.name));
  }, [requests, year, month, daysInMonth]);

  const dayTotals = useMemo(
    () =>
      days.map((d) => {
        const key = iso(year, month, d);
        return rows.filter((row) => row.items.some((r) => r.start_date <= key && r.end_date >= key))
          .length;
      }),
    [days, rows, year, month]
  );

  const limit = rules?.max_tecnicos_simultaneos ?? rules?.max_ferias_por_mes ?? 3;

  if (rows.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-muted-foreground">
        Nenhuma programação de férias em{" "}
        {format(new Date(year, month, 1), "MMMM 'de' yyyy", { locale: ptBR })}.
      </p>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full min-w-[900px] border-separate border-spacing-0 text-sm">
        <thead>
          <tr>
            <th className="sticky left-0 z-10 bg-background px-2 py-2 text-left font-medium">
              Colaborador
            </th>
            {days.map((d, i) => {
              const key = iso(year, month, d);
              const dow = new Date(year, month, d).getDay();
              const weekend = dow === 0 || dow === 6;
              const holiday = holidayByIso.get(key);
              return (
                <th
                  key={d}
                  title={holiday ?? undefined}
                  className={cn(
                    "w-6 px-0 py-1 text-center text-xs font-medium",
                    (weekend || holiday) && "bg-muted/60"
                  )}
                >
                  <div>{d}</div>
                  <div
                    className={cn(
                      "font-normal",
                      dayTotals[i] > limit ? "text-destructive" : "text-muted-foreground"
                    )}
                  >
                    {dayTotals[i] || ""}
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name} className="border-t">
              <td className="sticky left-0 z-10 bg-background px-2 py-1">
                <div className="font-medium">{row.name}</div>
                {row.position && <div className="text-xs text-muted-foreground">{row.position}</div>}
              </td>
              {days.map((d) => {
                const key = iso(year, month, d);
                const dow = new Date(year, month, d).getDay();
                const weekend = dow === 0 || dow === 6;
                const holiday = holidayByIso.get(key);
                const req = row.items.find((r) => r.start_date <= key && r.end_date >= key);
                if (!req) {
                  return (
                    <td key={d} className="px-0 py-1">
                      <div className={cn("h-6", weekend || holiday ? "bg-muted/60" : "bg-muted/20")} />
                    </td>
                  );
                }
                const conflictsFor = conflictsByRequest.get(req.id) ?? [];
                const overlaps = overlapsByRequest.get(req.id) ?? [];
                const isStart = req.start_date === key;
                const isEnd = req.end_date === key;
                return (
                  <td key={d} className="px-0 py-1">
                    <Popover>
                      <PopoverTrigger asChild>
                        <button
                          type="button"
                          aria-label={`Férias de ${row.name} em ${d}`}
                          className={cn(
                            "h-6 w-full",
                            conflictsFor.length > 0 ? "bg-destructive" : "bg-primary",
                            isStart && "rounded-l",
                            isEnd && "rounded-r"
                          )}
                        />
                      </PopoverTrigger>
                      <PopoverContent align="center" className="w-96 space-y-2">
                        <div>
                          <p className="text-sm font-medium">{row.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {format(parseISO(req.start_date), "dd/MM/yyyy")} →{" "}
                            {format(parseISO(req.end_date), "dd/MM/yyyy")} · {req.requested_days} dias
                            {req.sell_days > 0 && ` + ${req.sell_days}d abono`}
                          </p>
                        </div>
                        {conflictsFor.map((c) => (
                          <div key={c.id}>
                            <p className="text-xs font-medium text-destructive">
                              {conflictTypeLabel[c.tipo_conflito]}
                            </p>
                            <p className="text-xs text-muted-foreground">{c.descricao}</p>
                          </div>
                        ))}
                        <OverlapList overlaps={overlaps} />
                      </PopoverContent>
                    </Popover>
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
        <span className="flex items-center gap-1">
          <span className="inline-block h-3 w-3 rounded bg-muted/60" /> Fim de semana / feriado
        </span>
        <Badge variant="outline">Limite simultâneo: {limit}</Badge>
      </div>
    </div>
  );
}
