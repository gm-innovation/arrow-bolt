import { format, isSameDay, isWithinInterval, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { CalendarDays, Clock, Ship, Users } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { cn } from "@/lib/utils";
import type { CalendarServiceOrder } from "./ServiceCalendar";
import type { CalendarAbsence, CalendarOnCall } from "@/hooks/useCalendarAbsences";
import {
  absenceCategory,
  categoryStyles,
  classifyEvent,
  isCategoryActive,
  type CalendarCategory,
} from "./eventStyles";

import type { ScheduleEntry } from "./ScheduleEntryDetailsDialog";

interface DayEventsDialogProps {
  date: Date;
  orders: CalendarServiceOrder[];
  absences?: CalendarAbsence[];
  onCalls?: CalendarOnCall[];
  activeCategories?: CalendarCategory[];
  onOrderClick: (orderId: string) => void;
  onScheduleEntryClick?: (entry: ScheduleEntry) => void;
}



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

export const DayEventsDialog = ({
  date,
  orders,
  absences = [],
  onCalls = [],
  activeCategories,
  onOrderClick,
}: DayEventsDialogProps) => {
  const dayOrders = orders
    .filter((order) => isSameDay(order.scheduled_date, date))
    .filter((order) => isCategoryActive(classifyEvent(order), activeCategories));

  const dayAbsences = absences.filter((absence) => {
    const start = parseISO(absence.start_date);
    const end = parseISO(absence.end_date);
    return (
      isWithinInterval(date, { start, end }) &&
      isCategoryActive(absenceCategory(absence.absence_type), activeCategories)
    );
  });

  const dayOnCalls = isCategoryActive("on_call", activeCategories)
    ? onCalls.filter((oc) => isSameDay(parseISO(oc.on_call_date), date))
    : [];

  const totalEvents = dayOrders.length + dayAbsences.length + dayOnCalls.length;

  return (
    <DialogContent className="max-w-3xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <CalendarDays className="h-5 w-5" />
          Atividades do dia
        </DialogTitle>
        <DialogDescription>
          {format(date, "EEEE, dd 'de' MMMM 'de' yyyy", { locale: ptBR })} • {totalEvents} atividade(s)
        </DialogDescription>
      </DialogHeader>

      <ScrollArea className="max-h-[65vh] pr-4">
        <div className="space-y-2">
          {dayOrders.map((order) => {
            const category = classifyEvent(order);
            const style = categoryStyles[category];
            const CategoryIcon = style.icon;
            return (
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
                    <span
                      className={cn(
                        "flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium",
                        style.badge
                      )}
                    >
                      <CategoryIcon className="h-3 w-3" />
                      {style.label}
                    </span>
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
            );
          })}

          {[
            ...dayAbsences.map((absence) => ({
              key: `absence-${absence.id}`,
              category: absenceCategory(absence.absence_type),
              name: absence.technician_name,
            })),
            ...dayOnCalls.map((oc) => ({
              key: `oncall-${oc.id}`,
              category: "on_call" as CalendarCategory,
              name: oc.technician_name,
            })),
          ].map((entry) => {
            const style = categoryStyles[entry.category];
            const Icon = style.icon;
            return (
              <div key={entry.key} className="flex items-center gap-2 rounded-md border p-3">
                <span
                  className={cn(
                    "flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium",
                    style.badge
                  )}
                >
                  <Icon className="h-3 w-3" />
                  {style.label}
                </span>
                <span className="truncate text-sm font-medium">{entry.name}</span>
              </div>
            );
          })}

        </div>
      </ScrollArea>
    </DialogContent>
  );
};