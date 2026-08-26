import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { ServiceOrderHoverCard } from "./ServiceOrderHoverCard";
import type { CalendarServiceOrder } from "./ServiceCalendar";
import type { CalendarAbsence, CalendarOnCall } from "@/hooks/useCalendarAbsences";
import { cn } from "@/lib/utils";
import { Phone } from "lucide-react";

import {
  absenceCategory,
  categoryStyles,
  classifyEvent,
  isCategoryActive,
  type CalendarCategory,
} from "./eventStyles";

interface MonthViewProps {
  date: Date;
  orders: CalendarServiceOrder[];
  absences?: CalendarAbsence[];
  onCalls?: CalendarOnCall[];
  isExpanded?: boolean;
  activeCategories?: CalendarCategory[];
  onEventClick?: (orderId: string) => void;
  onDayOverflowClick?: (day: Date) => void;
}

export const MonthView = ({ date, orders, absences = [], onCalls = [], isExpanded = false, activeCategories, onEventClick, onDayOverflowClick }: MonthViewProps) => {

  const MAX_VISIBLE_ORDERS = isExpanded ? 10 : 3;

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
          const dayOrders = day ? getOrdersForDay(day) : [];
          const dayAbsencesAll = day ? getAbsencesForDay(day) : [];
          const dayOnCallsAll = day ? getOnCallsForDay(day) : [];
          // Um único orçamento para OS + Auvo + ausências + sobreaviso: o "+N" cobre tudo
          const totalEvents = dayOrders.length + dayAbsencesAll.length + dayOnCallsAll.length;
          const visibleOrders = dayOrders.slice(0, MAX_VISIBLE_ORDERS);
          const absencesBudget = Math.max(0, MAX_VISIBLE_ORDERS - visibleOrders.length);
          const dayAbsences = dayAbsencesAll.slice(0, absencesBudget);
          const onCallsBudget = Math.max(0, absencesBudget - dayAbsences.length);
          const dayOnCalls = dayOnCallsAll.slice(0, onCallsBudget);
          const remainingCount =
            totalEvents - visibleOrders.length - dayAbsences.length - dayOnCalls.length;


          return (
            <div
              key={`${weekIndex}-${dayIndex}`}
              className={cn(
                "border-b border-r last:border-r-0 p-2 min-h-[80px] relative overflow-hidden",
                day && isSameMonth(day, date) ? "bg-background" : "bg-muted/50",
              )}
            >
              {day && (
                <>
                  <div className="text-sm font-normal mb-1 text-foreground/60">
                    {format(day, "d", { locale: ptBR })}
                  </div>

                  {/* Service Orders */}
                  {dayOrders.length > 0 && (
                    <div className="space-y-0.5 mb-1">
                      {visibleOrders.map((order) => {

                        const localTechs = [
                          order.lead_technician,
                          ...(order.auxiliary_technicians || []),
                          ...(order.lead_technician ? [] : order.technician_names || []),
                        ].filter(Boolean).map(formatShortName).join(", ");
                        const auvoTechs = order.auvo_team_name || order.auvo_technician_names?.map(formatShortName).join(", ");
                        const allTechs = localTechs || auvoTechs;
                        const category = classifyEvent(order);
                        const style = categoryStyles[category];
                        const CategoryIcon = style.icon;

                        return (
                          <HoverCard key={order.id} openDelay={150} closeDelay={100}>
                            <HoverCardTrigger asChild>
                              <div
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
                                  <div className="font-medium opacity-75 leading-tight truncate">
                                    {allTechs}
                                  </div>
                                )}
                              </div>
                            </HoverCardTrigger>

                            <HoverCardContent
                              side="right"
                              align="start"
                              className="w-auto max-w-md"
                              sideOffset={10}
                              collisionPadding={20}
                              avoidCollisions={true}
                            >
                              <ServiceOrderHoverCard order={order} />
                            </HoverCardContent>
                          </HoverCard>
                        );
                      })}
                    </div>
                  )}



                  {/* Absences */}
                  {dayAbsences.length > 0 && (
                    <div className="space-y-0.5 mb-1">
                      {dayAbsences.map((absence) => {
                        const style = categoryStyles[absenceCategory(absence.absence_type)];
                        const Icon = style.icon;
                        return (
                          <div
                            key={`${absence.id}-${day.toISOString()}`}
                            className={cn(
                              "px-1.5 py-0.5 rounded border-l-2 text-[10px] flex items-center gap-1",
                              style.item
                            )}
                          >
                            <Icon className="h-3 w-3 flex-shrink-0" />
                            <span className="font-medium truncate">
                              {formatShortName(absence.technician_name)}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* On-Calls */}
                  {dayOnCalls.length > 0 && (
                    <div className="space-y-0.5">
                      {dayOnCalls.map((oc) => (
                        <div
                          key={oc.id}
                          className={cn(
                            "px-1.5 py-0.5 rounded border-l-2 text-[10px] flex items-center gap-1",
                            categoryStyles.on_call.item
                          )}
                        >
                          <Phone className="h-3 w-3 flex-shrink-0" />
                          <span className="font-medium truncate">
                            {formatShortName(oc.technician_name)}
                          </span>
                        </div>
                      ))}
                    </div>
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
