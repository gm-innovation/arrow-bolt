import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Send, Inbox, Check, X, Ban } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useAuth } from "@/contexts/AuthContext";
import { useCompanyUsers } from "@/hooks/useCompanyUsers";
import { useOpportunityTransfers } from "@/hooks/useOpportunityTransfers";

interface Props {
  opportunityId: string;
  currentAssignedTo: string | null;
  onTransferred?: () => void;
}

const STATUS_LABEL: Record<string, string> = {
  pending: "Pendente",
  accepted: "Aceita",
  rejected: "Recusada",
  cancelled: "Cancelada",
  auto: "Direta",
};
const STATUS_COLOR: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  accepted: "bg-green-100 text-green-800",
  rejected: "bg-red-100 text-red-800",
  cancelled: "bg-gray-100 text-gray-700",
  auto: "bg-blue-100 text-blue-800",
};

export const OpportunityTransferTab = ({ opportunityId, currentAssignedTo, onTransferred }: Props) => {
  const { user } = useAuth();
  const { data: users = [] } = useCompanyUsers(["coordinator", "director", "admin"]);
  const { transfers, isLoading, create, decide } = useOpportunityTransfers(opportunityId);

  const [toUser, setToUser] = useState<string>("");
  const [reason, setReason] = useState("");
  const [decisionNote, setDecisionNote] = useState<Record<string, string>>({});

  const eligible = users.filter((u) => u.id !== user?.id && u.id !== currentAssignedTo);

  const submit = (direct: boolean) => {
    if (!toUser) return;
    create.mutate(
      { opportunityId, toUserId: toUser, reason, direct },
      {
        onSuccess: () => {
          setToUser(""); setReason("");
          if (direct) onTransferred?.();
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      {/* Reassign block */}
      <div className="space-y-3 rounded-lg border p-4">
        <div className="flex items-center gap-2">
          <Send className="h-4 w-4 text-primary" />
          <h3 className="font-medium text-sm">Reatribuir oportunidade</h3>
        </div>
        <div className="space-y-2">
          <Label>Coordenador destino</Label>
          <Select value={toUser} onValueChange={setToUser}>
            <SelectTrigger><SelectValue placeholder="Selecione um colega" /></SelectTrigger>
            <SelectContent>
              {eligible.length === 0 ? (
                <div className="px-2 py-3 text-xs text-muted-foreground">Nenhum colega disponível</div>
              ) : eligible.map((u) => (
                <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>Motivo (opcional)</Label>
          <Textarea value={reason} onChange={(e) => setReason(e.target.value)} rows={2} placeholder="Ex.: cliente pertence à carteira do colega" />
        </div>
        <div className="flex flex-wrap gap-2">
          <Button size="sm" onClick={() => submit(true)} disabled={!toUser || create.isPending}>
            <Send className="h-4 w-4 mr-2" /> Enviar agora
          </Button>
          <Button size="sm" variant="outline" onClick={() => submit(false)} disabled={!toUser || create.isPending}>
            <Inbox className="h-4 w-4 mr-2" /> Solicitar transferência
          </Button>
        </div>
        <p className="text-[11px] text-muted-foreground">
          <strong>Enviar agora</strong> reatribui imediatamente. <strong>Solicitar</strong> aguarda aceite do destinatário.
        </p>
      </div>

      {/* History block */}
      <div className="space-y-2">
        <h3 className="font-medium text-sm">Histórico de transferências</h3>
        {isLoading ? (
          <p className="text-xs text-muted-foreground">Carregando...</p>
        ) : transfers.length === 0 ? (
          <p className="text-xs text-muted-foreground italic">Nenhuma transferência registrada.</p>
        ) : (
          <ul className="space-y-2">
            {transfers.map((t) => {
              const isReceiver = t.to_user_id === user?.id;
              const isSender = t.from_user_id === user?.id;
              const note = decisionNote[t.id] || "";
              return (
                <li key={t.id} className="rounded border p-3 space-y-2 text-sm">
                  <div className="flex items-center justify-between gap-2 flex-wrap">
                    <div className="text-xs text-muted-foreground">
                      {format(parseISO(t.created_at), "dd/MM/yy HH:mm", { locale: ptBR })}
                    </div>
                    <Badge variant="secondary" className={STATUS_COLOR[t.status]}>{STATUS_LABEL[t.status]}</Badge>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">{t.from_name}</span>
                    <span className="text-muted-foreground"> → </span>
                    <span className="font-medium">{t.to_name}</span>
                  </div>
                  {t.reason && <p className="text-xs text-muted-foreground">Motivo: {t.reason}</p>}
                  {t.decision_note && <p className="text-xs text-muted-foreground">Nota: {t.decision_note}</p>}

                  {t.status === "pending" && (isReceiver || isSender) && (
                    <div className="space-y-2 pt-1">
                      {isReceiver && (
                        <Textarea
                          value={note}
                          onChange={(e) => setDecisionNote((p) => ({ ...p, [t.id]: e.target.value }))}
                          rows={2}
                          placeholder="Nota (opcional)"
                          className="text-xs"
                        />
                      )}
                      <div className="flex gap-2 flex-wrap">
                        {isReceiver && (
                          <>
                            <Button
                              size="sm"
                              onClick={() =>
                                decide.mutate(
                                  { id: t.id, status: "accepted", note },
                                  { onSuccess: () => onTransferred?.() },
                                )
                              }
                              disabled={decide.isPending}
                            >
                              <Check className="h-3 w-3 mr-1" /> Aceitar
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => decide.mutate({ id: t.id, status: "rejected", note })}
                              disabled={decide.isPending}
                            >
                              <X className="h-3 w-3 mr-1" /> Recusar
                            </Button>
                          </>
                        )}
                        {isSender && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => decide.mutate({ id: t.id, status: "cancelled" })}
                            disabled={decide.isPending}
                          >
                            <Ban className="h-3 w-3 mr-1" /> Cancelar solicitação
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
};
