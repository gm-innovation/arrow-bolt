import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { HoverCard, HoverCardContent, HoverCardTrigger } from "@/components/ui/hover-card";
import type { CalendarServiceOrder } from "./ServiceCalendar";
import { cn } from "@/lib/utils";

interface MonthViewProps {
  date: Date;
  orders: CalendarServiceOrder[];
  isExpanded?: boolean;
}

export const MonthView = ({ date, orders, isExpanded = false }: MonthViewProps) => {
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
    return orders.filter(order => isSameDay(order.scheduled_date, day));
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

  return (
    <div className={cn(
      "flex-1 grid grid-cols-7 grid-rows-6",
      isExpanded ? "h-[calc(100vh-250px)]" : "h-[calc(100vh-200px)]"
    )}>
      {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((weekDay) => (
        <div key={weekDay} className="p-2 text-sm font-medium text-center border-b bg-muted/50">
          {weekDay}
        </div>
      ))}
      
      {weeks.map((week, weekIndex) => (
        week.map((day, dayIndex) => {
          const dayOrders = day ? getOrdersForDay(day) : [];
          
          return (
            <div
              key={`${weekIndex}-${dayIndex}`}
              className={cn(
                "border-b border-r p-2 overflow-y-auto",
                day && isSameMonth(day, date) ? "bg-background" : "bg-muted/30",
                isExpanded ? "min-h-[120px]" : "min-h-[80px]"
              )}
            >
              {day && (
                <>
                  <div className="text-sm font-medium mb-2 sticky top-0 bg-background/95 pb-1">
                    {format(day, "d", { locale: ptBR })}
                  </div>
                  
                  {dayOrders.length > 0 && (
                    isExpanded ? (
                      <div className="space-y-1">
                        {dayOrders.map((order) => (
                          <div 
                            key={order.id} 
                            className={cn(
                              "text-xs p-1.5 rounded border-l-2 hover:bg-muted/50 cursor-pointer transition-colors",
                              order.status === "pending" && "border-l-yellow-500 bg-yellow-50/50 dark:bg-yellow-950/20",
                              order.status === "in_progress" && "border-l-blue-500 bg-blue-50/50 dark:bg-blue-950/20",
                              order.status === "completed" && "border-l-green-500 bg-green-50/50 dark:bg-green-950/20",
                              order.status === "cancelled" && "border-l-red-500 bg-red-50/50 dark:bg-red-950/20",
                              order.status === "waiting" && "border-l-gray-500 bg-gray-50/50 dark:bg-gray-950/20"
                            )}
                          >
                            <div className="font-medium text-foreground">
                              {order.scheduled_time}
                            </div>
                            <div className="text-muted-foreground truncate">
                              {order.vessel_name}
                            </div>
                            {order.technician_names && order.technician_names.length > 0 && (
                              <div className="text-muted-foreground/80 truncate text-[10px]">
                                {order.technician_names[0]}
                              </div>
                            )}
                          </div>
                        ))}
                      </div>
                    ) : (
                      <HoverCard openDelay={150} closeDelay={100}>
                        <HoverCardTrigger asChild>
                          <div className="flex gap-1 flex-wrap cursor-pointer">
                            {dayOrders.slice(0, 3).map((order) => (
                              <div
                                key={order.id}
                                className={cn("w-2 h-2 rounded-full", getStatusColor(order.status))}
                                title={order.vessel_name}
                              />
                            ))}
                            {dayOrders.length > 3 && (
                              <span className="text-xs text-muted-foreground">
                                +{dayOrders.length - 3}
                              </span>
                            )}
                          </div>
                        </HoverCardTrigger>
                        <HoverCardContent side="right" align="start" className="w-64">
                          <div className="space-y-2">
                            <p className="font-semibold text-sm">
                              {format(day, "d 'de' MMMM", { locale: ptBR })}
                            </p>
                            <div className="space-y-1 max-h-48 overflow-y-auto">
                              {dayOrders.map((order) => (
                                <div key={order.id} className="text-xs space-y-0.5">
                                  <div className="flex items-center gap-2">
                                    <div className={cn("w-2 h-2 rounded-full", getStatusColor(order.status))} />
                                    <span className="font-medium">{order.scheduled_time}</span>
                                    <span className="text-muted-foreground truncate">
                                      {order.vessel_name}
                                    </span>
                                  </div>
                                </div>
                              ))}
                            </div>
                          </div>
                        </HoverCardContent>
                      </HoverCard>
                    )
                  )}
                </>
              )}
            </div>
          );
        })
      ))}
    </div>
  );
};