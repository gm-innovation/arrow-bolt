import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { absenceCategory, categoryStyles } from "./eventStyles";
import type { CalendarAbsence, CalendarOnCall } from "@/hooks/useCalendarAbsences";

export type ScheduleEntry =
  | { kind: "absence"; absence: CalendarAbsence }
  | { kind: "on_call"; onCall: CalendarOnCall };

const formatDate = (value: string) => format(parseISO(value), "dd 'de' MMMM 'de' yyyy", { locale: ptBR });

export const ScheduleEntryDetailsDialog = ({ entry }: { entry: ScheduleEntry }) => {
  const category = entry.kind === "absence" ? absenceCategory(entry.absence.absence_type) : "on_call";
  const style = categoryStyles[category];
  const Icon = style.icon;

  const name = entry.kind === "absence" ? entry.absence.technician_name : entry.onCall.technician_name;

  return (
    <DialogContent className="max-w-md">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <span
            className={cn(
              "flex items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium",
              style.badge,
            )}
          >
            <Icon className="h-3 w-3" />
            {style.label}
          </span>
          {name}
        </DialogTitle>
        <DialogDescription>
          {entry.kind === "absence"
            ? "Registro de ausência do RH"
            : "Escala de sobreaviso"}
        </DialogDescription>
      </DialogHeader>

      <dl className="space-y-3 text-sm">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Colaborador</dt>
          <dd className="font-medium text-right">{name}</dd>
        </div>

        {entry.kind === "absence" ? (
          <>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Início</dt>
              <dd className="font-medium text-right">{formatDate(entry.absence.start_date)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Término</dt>
              <dd className="font-medium text-right">{formatDate(entry.absence.end_date)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Situação</dt>
              <dd className="font-medium text-right">{entry.absence.status}</dd>
            </div>
          </>
        ) : (
          <>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Data</dt>
              <dd className="font-medium text-right">{formatDate(entry.onCall.on_call_date)}</dd>
            </div>
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Tipo de dia</dt>
              <dd className="font-medium text-right">
                {entry.onCall.is_holiday ? "Feriado" : entry.onCall.is_weekend ? "Fim de semana" : "Dia útil"}
              </dd>
            </div>
          </>
        )}
      </dl>
    </DialogContent>
  );
};
