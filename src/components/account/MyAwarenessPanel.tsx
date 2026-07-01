import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Megaphone } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useMyAwarenessEvents } from "@/hooks/useQualityAwareness";

const MyAwarenessPanel = () => {
  const { rows, isLoading, acknowledge } = useMyAwarenessEvents();
  const pending = rows.filter((r: any) => !r.acknowledged_at);
  const done = rows.filter((r: any) => !!r.acknowledged_at);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Megaphone className="h-5 w-5" /> Conscientizações da Qualidade
        </CardTitle>
        <p className="text-sm text-muted-foreground">
          Confirme a ciência dos eventos em que você foi incluído. Esse registro serve como evidência §7.3 da ISO 9001.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando...</p>
        ) : rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhum evento registrado para você.</p>
        ) : (
          <>
            {pending.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Pendentes ({pending.length})</p>
                {pending.map((r: any) => (
                  <div key={r.event_id} className="border rounded-md p-3 flex items-start justify-between gap-3">
                    <div>
                      <p className="font-medium">{r.event?.topic}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.event?.event_date && format(parseISO(r.event.event_date), "dd/MM/yyyy")}
                        {r.event?.description ? ` · ${r.event.description}` : ""}
                      </p>
                    </div>
                    <Button
                      size="sm"
                      onClick={() => acknowledge.mutate(r.event_id)}
                      disabled={acknowledge.isPending}
                    >
                      <CheckCircle2 className="h-4 w-4 mr-1" /> Confirmar ciência
                    </Button>
                  </div>
                ))}
              </div>
            )}
            {done.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium text-muted-foreground">Confirmadas ({done.length})</p>
                {done.map((r: any) => (
                  <div key={r.event_id} className="border rounded-md p-3 flex items-start justify-between gap-3 opacity-80">
                    <div>
                      <p className="font-medium">{r.event?.topic}</p>
                      <p className="text-xs text-muted-foreground">
                        {r.event?.event_date && format(parseISO(r.event.event_date), "dd/MM/yyyy")}
                      </p>
                    </div>
                    <Badge variant="outline" className="gap-1">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      {format(parseISO(r.acknowledged_at), "dd/MM/yyyy HH:mm")}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default MyAwarenessPanel;
