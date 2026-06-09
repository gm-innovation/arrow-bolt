import { Badge } from "@/components/ui/badge";
import { usePartyTreatments } from "@/hooks/usePartyTreatments";
import { format, parseISO } from "date-fns";
import { Clock } from "lucide-react";

const STATUS_LABELS: Record<string, { label: string; tone: string }> = {
  pendente: { label: "Pendente", tone: "border-yellow-500 text-yellow-700" },
  em_andamento: { label: "Em andamento", tone: "border-blue-500 text-blue-700" },
  atendida: { label: "Atendida", tone: "border-green-500 text-green-700" },
  nao_aplicavel: { label: "Não aplicável", tone: "border-muted-foreground text-muted-foreground" },
};

const PartyTreatmentHistoryTab = ({ partyId }: { partyId: string | null }) => {
  const { history, isLoading } = usePartyTreatments(partyId);

  if (isLoading) return <p className="text-sm text-muted-foreground">Carregando…</p>;
  if (history.length === 0)
    return (
      <p className="text-sm text-muted-foreground text-center py-4">
        Nenhuma tratativa registrada. Mude o status na listagem para iniciar o histórico.
      </p>
    );

  return (
    <div className="space-y-2">
      {history.map((h) => (
        <div key={h.id} className="border rounded p-3 flex items-start gap-3">
          <Clock className="h-4 w-4 text-muted-foreground mt-1" />
          <div className="flex-1 space-y-1">
            <div className="flex items-center gap-2">
              <Badge variant="outline" className={STATUS_LABELS[h.status]?.tone}>
                {STATUS_LABELS[h.status]?.label ?? h.status}
              </Badge>
              <span className="text-xs text-muted-foreground">
                {format(parseISO(h.decided_at), "dd/MM/yyyy HH:mm")}
              </span>
            </div>
            {h.notes && <p className="text-sm">{h.notes}</p>}
          </div>
        </div>
      ))}
    </div>
  );
};

export default PartyTreatmentHistoryTab;
