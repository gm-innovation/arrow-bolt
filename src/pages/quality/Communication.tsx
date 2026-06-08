import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Megaphone,
  Plus,
  Trash2,
  ClipboardCheck,
  History,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  useQualityCommunication,
  useQualityCommunicationLog,
  type CommunicationPlan,
  type CommunicationType,
  COMMUNICATION_TYPE_LABELS,
} from "@/hooks/useQualityCommunication";

const typeOptions: CommunicationType[] = [
  "training",
  "quality_policy",
  "meeting",
  "campaign",
  "alert",
  "management_review",
  "other",
];

const PlanLogDialog = ({
  plan,
  open,
  onClose,
}: {
  plan: CommunicationPlan | null;
  open: boolean;
  onClose: () => void;
}) => {
  const { data: log = [] } = useQualityCommunicationLog(plan?.id);
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-xl">
        <DialogHeader>
          <DialogTitle>Histórico — {plan?.subject}</DialogTitle>
        </DialogHeader>
        <div className="space-y-2 max-h-[60vh] overflow-y-auto">
          {log.length === 0 ? (
            <p className="text-sm text-muted-foreground py-6 text-center">
              Nenhuma execução registrada.
            </p>
          ) : (
            log.map((l) => (
              <div key={l.id} className="border rounded p-3 text-sm">
                <div className="font-medium">
                  {format(parseISO(l.executed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                </div>
                {l.notes && <p className="text-muted-foreground mt-1 whitespace-pre-wrap">{l.notes}</p>}
                {l.evidence_url && (
                  <a
                    href={l.evidence_url}
                    target="_blank"
                    rel="noreferrer"
                    className="text-primary text-xs underline mt-1 inline-block"
                  >
                    Evidência
                  </a>
                )}
              </div>
            ))
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

const CommunicationPage = () => {
  const { plans, isLoading, createPlan, removePlan, logExecution } =
    useQualityCommunication();

  const [createOpen, setCreateOpen] = useState(false);
  const [subject, setSubject] = useState("");
  const [type, setType] = useState<CommunicationType>("other");
  const [audience, setAudience] = useState("");
  const [channel, setChannel] = useState("");
  const [frequency, setFrequency] = useState("");
  const [next, setNext] = useState("");

  const [logPlan, setLogPlan] = useState<CommunicationPlan | null>(null);
  const [logNotes, setLogNotes] = useState("");
  const [logEvidence, setLogEvidence] = useState("");

  const [historyPlan, setHistoryPlan] = useState<CommunicationPlan | null>(null);

  const reset = () => {
    setSubject("");
    setType("other");
    setAudience("");
    setChannel("");
    setFrequency("");
    setNext("");
  };

  const submit = async () => {
    if (!subject.trim()) return;
    await createPlan.mutateAsync({
      subject: subject.trim(),
      communication_type: type,
      target_audience: audience,
      channel,
      frequency,
      next_scheduled_at: next ? new Date(next).toISOString() : null,
    });
    setCreateOpen(false);
    reset();
  };

  const submitLog = async () => {
    if (!logPlan) return;
    await logExecution.mutateAsync({
      plan_id: logPlan.id,
      notes: logNotes || null,
      evidence_url: logEvidence || null,
    });
    setLogPlan(null);
    setLogNotes("");
    setLogEvidence("");
  };

  const grouped = useMemo(() => {
    const acc: Record<CommunicationType, CommunicationPlan[]> = {
      training: [],
      quality_policy: [],
      meeting: [],
      campaign: [],
      alert: [],
      management_review: [],
      other: [],
    };
    plans.forEach((p) => acc[p.communication_type]?.push(p));
    return acc;
  }, [plans]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Megaphone className="h-6 w-6" />
            Plano de Comunicação
          </h2>
          <p className="text-sm text-muted-foreground">
            ISO 9001 §7.4 — o quê, para quem, quando, como e quem comunica.
          </p>
        </div>
        <Button onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4 mr-1" />
          Novo plano
        </Button>
      </div>

      {isLoading ? (
        <p className="text-muted-foreground py-8 text-center">Carregando...</p>
      ) : plans.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Megaphone className="h-10 w-10 mx-auto opacity-40 mb-3" />
            Nenhum plano de comunicação cadastrado.
          </CardContent>
        </Card>
      ) : (
        typeOptions.map((t) => {
          const list = grouped[t];
          if (!list.length) return null;
          return (
            <div key={t} className="space-y-2">
              <h3 className="text-sm font-semibold text-muted-foreground uppercase">
                {COMMUNICATION_TYPE_LABELS[t]}
                <span className="ml-2 text-xs">({list.length})</span>
              </h3>
              <div className="grid gap-2">
                {list.map((p) => {
                  const overdue =
                    p.next_scheduled_at &&
                    new Date(p.next_scheduled_at) < new Date() &&
                    p.status === "active";
                  return (
                    <Card key={p.id}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h4 className="font-medium">{p.subject}</h4>
                              <Badge variant="outline" className="text-xs">
                                {p.status}
                              </Badge>
                              {overdue && (
                                <Badge variant="destructive" className="text-xs">
                                  Atrasado
                                </Badge>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1 grid grid-cols-2 md:grid-cols-4 gap-2">
                              {p.target_audience && (
                                <span>Público: {p.target_audience}</span>
                              )}
                              {p.channel && <span>Canal: {p.channel}</span>}
                              {p.frequency && <span>Frequência: {p.frequency}</span>}
                              {p.next_scheduled_at && (
                                <span>
                                  Próx:{" "}
                                  {format(parseISO(p.next_scheduled_at), "dd/MM/yyyy", {
                                    locale: ptBR,
                                  })}
                                </span>
                              )}
                            </div>
                          </div>
                          <div className="flex items-center gap-1">
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setLogPlan(p)}
                            >
                              <ClipboardCheck className="h-4 w-4 mr-1" />
                              Registrar
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => setHistoryPlan(p)}
                            >
                              <History className="h-4 w-4" />
                            </Button>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => {
                                if (confirm("Remover este plano?")) removePlan.mutate(p.id);
                              }}
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  );
                })}
              </div>
            </div>
          );
        })
      )}

      {/* Dialog: novo plano */}
      <Dialog open={createOpen} onOpenChange={(v) => { setCreateOpen(v); if (!v) reset(); }}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Novo plano de comunicação</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div className="space-y-1">
              <Label>Assunto *</Label>
              <Input value={subject} onChange={(e) => setSubject(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Tipo</Label>
                <Select value={type} onValueChange={(v) => setType(v as CommunicationType)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {typeOptions.map((t) => (
                      <SelectItem key={t} value={t}>
                        {COMMUNICATION_TYPE_LABELS[t]}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1">
                <Label>Próxima execução</Label>
                <Input
                  type="date"
                  value={next}
                  onChange={(e) => setNext(e.target.value)}
                />
              </div>
            </div>
            <div className="space-y-1">
              <Label>Público-alvo</Label>
              <Input
                placeholder="Ex.: todos os colaboradores; departamento técnico"
                value={audience}
                onChange={(e) => setAudience(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Canal</Label>
                <Input
                  placeholder="Ex.: e-mail, reunião, mural"
                  value={channel}
                  onChange={(e) => setChannel(e.target.value)}
                />
              </div>
              <div className="space-y-1">
                <Label>Frequência</Label>
                <Input
                  placeholder="Ex.: mensal, semestral, sob demanda"
                  value={frequency}
                  onChange={(e) => setFrequency(e.target.value)}
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={submit} disabled={!subject.trim() || createPlan.isPending}>
              Criar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Dialog: registrar execução */}
      <Dialog
        open={!!logPlan}
        onOpenChange={(v) => { if (!v) { setLogPlan(null); setLogNotes(""); setLogEvidence(""); } }}
      >
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Registrar execução</DialogTitle>
          </DialogHeader>
          <div className="grid gap-3">
            <div>
              <Label>Plano</Label>
              <p className="text-sm font-medium">{logPlan?.subject}</p>
            </div>
            <div className="space-y-1">
              <Label>URL da evidência (opcional)</Label>
              <Input
                placeholder="https://..."
                value={logEvidence}
                onChange={(e) => setLogEvidence(e.target.value)}
              />
            </div>
            <div className="space-y-1">
              <Label>Notas</Label>
              <Textarea
                rows={3}
                value={logNotes}
                onChange={(e) => setLogNotes(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setLogPlan(null)}>
              Cancelar
            </Button>
            <Button onClick={submitLog} disabled={logExecution.isPending}>
              Registrar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <PlanLogDialog
        plan={historyPlan}
        open={!!historyPlan}
        onClose={() => setHistoryPlan(null)}
      />
    </div>
  );
};

export default CommunicationPage;
