import { useState } from "react";
import { CalendarHeader } from "./CalendarHeader";
import { DayView } from "./DayView";
import { WeekView } from "./WeekView";
import { MonthView } from "./MonthView";
import { useToast } from "@/hooks/use-toast";

// Mock data - replace with real data from your backend
const mockEvents = [
  {
    id: "1",
    title: "Manutenção Preventiva - Navio Alpha",
    start: new Date(2024, 11, 18, 13, 0), // December 18, 2024, 13:00
    end: new Date(2024, 11, 18, 15, 0),   // December 18, 2024, 15:00
  },
  {
    id: "2",
    title: "Inspeção - Navio Beta",
    start: new Date(2024, 11, 19, 10, 0),
    end: new Date(2024, 11, 19, 11, 30),
  },
];

export const ServiceCalendar = () => {
  const [currentDate, setCurrentDate] = useState(new Date());
  const [view, setView] = useState<"day" | "week" | "month">("week");
  const { toast } = useToast();

  const handleEventClick = (eventId: string) => {
    const event = mockEvents.find(e => e.id === eventId);
    if (event) {
      toast({
        title: "Detalhes do Serviço",
        description: `${event.title} - ${event.start.toLocaleString()}`,
      });
    }
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow">
      <CalendarHeader
        currentDate={currentDate}
        view={view}
        onViewChange={setView}
        onDateChange={setCurrentDate}
      />
      
      {view === "day" && (
        <DayView date={currentDate} events={mockEvents} onEventClick={handleEventClick} />
      )}
      {view === "week" && (
        <WeekView date={currentDate} events={mockEvents} onEventClick={handleEventClick} />
      )}
      {view === "month" && (
        <MonthView date={currentDate} events={mockEvents} onEventClick={handleEventClick} />
      )}
    </div>
  );
};