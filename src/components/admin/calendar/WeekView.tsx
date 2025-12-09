import { format, startOfWeek, addDays, isSameDay, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ServiceOrderListItem } from "./ServiceOrderListItem";
import type { CalendarServiceOrder } from "./ServiceCalendar";
import type { CalendarAbsence, CalendarOnCall } from "@/hooks/useCalendarAbsences";
import { Palmtree, CalendarOff, Stethoscope, GraduationCap, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

interface WeekViewProps {
  date: Date;
  orders: CalendarServiceOrder[];
  absences?: CalendarAbsence[];
  onCalls?: CalendarOnCall[];
  onEventClick?: (orderId: string) => void;
}

const absenceConfig: Record<string, { label: string; bg: string; icon: typeof Palmtree }> = {
  vacation: { label: "Férias", bg: "bg-blue-50 border-l-blue-500 text-blue-800", icon: Palmtree },
  day_off: { label: "Folga", bg: "bg-green-50 border-l-green-500 text-green-800", icon: CalendarOff },
  medical_exam: { label: "Exame", bg: "bg-red-50 border-l-red-500 text-red-800", icon: Stethoscope },
  sick_leave: { label: "Atestado", bg: "bg-red-50 border-l-red-500 text-red-800", icon: Stethoscope },
  training: { label: "Treinamento", bg: "bg-purple-50 border-l-purple-500 text-purple-800", icon: GraduationCap },
};

export const WeekView = ({ date, orders, absences = [], onCalls = [], onEventClick }: WeekViewProps) => {
  const weekStart = startOfWeek(date, { weekStartsOn: 0 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getOrdersForDay = (day: Date) => {
    return orders.filter(order => isSameDay(order.scheduled_date, day));
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

  const MAX_VISIBLE = 5;

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
      
      <div className="grid grid-cols-7 flex-1 overflow-y-auto relative">
        {days.map((day) => {
          const dayOrders = getOrdersForDay(day);
          const dayAbsences = getAbsencesForDay(day);
          const dayOnCalls = getOnCallsForDay(day);
          const visibleOrders = dayOrders.slice(0, MAX_VISIBLE);
          const remainingCount = dayOrders.length - MAX_VISIBLE;

          return (
            <div key={day.toISOString()} className="border-r last:border-r-0 p-2 space-y-1">
              {/* Service Orders */}
              {visibleOrders.map((order) => (
                <ServiceOrderListItem
                  key={order.id}
                  order={order}
                  onClick={() => onEventClick?.(order.id)}
                />
              ))}
              {remainingCount > 0 && (
                <div className="text-xs text-muted-foreground text-center py-1">
                  mais +{remainingCount}
                </div>
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
