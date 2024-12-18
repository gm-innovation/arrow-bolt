import { format, addHours, startOfDay } from "date-fns";
import { ptBR } from "date-fns/locale";

interface DayViewProps {
  date: Date;
  events: Array<{
    id: string;
    title: string;
    start: Date;
    end: Date;
  }>;
}

export const DayView = ({ date, events }: DayViewProps) => {
  const hours = Array.from({ length: 14 }, (_, i) => addHours(startOfDay(date), i + 7));

  return (
    <div className="flex flex-col h-[calc(100vh-200px)] overflow-y-auto">
      <div className="sticky top-0 bg-white z-10 flex border-b">
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
            <div key={hour.toISOString()} className="h-20 border-b text-sm px-2 py-1">
              {format(hour, "HH:mm")}
            </div>
          ))}
        </div>
        
        <div className="flex-1 relative">
          {hours.map((hour) => (
            <div key={hour.toISOString()} className="h-20 border-b border-gray-100" />
          ))}
          
          {events.map((event) => (
            <div
              key={event.id}
              className="absolute left-0 right-0 mx-2 px-2 py-1 bg-blue-100 border border-blue-200 rounded"
              style={{
                top: `${getEventTopPosition(event.start)}px`,
                height: `${getEventHeight(event.start, event.end)}px`,
              }}
            >
              <div className="font-medium text-sm">{event.title}</div>
              <div className="text-xs text-gray-600">
                {format(event.start, "HH:mm")} - {format(event.end, "HH:mm")}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

const getEventTopPosition = (start: Date) => {
  const hour = start.getHours();
  const minutes = start.getMinutes();
  return (hour - 7) * 80 + (minutes / 60) * 80;
};

const getEventHeight = (start: Date, end: Date) => {
  const durationInHours = (end.getTime() - start.getTime()) / (1000 * 60 * 60);
  return durationInHours * 80;
};