import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface MonthViewProps {
  date: Date;
  events: Array<{
    id: string;
    title: string;
    start: Date;
    end: Date;
  }>;
}

export const MonthView = ({ date, events }: MonthViewProps) => {
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

  return (
    <div className="flex-1 grid grid-cols-7 grid-rows-6 h-[calc(100vh-200px)]">
      {["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"].map((weekDay) => (
        <div key={weekDay} className="p-2 text-sm font-medium text-center border-b">
          {weekDay}
        </div>
      ))}
      
      {weeks.map((week, weekIndex) => (
        week.map((day, dayIndex) => (
          <div
            key={`${weekIndex}-${dayIndex}`}
            className={`border-b border-r p-2 ${
              day && isSameMonth(day, date) ? "bg-white" : "bg-gray-50"
            }`}
          >
            {day && (
              <>
                <div className="text-sm font-medium mb-1">
                  {format(day, "d", { locale: ptBR })}
                </div>
                <div className="space-y-1">
                  {events
                    .filter((event) => isSameDay(event.start, day))
                    .map((event) => (
                      <div
                        key={event.id}
                        className="text-xs p-1 bg-blue-100 border border-blue-200 rounded truncate"
                      >
                        {format(event.start, "HH:mm")} - {event.title}
                      </div>
                    ))}
                </div>
              </>
            )}
          </div>
        ))
      ))}
    </div>
  );
};