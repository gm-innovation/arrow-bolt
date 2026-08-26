import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { format, startOfWeek, addDays, isSameDay, isWithinInterval, parseISO } from "date-fns";

import { ptBR } from "date-fns/locale";
import { ServiceOrderListItem } from "./ServiceOrderListItem";
import type { CalendarServiceOrder } from "./ServiceCalendar";
import type { CalendarAbsence, CalendarOnCall } from "@/hooks/useCalendarAbsences";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import {
  absenceCategory,
  categoryStyles,
  classifyEvent,
  isCategoryActive,
  type CalendarCategory,
} from "./eventStyles";

interface WeekViewProps {
  date: Date;
  orders: CalendarServiceOrder[];
  absences?: CalendarAbsence[];
  onCalls?: CalendarOnCall[];
  activeCategories?: CalendarCategory[];
  onEventClick?: (orderId: string) => void;
  onScheduleEntryClick?: (entry: ScheduleEntry) => void;
  onDayOverflowClick?: (day: Date) => void;
}


type DayEntry =
  | { kind: "order"; key: string; order: CalendarServiceOrder }
  | { kind: "absence"; key: string; absence: CalendarAbsence }
  | { kind: "on_call"; key: string; onCall: CalendarOnCall };

const FALLBACK_ITEM_HEIGHT = 48; // cartão de duas linhas + gap

export const WeekView = ({ date, orders, absences = [], onCalls = [], activeCategories, onEventClick, onDayOverflowClick }: WeekViewProps) => {
  const weekStart = startOfWeek(date, { weekStartsOn: 0 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getOrdersForDay = (day: Date) => {
    return orders
      .filter((order) => isSameDay(order.scheduled_date, day))
      .filter((order) => isCategoryActive(classifyEvent(order), activeCategories))
      .sort((a, b) => {
        const aTime = a.scheduled_time || "";
        const bTime = b.scheduled_time || "";
        if (aTime && bTime) return aTime.localeCompare(bTime);
        if (aTime) return -1;
        if (bTime) return 1;
        return 0;
      });
  };

  const getAbsencesForDay = (day: Date) => {
    return absences.filter((absence) => {
      const start = parseISO(absence.start_date);
      const end = parseISO(absence.end_date);
      return (
        isWithinInterval(day, { start, end }) &&
        isCategoryActive(absenceCategory(absence.absence_type), activeCategories)
      );
    });
  };

  const getOnCallsForDay = (day: Date) => {
    if (!isCategoryActive("on_call", activeCategories)) return [];
    return onCalls.filter((oc) => isSameDay(parseISO(oc.on_call_date), day));
  };

  // Todos os eventos do dia (OS + Auvo + ausências + sobreaviso) num único orçamento
  const getEntriesForDay = (day: Date): DayEntry[] => [
    ...getOrdersForDay(day).map((order): DayEntry => ({ kind: "order", key: order.id, order })),
    ...getAbsencesForDay(day).map((absence): DayEntry => ({
      kind: "absence",
      key: `absence-${absence.id}-${day.toISOString()}`,
      absence,
    })),
    ...getOnCallsForDay(day).map((onCall): DayEntry => ({ kind: "on_call", key: `oncall-${onCall.id}`, onCall })),
  ];

  const formatShortName = (fullName: string) => {
    const parts = fullName.trim().split(" ");
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1]}`;
  };

  // Quantidade visível calculada pela altura REAL do cartão (o antigo valor fixo de
  // 30px subestimava o cartão de duas linhas e o excedente ficava cortado sem "+N")
  const gridRef = useRef<HTMLDivElement>(null);
  const probeRef = useRef<HTMLDivElement | null>(null);
  const [itemHeight, setItemHeight] = useState(FALLBACK_ITEM_HEIGHT);
  const [maxVisible, setMaxVisible] = useState(6);

  const recalc = useCallback(() => {
    const el = gridRef.current;
    if (!el) return;
    const available = el.clientHeight - 16 /* padding */ - 30 /* linha do "+N" */;
    setMaxVisible(Math.max(1, Math.floor(available / Math.max(24, itemHeight))));
  }, [itemHeight]);

  useLayoutEffect(() => {
    const probe = probeRef.current;
    if (!probe) return;
    const measured = probe.getBoundingClientRect().height;
    if (measured > 0) {
      const withGap = Math.ceil(measured) + 4;
      setItemHeight((prev) => (Math.abs(prev - withGap) > 1 ? withGap : prev));
    }
  });

  useEffect(() => {
    recalc();
    const el = gridRef.current;
    if (!el) return;
    const observer = new ResizeObserver(recalc);
    observer.observe(el);
    return () => observer.disconnect();
  }, [recalc]);

  return (
    <div className="flex flex-col h-[calc(100vh-250px)] overflow-hidden">
      <div className="grid grid-cols-7 border-b bg-background sticky top-0 z-10">
        {days.map((day) => (
          <div key={day.toISOString()} className="p-2 text-center border-r last:border-r-0">
            <div className="text-xs text-muted-foreground">
              {format(day, "EEE", { locale: ptBR })}
            </div>
            <div className="text-lg font-semibold">
              {format(day, "d", { locale: ptBR })}
            </div>
          </div>
        ))}
      </div>
      
      <div ref={gridRef} className="grid grid-cols-7 flex-1 overflow-hidden relative">
        {days.map((day, dayIndex) => {
          const entries = getEntriesForDay(day);
          const visibleEntries = entries.slice(0, maxVisible);
          const remainingCount = entries.length - visibleEntries.length;

          return (
            <div
              key={day.toISOString()}
              className="border-r last:border-r-0 p-2 space-y-1 overflow-y-auto"
            >
              {visibleEntries.map((entry, entryIndex) => {
                const isProbe = dayIndex === 0 && entryIndex === 0;

                if (entry.kind === "order") {
                  return (
                    <div key={entry.key} ref={isProbe ? probeRef : undefined}>
                      <ServiceOrderListItem
                        order={entry.order}
                        onClick={() => onEventClick?.(entry.order.id)}
                      />
                    </div>
                  );
                }

                if (entry.kind === "absence") {
                  const style = categoryStyles[absenceCategory(entry.absence.absence_type)];
                  const Icon = style.icon;
                  return (
                    <div
                      key={entry.key}
                      className={cn(
                        "px-2 py-1 rounded border-l-2 text-xs flex items-center gap-1.5",
                        style.item
                      )}
                    >
                      <Icon className="h-3 w-3 flex-shrink-0" />
                      <span className="font-medium truncate">
                        {formatShortName(entry.absence.technician_name)}
                      </span>
                    </div>
                  );
                }

                const onCallStyle = categoryStyles.on_call;
                const OnCallIcon = onCallStyle.icon;
                return (
                  <div
                    key={entry.key}
                    className={cn("px-2 py-1 rounded border-l-2 text-xs flex items-center gap-1.5", onCallStyle.item)}
                  >
                    <OnCallIcon className="h-3 w-3 flex-shrink-0" />
                    <span className="font-medium truncate">
                      {formatShortName(entry.onCall.technician_name)}
                    </span>
                  </div>
                );
              })}

              {remainingCount > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-full text-xs font-semibold text-primary"
                  onClick={() => onDayOverflowClick?.(day)}
                >
                  +{remainingCount} atividades
                </Button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
