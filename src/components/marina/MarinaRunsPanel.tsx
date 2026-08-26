import { Card } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { useMarinaRuns } from "@/hooks/useMarina";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { parseISO } from "date-fns";

export function MarinaRunsPanel() {
  const { data, isLoading } = useMarinaRuns(true);

  return (
    <Card className="p-4">
      <h3 className="mb-1 text-sm font-semibold">Execuções da Marina</h3>
      <p className="mb-3 text-xs text-muted-foreground">O que a Marina fez a seu pedido, com duração e resultado.</p>
      {isLoading && <Skeleton className="h-24 w-full" />}
      <div className="space-y-2">
        {(data ?? []).map((r: any) => (
          <div key={r.id} className="rounded-md border border-border p-3">
            <div className="flex items-center justify-between gap-2">
              <p className="truncate text-sm font-medium">{r.objective || "Conversa"}</p>
              <Badge variant={r.success ? "secondary" : "destructive"} className="text-[10px]">
                {r.success ? "concluído" : "falhou"}
              </Badge>
            </div>
            <p className="text-xs text-muted-foreground">
              {format(parseISO(r.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })} ·{" "}
              {r.engine === "externo" ? "com pesquisa externa" : "dados do Arrow"} ·{" "}
              {Math.round((r.duration_ms ?? 0) / 100) / 10}s
            </p>
            {r.summary && <p className="mt-1 line-clamp-2 text-xs text-muted-foreground">{r.summary}</p>}
          </div>
        ))}
        {!isLoading && (data ?? []).length === 0 && (
          <p className="py-4 text-center text-xs text-muted-foreground">Nenhuma execução registrada ainda.</p>
        )}
      </div>
    </Card>
  );
}
