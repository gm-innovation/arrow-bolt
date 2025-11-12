import { format, startOfWeek, addDays, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ServiceOrderListItem } from "./ServiceOrderListItem";
import type { CalendarServiceOrder } from "./ServiceCalendar";

interface WeekViewProps {
  date: Date;
  orders: CalendarServiceOrder[];
  onEventClick?: (orderId: string) => void;
}

export const WeekView = ({ date, orders, onEventClick }: WeekViewProps) => {
  const weekStart = startOfWeek(date, { weekStartsOn: 0 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));

  const getOrdersForDay = (day: Date) => {
    return orders.filter(order => isSameDay(order.scheduled_date, day));
  };

  const MAX_VISIBLE = 5;

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] overflow-hidden">
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
      
      <div className="grid grid-cols-7 flex-1 overflow-y-auto">
        {days.map((day) => {
          const dayOrders = getOrdersForDay(day);
          const visibleOrders = dayOrders.slice(0, MAX_VISIBLE);
          const remainingCount = dayOrders.length - MAX_VISIBLE;

          return (
            <div key={day.toISOString()} className="border-r last:border-r-0 p-2 space-y-1">
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
            </div>
          );
        })}
      </div>
    </div>
  );
};
