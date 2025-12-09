import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { ServiceOrderHoverCard } from "./ServiceOrderHoverCard";
import type { CalendarServiceOrder } from "./ServiceCalendar";
import type { CalendarAbsence, CalendarOnCall } from "@/hooks/useCalendarAbsences";
import { cn } from "@/lib/utils";
import { Palmtree, CalendarOff, Stethoscope, GraduationCap, Phone } from "lucide-react";

interface MonthViewProps {
  date: Date;
  orders: CalendarServiceOrder[];
  absences?: CalendarAbsence[];
  onCalls?: CalendarOnCall[];
  isExpanded?: boolean;
  onEventClick?: (orderId: string) => void;
}

const absenceConfig: Record<string, { label: string; bg: string; icon: typeof Palmtree }> = {
  vacation: { label: "Férias", bg: "bg-blue-50 border-l-blue-500", icon: Palmtree },
  day_off: { label: "Folga", bg: "bg-green-50 border-l-green-500", icon: CalendarOff },
  medical_exam: { label: "Exame Médico", bg: "bg-red-50 border-l-red-500", icon: Stethoscope },
  sick_leave: { label: "Atestado", bg: "bg-red-50 border-l-red-500", icon: Stethoscope },
  training: { label: "Treinamento", bg: "bg-purple-50 border-l-purple-500", icon: GraduationCap },
};

export const MonthView = ({ date, orders, absences = [], onCalls = [], isExpanded = false, onEventClick }: MonthViewProps) => {
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
    return orders.filter((order) => isSameDay(order.scheduled_date, day));
  };

  const getAbsencesForDay = (day: Date) => {
    return absences.filter((absence) => {
      const start = parseISO(absence.start_date);
      const end = parseISO(absence.end_date);
      return isWithinInterval(day, { start, end });
    });
  };

  const getOnCallsForDay = (day: Date) => {
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
          const dayAbsences = day ? getAbsencesForDay(day) : [];
          const dayOnCalls = day ? getOnCallsForDay(day) : [];

          return (
            <div
              key={`${weekIndex}-${dayIndex}`}
              className={cn(
                "border-b border-r last:border-r-0 p-2 min-h-[80px] relative",
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
                      {dayOrders.map((order) => {
                        const allTechs = [
                          order.lead_technician,
                          ...(order.auxiliary_technicians || []),
                        ].filter(Boolean).map(formatShortName).join(", ");

                        return (
                          <HoverCard key={order.id} openDelay={150} closeDelay={100}>
                            <HoverCardTrigger asChild>
                              <div
                                className={cn(
                                  "px-1.5 py-0.5 rounded border-l-2 hover:shadow cursor-pointer transition-all text-[10px]",
                                  order.status === "pending" &&
                                    "border-l-yellow-500 bg-yellow-100/90 dark:bg-yellow-900/40",
                                  order.status === "in_progress" &&
                                    "border-l-blue-500 bg-blue-100/90 dark:bg-blue-900/40",
                                  order.status === "completed" &&
                                    "border-l-green-500 bg-green-100/90 dark:bg-green-900/40",
                                  order.status === "cancelled" && "border-l-red-500 bg-red-100/90 dark:bg-red-900/40",
                                  order.status === "waiting" && "border-l-gray-500 bg-gray-100/90 dark:bg-gray-900/40",
                                )}
                                onClick={() => onEventClick?.(order.id)}
                              >
                                <div className="font-semibold text-foreground leading-tight truncate">
                                  {order.scheduled_time} - {order.vessel_name}
                                </div>
                                {allTechs && (
                                  <div className="font-medium text-foreground/70 leading-tight truncate">
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
                        const config = absenceConfig[absence.absence_type] || absenceConfig.day_off;
                        const Icon = config.icon;
                        return (
                          <div
                            key={`${absence.id}-${day.toISOString()}`}
                            className={cn(
                              "px-1.5 py-0.5 rounded border-l-2 text-[10px] flex items-center gap-1",
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
                    </div>
                  )}

                  {/* On-Calls */}
                  {dayOnCalls.length > 0 && (
                    <div className="space-y-0.5">
                      {dayOnCalls.map((oc) => (
                        <div
                          key={oc.id}
                          className="px-1.5 py-0.5 rounded border-l-2 border-l-amber-500 bg-amber-50 text-[10px] flex items-center gap-1"
                        >
                          <Phone className="h-3 w-3 flex-shrink-0 text-amber-600" />
                          <span className="font-medium truncate text-amber-800">
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
