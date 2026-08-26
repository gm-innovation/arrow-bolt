import { format, isSameDay, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ServiceOrderListItem } from "./ServiceOrderListItem";
import type { CalendarServiceOrder } from "./ServiceCalendar";
import type { CalendarAbsence, CalendarOnCall } from "@/hooks/useCalendarAbsences";
import { Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  absenceCategory,
  categoryStyles,
  classifyEvent,
  isCategoryActive,
  type CalendarCategory,
} from "./eventStyles";

interface DayViewProps {
  date: Date;
  orders: CalendarServiceOrder[];
  absences?: CalendarAbsence[];
  onCalls?: CalendarOnCall[];
  activeCategories?: CalendarCategory[];
  onEventClick?: (orderId: string) => void;
}

export const DayView = ({ date, orders, absences = [], onCalls = [], activeCategories, onEventClick }: DayViewProps) => {
  const dayOrders = orders
    .filter((order) => isSameDay(order.scheduled_date, date))
    .filter((order) => isCategoryActive(classifyEvent(order), activeCategories));

  const dayAbsences = absences.filter((absence) => {
    const start = parseISO(absence.start_date);
    const end = parseISO(absence.end_date);
    return (
      isWithinInterval(date, { start, end }) &&
      isCategoryActive(absenceCategory(absence.absence_type), activeCategories)
    );
  });

  const dayOnCalls = isCategoryActive("on_call", activeCategories)
    ? onCalls.filter((oc) => isSameDay(parseISO(oc.on_call_date), date))
    : [];


  const untimedOrders = dayOrders.filter((order) => !order.scheduled_time);
  const ordersByHour = dayOrders.filter((order) => order.scheduled_time).reduce((acc, order) => {
    const hour = order.scheduled_time.split(":")[0];
    if (!acc[hour]) acc[hour] = [];
    acc[hour].push(order);
    return acc;
  }, {} as Record<string, CalendarServiceOrder[]>);

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));

  const formatShortName = (fullName: string) => {
    const parts = fullName.trim().split(" ");
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1]}`;
  };

  return (
    <div className="flex flex-col h-[calc(100vh-250px)] overflow-y-auto relative">
      <div className="sticky top-0 bg-background z-10 flex border-b">
        <div className="w-20 flex-shrink-0" />
        <div className="flex-1 px-4 py-2">
          <div className="text-sm font-medium">
            {format(date, "EEEE", { locale: ptBR })}
          </div>
          <div className="text-2xl font-bold">
            {format(date, "d", { locale: ptBR })}
          </div>
        </div>
      </div>

      {/* Absences, On-Call and Unscheduled Orders Summary */}
      {(dayAbsences.length > 0 || dayOnCalls.length > 0 || untimedOrders.length > 0) && (
        <div className="sticky top-[70px] bg-muted/50 z-10 px-4 py-2 border-b flex flex-wrap gap-2">
          {untimedOrders.map((order) => (
            <div
              key={order.id}
              onClick={() => onEventClick?.(order.id)}
              className="px-3 py-1.5 rounded-md border text-sm flex items-center gap-2 cursor-pointer hover:shadow bg-blue-50 border-blue-200 text-blue-800"
            >
              <span className="font-medium">{order.order_number}</span>
              <span className="text-xs opacity-80">({order.vessel_name})</span>
            </div>
          ))}
          {dayAbsences.map((absence) => {
            const config = absenceConfig[absence.absence_type] || absenceConfig.day_off;
            const Icon = config.icon;
            return (
              <div
                key={absence.id}
                className={cn(
                  "px-3 py-1.5 rounded-md border text-sm flex items-center gap-2",
                  config.bg
                )}
              >
                <Icon className="h-4 w-4" />
                <span className="font-medium">{formatShortName(absence.technician_name)}</span>
                <span className="text-xs opacity-80">({config.label})</span>
              </div>
            );
          })}
          {dayOnCalls.map((oc) => (
            <div
              key={oc.id}
              className="px-3 py-1.5 rounded-md border bg-amber-100 border-amber-300 text-amber-800 text-sm flex items-center gap-2"
            >
              <Phone className="h-4 w-4" />
              <span className="font-medium">{formatShortName(oc.technician_name)}</span>
              <span className="text-xs opacity-80">(Sobreaviso)</span>
            </div>
          ))}
        </div>
      )}
      
      <div className="flex flex-1">
        <div className="w-20 flex-shrink-0 border-r">
          {hours.map((hour) => (
            <div key={hour} className="h-20 border-b text-sm px-2 py-1 text-muted-foreground">
              {hour}:00
            </div>
          ))}
        </div>
        
        <div className="flex-1">
          {hours.map((hour) => (
            <div key={hour} className="min-h-20 border-b px-2 py-1">
              {ordersByHour[hour] && (
                <div className="space-y-1">
                  {ordersByHour[hour].map((order) => (
                    <ServiceOrderListItem
                      key={order.id}
                      order={order}
                      onClick={() => onEventClick?.(order.id)}
                    />
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
