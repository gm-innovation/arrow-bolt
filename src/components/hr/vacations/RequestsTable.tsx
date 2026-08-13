import { useMemo } from "react";
import { computeVacationOverlaps } from "@/lib/hr/vacationOverlaps";
import { format, parseISO } from "date-fns";

import { ptBR } from "date-fns/locale";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  deadlineSeverity,
  requestStatusLabel,
  requestTypeLabel,
  VacationConflict,
  VacationRequest,
  VacationRequestStatus,
} from "@/hooks/useVacations";
import { ConflictBadge } from "./ConflictBadge";
import { cn } from "@/lib/utils";

function statusVariant(s: VacationRequestStatus) {
  if (s === "approved") return "default" as const;
  if (s === "rejected" || s === "cancelled") return "destructive" as const;
  return "secondary" as const;
}

export function RequestsTable({
  requests,
  allRequests,
  conflicts,
  isLoading,
  isHR,
  profileId,
  onCancel,
  renderActions,
}: {
  requests: VacationRequest[];
  allRequests?: VacationRequest[];
  conflicts: VacationConflict[];
  isLoading?: boolean;
  isHR: boolean;
  profileId?: string;
  onCancel: (id: string) => void;
  renderActions: (r: VacationRequest) => React.ReactNode;
}) {
  const conflictsFor = (id: string) => conflicts.filter((c) => c.programacao_id === id);
  const overlapMap = useMemo(
    () => computeVacationOverlaps(allRequests ?? requests),
    [allRequests, requests]
  );


  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Colaborador</TableHead>
          <TableHead>Tipo</TableHead>
          <TableHead>Gozo</TableHead>
          <TableHead>Dias</TableHead>
          <TableHead>Período / Limite</TableHead>
          <TableHead>Status</TableHead>
          <TableHead className="text-right">Ações</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {isLoading && (
          <TableRow>
            <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
              Carregando...
            </TableCell>
          </TableRow>
        )}
        {!isLoading && requests.length === 0 && (
          <TableRow>
            <TableCell colSpan={7} className="py-8 text-center text-muted-foreground">
              Nenhuma solicitação.
            </TableCell>
          </TableRow>
        )}
        {requests.map((r) => {
          const canCancel =
            (r.employee_id === profileId && r.status !== "approved" && r.status !== "cancelled") || isHR;
          const sev = r.period ? deadlineSeverity(r.period.concession_deadline) : "ok";
          return (
            <TableRow key={r.id}>
              <TableCell className="font-medium">
                {r.employee?.full_name ?? "—"}
                {r.employee?.position && (
                  <div className="text-xs text-muted-foreground">{r.employee.position}</div>
                )}
              </TableCell>
              <TableCell>
                {requestTypeLabel[r.request_type]}
                {(r.numero_parcela ?? 1) > 1 && (
                  <div className="text-xs text-muted-foreground">Parcela {r.numero_parcela}</div>
                )}
              </TableCell>
              <TableCell className="text-sm">
                {format(parseISO(r.start_date), "dd/MM/yyyy", { locale: ptBR })}
                {" → "}
                {format(parseISO(r.end_date), "dd/MM/yyyy", { locale: ptBR })}
              </TableCell>
              <TableCell>
                {r.requested_days}d
                {r.sell_days > 0 && (
                  <span className="text-xs text-muted-foreground"> + {r.sell_days}d abono</span>
                )}
              </TableCell>
              <TableCell className="text-sm">
                {r.period ? (
                  <>
                    <div>
                      {format(parseISO(r.period.period_start), "dd/MM/yy")} →{" "}
                      {format(parseISO(r.period.period_end), "dd/MM/yy")}
                    </div>
                    <div
                      className={cn(
                        "text-xs",
                        sev === "expired" || sev === "critical"
                          ? "font-medium text-destructive"
                          : sev === "warning"
                          ? "text-amber-600"
                          : "text-muted-foreground"
                      )}
                    >
                      limite {format(parseISO(r.period.concession_deadline), "dd/MM/yyyy")}
                    </div>
                  </>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </TableCell>
              <TableCell>
                <div className="flex flex-wrap items-center gap-1">
                  <Badge variant={statusVariant(r.status)}>{requestStatusLabel[r.status]}</Badge>
                  {r.is_exception && (
                    <Badge variant="outline" className="border-amber-500 text-amber-600">
                      Exceção
                    </Badge>
                  )}
                  <ConflictBadge
                    conflicts={conflictsFor(r.id)}
                    canResolve={isHR}
                    overlaps={overlapMap.get(r.id) ?? []}
                  />

                </div>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-1">
                  {renderActions(r)}
                  {canCancel && (
                    <Button size="sm" variant="ghost" onClick={() => onCancel(r.id)}>
                      Cancelar
                    </Button>
                  )}
                </div>
              </TableCell>
            </TableRow>
          );
        })}
      </TableBody>
    </Table>
  );
}
