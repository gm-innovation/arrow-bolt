import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { AlertTriangle, ShieldCheck } from "lucide-react";
import { conflictTypeLabel, VacationConflict } from "@/hooks/useVacations";
import { ConflictExceptionDialog } from "./ConflictExceptionDialog";
import { Button } from "@/components/ui/button";

export function ConflictBadge({
  conflicts,
  canResolve,
}: {
  conflicts: VacationConflict[];
  canResolve?: boolean;
}) {
  if (conflicts.length === 0) return null;
  const pending = conflicts.filter((c) => !c.resolvido);
  const allResolved = pending.length === 0;

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button type="button" aria-label="Ver conflitos da programação">
          <Badge variant={allResolved ? "secondary" : "destructive"} className="cursor-pointer gap-1">
            {allResolved ? <ShieldCheck className="h-3 w-3" /> : <AlertTriangle className="h-3 w-3" />}
            {allResolved ? "Exceção" : `${pending.length} conflito${pending.length > 1 ? "s" : ""}`}
          </Badge>
        </button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 space-y-3">
        {conflicts.map((c) => (
          <div key={c.id} className="space-y-1 border-b pb-2 last:border-0 last:pb-0">
            <div className="flex items-center justify-between gap-2">
              <span className="text-sm font-medium">{conflictTypeLabel[c.tipo_conflito]}</span>
              {c.resolvido && <Badge variant="secondary">Justificado</Badge>}
            </div>
            <p className="text-xs text-muted-foreground">{c.descricao}</p>
            {c.resolvido && c.motivo_excecao && (
              <p className="text-xs italic text-muted-foreground">Motivo: {c.motivo_excecao}</p>
            )}
            {!c.resolvido && canResolve && (
              <ConflictExceptionDialog
                conflictId={c.id}
                trigger={
                  <Button size="sm" variant="outline" className="mt-1">
                    Registrar exceção
                  </Button>
                }
              />
            )}
          </div>
        ))}
      </PopoverContent>
    </Popover>
  );
}
