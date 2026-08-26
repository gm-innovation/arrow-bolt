import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { ServiceOrderHoverCard } from "./ServiceOrderHoverCard";
import type { CalendarServiceOrder } from "./ServiceCalendar";
import type { CalendarAbsence, CalendarOnCall } from "@/hooks/useCalendarAbsences";
import type { ScheduleEntry } from "./ScheduleEntryDetailsDialog";
import { cn } from "@/lib/utils";

import {
  absenceCategory,
  categoryStyles,
  classifyEvent,
  isCategoryActive,
  type CalendarCategory,
} from "./eventStyles";
import { buildScheduleRows } from "./groupScheduleRows";

interface MonthViewProps {
  date: Date;
  orders: CalendarServiceOrder[];
  absences?: CalendarAbsence[];
  onCalls?: CalendarOnCall[];
  isExpanded?: boolean;
  activeCategories?: CalendarCategory[];
  onEventClick?: (orderId: string) => void;
  onScheduleEntryClick?: (entry: ScheduleEntry) => void;
  onDayOverflowClick?: (day: Date) => void;
}

const FALLBACK_ITEM_HEIGHT = 32;

export const MonthView = ({
  date,
  orders,
  absences = [],
  onCalls = [],
  isExpanded = false,
  activeCategories,
  onEventClick,
  onScheduleEntryClick,
  onDayOverflowClick,
}: MonthViewProps) => {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const weeks = [];
  let currentWeek: (Date | null)[] = [];

  days.forEach((day) => {
    if (currentWeek.length === 0 && day.getDay() !== 0) {
      for (let i = 0; i < day.getDay(); i++) {
        currentWeek.push(null);
      }
    }
    currentWeek.push(day);
    if (currentWeek.length === 7) {
      weeks.push(currentWeek);
      currentWeek = [];
    }
  });

  if (currentWeek.length > 0) {
    while (currentWeek.length < 7) {
      currentWeek.push(null);
    }
    weeks.push(currentWeek);
  }

  const getOrdersForDay = (day: Date) => {
    return orders
      .filter((order) => isSameDay(order.scheduled_date, day))
      .filter((order) => isCategoryActive(classifyEvent(order), activeCategories));
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

  // Orçamento único do dia: cartões de serviço (OS/Auvo) + 1 linha por categoria de RH
  const getRowsForDay = (day: Date) =>
    buildScheduleRows(
      day.toISOString(),
      getOrdersForDay(day),
      getAbsencesForDay(day),
      getOnCallsForDay(day),
    );

  const formatShortName = (fullName: string) => {
    const parts = fullName.trim().split(" ");
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1]}`;
  };

  // Quantidade visível calculada pela altura REAL do item e do espaço útil da célula,
  // nunca por uma contagem fixa (que deixava itens fora da célula e sem "+N").
  const listRef = useRef<HTMLDivElement | null>(null);
  const probeRef = useRef<HTMLDivElement | null>(null);
  const [itemHeight, setItemHeight] = useState(FALLBACK_ITEM_HEIGHT);
  const [maxVisible, setMaxVisible] = useState(isExpanded ? 8 : 3);

  const cellHeight = isExpanded ? 260 : 148;

  const recalc = useCallback(() => {
    const el = listRef.current;
    if (!el) return;
    const available = el.clientHeight;
    if (available <= 0) return;
    setMaxVisible(Math.max(1, Math.floor(available / Math.max(20, itemHeight))));
  }, [itemHeight]);

  useLayoutEffect(() => {
    const probe = probeRef.current;
    if (!probe) return;
    const measured = probe.getBoundingClientRect().height;
    if (measured > 0) {
      const withGap = Math.ceil(measured) + 2;
      setItemHeight((prev) => (Math.abs(prev - withGap) > 1 ? withGap : prev));
    }
  });

  useEffect(() => {
    recalc();
    const el = listRef.current;
    if (!el) return;
    const observer = new ResizeObserver(recalc);
    observer.observe(el);
    return () => observer.disconnect();
  }, [recalc]);

  return (
    <div className="flex-1 grid grid-cols-7 auto-rows-auto border relative overflow-auto">

      {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((weekDay) => (
        <div
          key={weekDay}
          className="py-1 px-2 text-xs font-medium text-center border-b border-r last:border-r-0 bg-muted/50 text-muted-foreground"
        >
          {weekDay}
        </div>
      ))}

      {weeks.map((week, weekIndex) =>
        week.map((day, dayIndex) => {
          const rows = day ? getRowsForDay(day) : [];
          const visibleRows = rows.slice(0, maxVisible);
          const remainingCount = rows.length - visibleRows.length;
          const isFirstCell = weekIndex === 0 && dayIndex === 0;

          return (
            <div
              key={`${weekIndex}-${dayIndex}`}
              style={{ height: cellHeight }}
              className={cn(
                "border-b border-r last:border-r-0 p-2 relative flex flex-col overflow-hidden",
                day && isSameMonth(day, date) ? "bg-background" : "bg-muted/50",
              )}
            >
              {day && (
                <>
                  <div className="text-sm font-normal mb-1 text-foreground/60 shrink-0">
                    {format(day, "d", { locale: ptBR })}
                  </div>

                  <div
                    ref={isFirstCell ? listRef : undefined}
                    className="flex-1 min-h-0 space-y-0.5 overflow-y-auto"
                  >
                    {visibleRows.map((row, rowIndex) => {
                      const isProbe = isFirstCell && rowIndex === 0;

                      if (row.type === "order") {
                        const order = row.order;
                        const localTechs = [
                          order.lead_technician,
                          ...(order.auxiliary_technicians || []),
                          ...(order.lead_technician ? [] : order.technician_names || []),
                        ]
                          .filter(Boolean)
                          .map(formatShortName)
                          .join(", ");
                        const auvoTechs =
                          order.auvo_team_name || order.auvo_technician_names?.map(formatShortName).join(", ");
                        const allTechs = localTechs || auvoTechs;
                        const category = classifyEvent(order);
                        const style = categoryStyles[category];
                        const CategoryIcon = style.icon;

                        return (
                          <HoverCard key={row.key} openDelay={150} closeDelay={100}>
                            <HoverCardTrigger asChild>
                              <div
                                ref={isProbe ? probeRef : undefined}
                                className={cn(
                                  "px-1.5 py-0.5 rounded border-l-2 hover:shadow cursor-pointer transition-all text-[10px]",
                                  style.item,
                                )}
                                onClick={() => onEventClick?.(order.id)}
                              >
                                <div className="font-semibold leading-tight truncate flex items-center gap-1">
                                  <CategoryIcon className="h-2.5 w-2.5 flex-shrink-0" />
                                  <span className="truncate">
                                    {order.scheduled_time ? `${order.scheduled_time} · ` : ""}
                                    {category === "os" ? order.vessel_name : style.label}
                                  </span>
                                </div>
                                {allTechs && (
                                  <div className="font-medium opacity-75 leading-tight truncate">{allTechs}</div>
                                )}
                              </div>
                            </HoverCardTrigger>

                            <HoverCardContent
                              side="right"
                              align="start"
                              className="w-auto max-w-md z-[100]"
                              sideOffset={10}
                              collisionPadding={20}
                              avoidCollisions={true}
                            >
                              <ServiceOrderHoverCard order={order} />
                            </HoverCardContent>
                          </HoverCard>
                        );
                      }

                      const style = categoryStyles[row.category];
                      const Icon = style.icon;
                      const fullNames = row.people.map((p) => p.name);
                      const handleGroupClick = () => {
                        if (row.people.length === 1) {
                          const click = row.people[0].click;
                          if (click.type === "order") onEventClick?.(click.orderId);
                          else onScheduleEntryClick?.(click.entry);
                          return;
                        }
                        onDayOverflowClick?.(day);
                      };

                      return (
                        <div
                          key={row.key}
                          ref={isProbe ? probeRef : undefined}
                          role="button"
                          tabIndex={0}
                          title={`${style.label}: ${fullNames.join(", ")}`}
                          className={cn(
                            "px-1.5 py-0.5 rounded border-l-2 text-[10px] flex items-center gap-1 cursor-pointer hover:shadow transition-all",
                            style.item,
                          )}
                          onClick={handleGroupClick}
                        >
                          <Icon className="h-3 w-3 flex-shrink-0" />
                          <span className="font-semibold shrink-0">{style.label}</span>
                          <span className="truncate opacity-80">
                            {fullNames.map(formatShortName).join(", ")}
                          </span>
                        </div>
                      );
                    })}
                  </div>

                  {remainingCount > 0 && (
                    <button
                      type="button"
                      className="w-full text-[10px] font-semibold text-primary hover:underline text-left px-1.5 pt-1 shrink-0"
                      onClick={() => onDayOverflowClick?.(day)}
                    >
                      +{remainingCount} atividades
                    </button>
                  )}
                </>
              )}
            </div>
          );
        }),
      )}
    </div>
  );
};
