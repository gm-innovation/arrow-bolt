import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Megaphone, Plus, Trash2, Users, UserPlus } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useQualityAwarenessEvents, useAwarenessAttendees } from "@/hooks/useQualityAwareness";
import AwarenessFormDialog from "@/components/quality/awareness/AwarenessFormDialog";

const AttendeeStats = ({ eventId, externalCount }: { eventId: string; externalCount: number }) => {
  const { data = [] } = useAwarenessAttendees(eventId);
  const acked = data.filter((a) => !!a.acknowledged_at).length;
  const total = data.length;
  const pct = total ? Math.round((acked / total) * 100) : null;
  return (
    <div className="flex flex-col gap-1 text-xs">
      <span className="flex items-center gap-1">
        <Users className="h-3.5 w-3.5" /> {total} interno(s)
        {pct !== null && (
          <Badge variant={pct === 100 ? "default" : "secondary"} className="ml-1">{pct}% ciência</Badge>
        )}
      </span>
      {externalCount > 0 && (
        <span className="flex items-center gap-1 text-muted-foreground">
          <UserPlus className="h-3.5 w-3.5" /> {externalCount} externo(s)
        </span>
      )}
    </div>
  );
};

const Awareness = () => {
  const { events, isLoading, remove } = useQualityAwarenessEvents();
  const [open, setOpen] = useState(false);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Megaphone className="h-5 w-5" /> Eventos de Conscientização
          </CardTitle>
          <p className="text-sm text-muted-foreground">
            Registre ações de conscientização (Política da Qualidade, objetivos, mudanças relevantes) e quem participou — §7.3 ISO 9001.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-1" /> Novo Evento
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-center py-8 text-muted-foreground">Carregando...</p>
        ) : events.length === 0 ? (
          <p className="text-center py-8 text-muted-foreground">Nenhum evento registrado.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tema</TableHead>
                <TableHead className="w-32">Data</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead className="w-32">Participantes</TableHead>
                <TableHead className="w-28">Evidência</TableHead>
                <TableHead className="w-16" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {events.map((e) => (
                <TableRow key={e.id}>
                  <TableCell className="font-medium">{e.topic}</TableCell>
                  <TableCell className="text-sm">{format(parseISO(e.event_date), "dd/MM/yyyy")}</TableCell>
                  <TableCell className="text-sm max-w-md truncate">
                    {e.description || <span className="text-muted-foreground">—</span>}
                  </TableCell>
                  <TableCell><AttendeeStats eventId={e.id} externalCount={e.external_attendees?.length ?? 0} /></TableCell>
                  <TableCell>
                    {e.evidence_url ? (
                      <a className="text-primary text-sm underline" href={e.evidence_url} target="_blank" rel="noreferrer">Abrir</a>
                    ) : (
                      <Badge variant="outline">—</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => {
                        if (confirm(`Remover evento "${e.topic}"?`)) remove.mutate(e.id);
                      }}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
      <AwarenessFormDialog open={open} onOpenChange={setOpen} />
    </Card>
  );
};

export default Awareness;
