import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { format } from "date-fns";
import { Plus, Trash2 } from "lucide-react";
import { TimeEntry } from "./types";

interface TimeEntriesSectionProps {
  taskId: string;
  timeEntries: TimeEntry[];
  onAddTimeEntry: (taskId: string) => void;
  onRemoveTimeEntry: (taskId: string, entryId: string) => void;
  onUpdateTimeEntry: (taskId: string, entryId: string, field: keyof TimeEntry, value: any) => void;
}

const timeTypes = [
  { value: "work_normal", label: "Trabalho HN" },
  { value: "work_extra", label: "Trabalho HE" },
  { value: "travel_normal", label: "Viagem HN" },
  { value: "travel_extra", label: "Viagem HE" },
  { value: "wait_normal", label: "Espera HN" },
  { value: "wait_extra", label: "Espera HE" },
];

export const TimeEntriesSection = ({
  taskId,
  timeEntries,
  onAddTimeEntry,
  onRemoveTimeEntry,
  onUpdateTimeEntry,
}: TimeEntriesSectionProps) => {
  return (
    <div className="space-y-4">
      {timeEntries.map((entry) => (
        <div key={entry.id} className="flex flex-col md:flex-row gap-4 items-end">
          <div className="w-full md:w-auto">
            <Label>Data</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className="w-full md:w-[240px]">
                  {entry.date ? format(entry.date, "dd/MM/yyyy") : "Selecione uma data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar
                  mode="single"
                  selected={entry.date}
                  onSelect={(date) => onUpdateTimeEntry(taskId, entry.id, "date", date)}
                />
              </PopoverContent>
            </Popover>
          </div>

          <div className="w-full md:w-auto">
            <Label>Tipo</Label>
            <Select
              value={entry.type}
              onValueChange={(value) => onUpdateTimeEntry(taskId, entry.id, "type", value)}
            >
              <SelectTrigger className="w-full md:w-[200px]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {timeTypes.map((type) => (
                  <SelectItem key={type.value} value={type.value}>
                    {type.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="w-full md:w-auto">
            <Label>Início</Label>
            <Input
              type="time"
              value={entry.startTime}
              onChange={(e) => onUpdateTimeEntry(taskId, entry.id, "startTime", e.target.value)}
            />
          </div>

          <div className="w-full md:w-auto">
            <Label>Fim</Label>
            <Input
              type="time"
              value={entry.endTime}
              onChange={(e) => onUpdateTimeEntry(taskId, entry.id, "endTime", e.target.value)}
            />
          </div>

          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="text-destructive"
            onClick={() => onRemoveTimeEntry(taskId, entry.id)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <Button type="button" variant="outline" onClick={() => onAddTimeEntry(taskId)}>
        <Plus className="h-4 w-4 mr-2" />
        Adicionar Horário
      </Button>
    </div>
  );
};