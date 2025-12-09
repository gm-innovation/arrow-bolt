import { format, isSameDay, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ServiceOrderListItem } from "./ServiceOrderListItem";
import type { CalendarServiceOrder } from "./ServiceCalendar";
import type { CalendarAbsence, CalendarOnCall } from "@/hooks/useCalendarAbsences";
import { Palmtree, CalendarOff, Stethoscope, GraduationCap, Phone } from "lucide-react";
import { cn } from "@/lib/utils";

interface DayViewProps {
  date: Date;
  orders: CalendarServiceOrder[];
  absences?: CalendarAbsence[];
  onCalls?: CalendarOnCall[];
  onEventClick?: (orderId: string) => void;
}

const absenceConfig: Record<string, { label: string; bg: string; icon: typeof Palmtree }> = {
  vacation: { label: "Férias", bg: "bg-blue-100 border-blue-300 text-blue-800", icon: Palmtree },
  day_off: { label: "Folga", bg: "bg-green-100 border-green-300 text-green-800", icon: CalendarOff },
  medical_exam: { label: "Exame Médico", bg: "bg-red-100 border-red-300 text-red-800", icon: Stethoscope },
  sick_leave: { label: "Atestado", bg: "bg-red-100 border-red-300 text-red-800", icon: Stethoscope },
  training: { label: "Treinamento", bg: "bg-purple-100 border-purple-300 text-purple-800", icon: GraduationCap },
};

export const DayView = ({ date, orders, absences = [], onCalls = [], onEventClick }: DayViewProps) => {
  const dayOrders = orders.filter(order => isSameDay(order.scheduled_date, date));
  
  const dayAbsences = absences.filter((absence) => {
    const start = parseISO(absence.start_date);
    const end = parseISO(absence.end_date);
    return isWithinInterval(date, { start, end });
  });

  const dayOnCalls = onCalls.filter((oc) => isSameDay(parseISO(oc.on_call_date), date));

  const ordersByHour = dayOrders.reduce((acc, order) => {
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

      {/* Absences and On-Call Summary */}
      {(dayAbsences.length > 0 || dayOnCalls.length > 0) && (
        <div className="sticky top-[70px] bg-muted/50 z-10 px-4 py-2 border-b flex flex-wrap gap-2">
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
