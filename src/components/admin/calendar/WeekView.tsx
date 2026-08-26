import { useEffect, useRef, useState } from "react";
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
  onDayOverflowClick?: (day: Date) => void;
}

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


  const formatShortName = (fullName: string) => {
    const parts = fullName.trim().split(" ");
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1]}`;
  };

  // Quantidade visível calculada pela altura real da coluna (nunca passa do fim da tela)
  const gridRef = useRef<HTMLDivElement>(null);
  const [maxVisible, setMaxVisible] = useState(10);

  useEffect(() => {
    const el = gridRef.current;
    if (!el) return;
    const ITEM_HEIGHT = 30; // item + gap
    const recalc = () => {
      const available = el.clientHeight - 16 /* padding */ - 28 /* linha do "+N" */;
      setMaxVisible(Math.max(1, Math.floor(available / ITEM_HEIGHT)));
    };
    recalc();
    const observer = new ResizeObserver(recalc);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

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
        {days.map((day) => {
          const dayOrders = getOrdersForDay(day);
          const dayAbsences = getAbsencesForDay(day);
          const dayOnCalls = getOnCallsForDay(day);
          // Ausências e sobreavisos ficam sempre visíveis; o "+N" cobre as OSs excedentes
          const ordersBudget = Math.max(1, maxVisible - dayAbsences.length - dayOnCalls.length);
          const visibleOrders = dayOrders.slice(0, ordersBudget);
          const remainingCount = dayOrders.length - visibleOrders.length;

          return (
            <div key={day.toISOString()} className="border-r last:border-r-0 p-2 space-y-1 overflow-hidden">

              {/* Service Orders */}
              {visibleOrders.map((order) => (
                <ServiceOrderListItem
                  key={order.id}
                  order={order}
                  onClick={() => onEventClick?.(order.id)}
                />
              ))}
              {remainingCount > 0 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 w-full text-xs text-muted-foreground"
                  onClick={() => onDayOverflowClick?.(day)}
                >
                  +{remainingCount} atividades
                </Button>
              )}

              {/* Absences */}
              {dayAbsences.map((absence) => {
                const config = absenceConfig[absence.absence_type] || absenceConfig.day_off;
                const Icon = config.icon;
                return (
                  <div
                    key={`${absence.id}-${day.toISOString()}`}
                    className={cn(
                      "px-2 py-1 rounded border-l-2 text-xs flex items-center gap-1.5",
                      config.bg
                    )}
                  >
                    <Icon className="h-3 w-3 flex-shrink-0" />
                    <span className="font-medium truncate">
                      {formatShortName(absence.technician_name)}
                    </span>
                  </div>
                );
              })}

              {/* On-Calls */}
              {dayOnCalls.map((oc) => (
                <div
                  key={oc.id}
                  className="px-2 py-1 rounded border-l-2 border-l-amber-500 bg-amber-50 text-xs flex items-center gap-1.5"
                >
                  <Phone className="h-3 w-3 flex-shrink-0 text-amber-600" />
                  <span className="font-medium truncate text-amber-800">
                    {formatShortName(oc.technician_name)}
                  </span>
                </div>
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
};
