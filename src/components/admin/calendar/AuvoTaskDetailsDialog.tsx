import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, Clock, FileText, MapPin, Ship, User, Users, type LucideIcon } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CalendarServiceOrder } from "./ServiceCalendar";

interface AuvoTaskDetailsDialogProps {
  event: CalendarServiceOrder;
}

const DetailRow = ({ icon: Icon, label, value }: { icon: LucideIcon; label: string; value?: string }) => {
  if (!value) return null;

  return (
    <div className="flex items-start gap-3 rounded-md border bg-muted/20 p-3">
      <Icon className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
      <div className="min-w-0 space-y-1">
        <p className="text-xs font-medium text-muted-foreground">{label}</p>
        <p className="break-words text-sm font-medium text-foreground">{value}</p>
      </div>
    </div>
  );
};

export const AuvoTaskDetailsDialog = ({ event }: AuvoTaskDetailsDialogProps) => {
  const team = event.auvo_team_name || event.auvo_technician_names?.join(", ") || event.supervisor_name;

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          {event.vessel_name}
        </DialogTitle>
        <DialogDescription className="flex flex-wrap items-center gap-2 pt-1">
          <Badge variant="secondary">Auvo</Badge>
          {event.task_type && <Badge variant="outline">{event.task_type}</Badge>}
          <span>{format(event.scheduled_date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })}</span>
        </DialogDescription>
      </DialogHeader>

      <ScrollArea className="max-h-[65vh] pr-4">
        <div className="grid gap-3">
          <DetailRow icon={Clock} label="Horário" value={event.scheduled_time || "Sem horário informado"} />
          <DetailRow icon={Ship} label="Embarcação" value={event.vessel_name} />
          <DetailRow icon={User} label="Cliente" value={event.client_name} />
          <DetailRow icon={Users} label="Equipe" value={team} />
          <DetailRow icon={MapPin} label="Local" value={event.location} />
          {event.order_number !== "Auvo" && <DetailRow icon={FileText} label="OS informada" value={event.order_number} />}
          <DetailRow icon={FileText} label="Escopo/descrição" value={event.description} />
        </div>
      </ScrollArea>
    </DialogContent>
  );
};
