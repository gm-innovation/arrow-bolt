import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ChevronLeft, ChevronRight, Search, Settings, HelpCircle, Menu, CalendarIcon, Maximize2, Minimize2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

interface CalendarHeaderProps {
  currentDate: Date;
  view: "day" | "week" | "month";
  onViewChange: (view: "day" | "week" | "month") => void;
  onDateChange: (date: Date) => void;
  onSearchClick: () => void;
  onHelpClick: () => void;
  onSettingsClick: () => void;
  onMenuClick: () => void;
  isExpanded?: boolean;
  onToggleExpanded?: () => void;
}

export const CalendarHeader = ({
  currentDate,
  view,
  onViewChange,
  onDateChange,
  onSearchClick,
  onHelpClick,
  onSettingsClick,
  onMenuClick,
  isExpanded = false,
  onToggleExpanded,
}: CalendarHeaderProps) => {
  const goToToday = () => onDateChange(new Date());
  
  const goToPrevious = () => {
    const newDate = new Date(currentDate);
    switch (view) {
      case "day":
        newDate.setDate(currentDate.getDate() - 1);
        break;
      case "week":
        newDate.setDate(currentDate.getDate() - 7);
        break;
      case "month":
        newDate.setMonth(currentDate.getMonth() - 1);
        break;
    }
    onDateChange(newDate);
  };

  const goToNext = () => {
    const newDate = new Date(currentDate);
    switch (view) {
      case "day":
        newDate.setDate(currentDate.getDate() + 1);
        break;
      case "week":
        newDate.setDate(currentDate.getDate() + 7);
        break;
      case "month":
        newDate.setMonth(currentDate.getMonth() + 1);
        break;
    }
    onDateChange(newDate);
  };

  return (
    <div className="flex items-center justify-between p-2 border-b">
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={goToToday}>
          Hoje
        </Button>
        <div className="flex items-center gap-1">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToPrevious}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={goToNext}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "justify-start text-left font-normal min-w-[160px]"
              )}
            >
              <CalendarIcon className="mr-2 h-3 w-3" />
              <span className="text-sm">
                {view === "day"
                  ? format(currentDate, "d 'de' MMMM, yyyy", { locale: ptBR })
                  : format(currentDate, "MMMM yyyy", { locale: ptBR })}
              </span>
            </Button>
          </PopoverTrigger>
          <PopoverContent className="w-auto p-0" align="start">
            <Calendar
              mode="single"
              selected={currentDate}
              onSelect={(date) => date && onDateChange(date)}
              initialFocus
              className="pointer-events-auto"
            />
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex items-center gap-2">
        {onToggleExpanded && (
          <Button 
            variant="ghost" 
            size="icon"
            className="h-8 w-8"
            onClick={onToggleExpanded}
            title={isExpanded ? "Mostrar cards" : "Expandir calendário"}
          >
            {isExpanded ? <Minimize2 className="h-3 w-3" /> : <Maximize2 className="h-3 w-3" />}
          </Button>
        )}
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onSearchClick}>
          <Search className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onHelpClick}>
          <HelpCircle className="h-3 w-3" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onSettingsClick}>
          <Settings className="h-3 w-3" />
        </Button>
        <Select value={view} onValueChange={(value) => onViewChange(value as "day" | "week" | "month")}>
          <SelectTrigger className="w-[100px] h-8 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="day">Dia</SelectItem>
            <SelectItem value="week">Semana</SelectItem>
            <SelectItem value="month">Mês</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onMenuClick}>
          <Menu className="h-3 w-3" />
        </Button>
      </div>
    </div>
  );
};