import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import { ServiceOrderHoverCard } from "./ServiceOrderHoverCard";
import type { CalendarServiceOrder } from "./ServiceCalendar";
import { cn } from "@/lib/utils";

interface MonthViewProps {
  date: Date;
  orders: CalendarServiceOrder[];
  isExpanded?: boolean;
  onEventClick?: (orderId: string) => void;
}

export const MonthView = ({ date, orders, isExpanded = false, onEventClick }: MonthViewProps) => {
  const monthStart = startOfMonth(date);
  const monthEnd = endOfMonth(date);
  const days = eachDayOfInterval({ start: monthStart, end: monthEnd });

  const weeks = [];
  let currentWeek = [];

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

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      pending: "bg-yellow-500",
      in_progress: "bg-blue-500",
      completed: "bg-green-500",
      cancelled: "bg-red-500",
      waiting: "bg-gray-500",
    };
    return colors[status] || "bg-gray-500";
  };

  const formatShortName = (fullName: string) => {
    const parts = fullName.trim().split(" ");
    if (parts.length === 1) return parts[0];
    return `${parts[0]} ${parts[parts.length - 1]}`;
  };

  return (
    <div
      className={cn(
        "flex-1 grid grid-cols-7 auto-rows-fr border relative",
        isExpanded ? "h-[calc(100vh-80px)]" : "h-[calc(100vh-100px)]",
      )}
    >
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

          return (
            <div
              key={`${weekIndex}-${dayIndex}`}
              className={cn(
                "border-b border-r last:border-r-0 p-2 min-h-[150px] relative",
                day && isSameMonth(day, date) ? "bg-background" : "bg-muted/50",
              )}
            >
              {day && (
                <>
                  <div className="text-sm font-normal mb-1 text-foreground/60">
                    {format(day, "d", { locale: ptBR })}
                  </div>

                  {dayOrders.length > 0 && (
                    <div className="space-y-1">
                      {dayOrders.map((order) => (
                        <HoverCard key={order.id} openDelay={150} closeDelay={100}>
                          <HoverCardTrigger asChild>
                            <div
                              className={cn(
                                "px-2 py-1 rounded border-l-2 hover:shadow cursor-pointer transition-all",
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
                              <div className="font-semibold text-foreground text-xs leading-tight">
                                {order.scheduled_time} - {order.vessel_name}
                              </div>
                              {order.lead_technician && (
                                <div className="text-[10px] font-medium text-foreground/80 leading-tight mt-0.5">
                                  {formatShortName(order.lead_technician)}
                                </div>
                              )}
                              {order.auxiliary_technicians && order.auxiliary_technicians.length > 0 && (
                                <div className="space-y-0 mt-0.5">
                                  {order.auxiliary_technicians.map((name, idx) => (
                                    <div key={idx} className="text-[10px] font-medium text-foreground/70 leading-tight">
                                      {formatShortName(name)}
                                    </div>
                                  ))}
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
