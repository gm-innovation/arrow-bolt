import { useState } from "react";
import { CalendarHeader } from "./CalendarHeader";
import { DayView } from "./DayView";
import { WeekView } from "./WeekView";
import { MonthView } from "./MonthView";
import { useToast } from "@/hooks/use-toast";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";

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
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
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

  const handleSearch = () => {
    toast({
      title: "Buscar Serviços",
      description: "Funcionalidade de busca será implementada em breve.",
    });
    setIsSearchOpen(false);
  };

  const handleHelp = () => {
    toast({
      title: "Ajuda",
      description: "O guia de ajuda será implementado em breve.",
    });
    setIsHelpOpen(false);
  };

  const handleSettings = () => {
    toast({
      title: "Configurações",
      description: "As configurações serão implementadas em breve.",
    });
    setIsSettingsOpen(false);
  };

  const handleMenu = () => {
    toast({
      title: "Menu",
      description: "Opções adicionais serão implementadas em breve.",
    });
    setIsMenuOpen(false);
  };

  return (
    <div className="flex flex-col h-full bg-white rounded-lg shadow">
      <CalendarHeader
        currentDate={currentDate}
        view={view}
        onViewChange={setView}
        onDateChange={setCurrentDate}
        onSearchClick={handleSearch}
        onHelpClick={handleHelp}
        onSettingsClick={handleSettings}
        onMenuClick={handleMenu}
      />
      
      {view === "day" && (
        <DayView date={currentDate} events={mockEvents} />
      )}
      {view === "week" && (
        <WeekView date={currentDate} events={mockEvents} onEventClick={handleEventClick} />
      )}
      {view === "month" && (
        <MonthView date={currentDate} events={mockEvents} />
      )}

      <Dialog open={isSearchOpen} onOpenChange={setIsSearchOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buscar Serviços</DialogTitle>
          </DialogHeader>
          <p>Funcionalidade em desenvolvimento</p>
        </DialogContent>
      </Dialog>

      <Dialog open={isHelpOpen} onOpenChange={setIsHelpOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Ajuda</DialogTitle>
          </DialogHeader>
          <p>Guia de ajuda em desenvolvimento</p>
        </DialogContent>
      </Dialog>

      <Dialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Configurações</DialogTitle>
          </DialogHeader>
          <p>Configurações em desenvolvimento</p>
        </DialogContent>
      </Dialog>

      <Dialog open={isMenuOpen} onOpenChange={setIsMenuOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Menu</DialogTitle>
          </DialogHeader>
          <p>Menu em desenvolvimento</p>
        </DialogContent>
      </Dialog>
    </div>
  );
};