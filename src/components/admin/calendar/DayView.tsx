import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { ServiceOrderListItem } from "./ServiceOrderListItem";
import type { CalendarServiceOrder } from "./ServiceCalendar";

interface DayViewProps {
  date: Date;
  orders: CalendarServiceOrder[];
  onEventClick?: (orderId: string) => void;
}

export const DayView = ({ date, orders, onEventClick }: DayViewProps) => {
  const dayOrders = orders.filter(order => isSameDay(order.scheduled_date, date));
  
  const ordersByHour = dayOrders.reduce((acc, order) => {
    const hour = order.scheduled_time.split(":")[0];
    if (!acc[hour]) acc[hour] = [];
    acc[hour].push(order);
    return acc;
  }, {} as Record<string, CalendarServiceOrder[]>);

  const hours = Array.from({ length: 24 }, (_, i) => i.toString().padStart(2, "0"));

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] overflow-y-auto relative">
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
