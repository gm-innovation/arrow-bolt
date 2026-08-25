import { format, isSameDay } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, Clock, Ship, Users } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import type { CalendarServiceOrder } from "./ServiceCalendar";

interface DayEventsDialogProps {
  date: Date;
  orders: CalendarServiceOrder[];
  onOrderClick: (orderId: string) => void;
}

const getStatusLabel = (status: string) => {
  const labels: Record<string, string> = {
    pending: "Pendente",
    in_progress: "Em andamento",
    completed: "Concluído",
    cancelled: "Cancelado",
    waiting: "Aguardando",
    auvo: "Agenda Auvo",
  };
  return labels[status] || status;
};

const getTeamLabel = (order: CalendarServiceOrder) => {
  const localTeam = [
    order.lead_technician,
    ...(order.auxiliary_technicians || []),
    ...(order.technician_names || []),
  ].filter(Boolean);

  if (localTeam.length > 0) return [...new Set(localTeam)].join(", ");
  if (order.auvo_team_name) return order.auvo_team_name;
  if (order.auvo_technician_names && order.auvo_technician_names.length > 0) {
    return order.auvo_technician_names.join(", ");
  }
  if (order.supervisor_name) return order.supervisor_name;
  return "Equipe não informada";
};

export const DayEventsDialog = ({ date, orders, onOrderClick }: DayEventsDialogProps) => {
  const dayOrders = orders.filter((order) => isSameDay(order.scheduled_date, date));

  return (
    <DialogContent className="max-w-3xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          Atividades do dia
        </DialogTitle>
        <DialogDescription>
          {format(date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })} • {dayOrders.length} atividade(s)
        </DialogDescription>
      </DialogHeader>

      <ScrollArea className="max-h-[65vh] pr-4">
        <div className="space-y-2">
          {dayOrders.map((order) => (
            <Button
              key={order.id}
              type="button"
              variant="ghost"
              className="h-auto w-full justify-start rounded-md border p-3 text-left hover:bg-accent/50"
              onClick={() => onOrderClick(order.id)}
            >
              <div className="grid w-full gap-2 sm:grid-cols-[1fr_auto]">
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-semibold">
                      {order.event_source === "auvo" ? "Auvo" : `OS ${order.order_number}`}
                    </span>
                    <Badge variant="secondary">{getStatusLabel(order.status)}</Badge>
                  </div>
                  <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                    <Ship className="h-4 w-4 shrink-0" />
                    <span className="truncate font-medium text-foreground">{order.vessel_name}</span>
                    {order.client_name && <span className="truncate">• {order.client_name}</span>}
                  </div>
                  <div className="flex min-w-0 items-center gap-2 text-sm text-muted-foreground">
                    <Users className="h-4 w-4 shrink-0" />
                    <span className="truncate">{getTeamLabel(order)}</span>
                  </div>
                </div>
                <div className="flex items-start gap-2 text-sm text-muted-foreground sm:justify-end">
                  <Clock className="h-4 w-4" />
                  <span>{order.scheduled_time || "Sem horário"}</span>
                </div>
              </div>
            </Button>
          ))}
        </div>
      </ScrollArea>
    </DialogContent>
  );
};