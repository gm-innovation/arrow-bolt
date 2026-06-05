import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter } from "@/components/ui/sheet";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { format, parseISO } from "date-fns";
import { useQualityRisks, useQualityRiskEvents, type QualityRisk, type RiskKind, type RiskStatus, type RiskTreatment, type RiskSource } from "@/hooks/useQualityRisks";
import { useQualityRiskActions } from "@/hooks/useQualityRiskActions";
import { Plus, Trash2 } from "lucide-react";

interface Props {
  open: boolean;
  onClose: () => void;
  risk: QualityRisk | null;
}

const KINDS: RiskKind[] = ["risk", "opportunity"];
const SOURCES: RiskSource[] = ["context", "interested_party", "process", "audit", "ncr", "management_review", "manual"];
const STATUSES: RiskStatus[] = ["identified", "analyzing", "treating", "monitoring", "accepted", "closed"];
const TREATMENTS_RISK: RiskTreatment[] = ["avoid", "mitigate", "transfer", "accept", "ignore"];
const TREATMENTS_OPP: RiskTreatment[] = ["exploit", "enhance", "share", "ignore"];

const RiskAssessmentDrawer = ({ open, onClose, risk }: Props) => {
  const isNew = !risk;
  const { upsert, review, remove } = useQualityRisks();
  const { items: actions, upsert: upsertAction, remove: removeAction } = useQualityRiskActions(risk?.id);
  const { data: events = [] } = useQualityRiskEvents(risk?.id);

  const [form, setForm] = useState<Partial<QualityRisk>>({
    kind: "risk", source: "manual", probability: 3, impact: 3, status: "identified", review_frequency_months: 12,
  });
  const [newAction, setNewAction] = useState("");

  useEffect(() => {
    if (risk) setForm(risk);
    else setForm({ kind: "risk", source: "manual", probability: 3, impact: 3, status: "identified", review_frequency_months: 12 });
  }, [risk?.id]);

  const treatmentOptions = form.kind === "opportunity" ? TREATMENTS_OPP : TREATMENTS_RISK;

  const save = () => {
    if (!form.title) return;
    upsert.mutate(form as any, { onSuccess: () => onClose() });
  };

  const addAction = () => {
    if (!newAction.trim() || !risk) return;
    upsertAction.mutate({ description: newAction });
    setNewAction("");
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{isNew ? "Novo registro" : risk?.code}</SheetTitle>
          <SheetDescription>
            {form.kind === "opportunity" ? "Oportunidade" : "Risco"} · ISO 9001 §6.1
          </SheetDescription>
        </SheetHeader>

        <div className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Tipo</Label>
              <Select value={form.kind} onValueChange={(v) => setForm({ ...form, kind: v as RiskKind })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{KINDS.map((k) => <SelectItem key={k} value={k}>{k === "risk" ? "Risco" : "Oportunidade"}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Origem</Label>
              <Select value={form.source} onValueChange={(v) => setForm({ ...form, source: v as RiskSource })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{SOURCES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">Título *</Label>
            <Input value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Descrição</Label>
            <Textarea rows={3} value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} />
          </div>
          <div>
            <Label className="text-xs">Categoria (processo / área)</Label>
            <Input value={form.category ?? ""} onChange={(e) => setForm({ ...form, category: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Probabilidade (1-5)</Label>
              <Input type="number" min={1} max={5} value={form.probability ?? 3}
                onChange={(e) => setForm({ ...form, probability: Number(e.target.value) })} />
            </div>
            <div>
              <Label className="text-xs">Impacto (1-5)</Label>
              <Input type="number" min={1} max={5} value={form.impact ?? 3}
                onChange={(e) => setForm({ ...form, impact: Number(e.target.value) })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Tratamento</Label>
              <Select value={form.treatment ?? "none"} onValueChange={(v) => setForm({ ...form, treatment: v === "none" ? null : v as RiskTreatment })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">— sem tratamento —</SelectItem>
                  {treatmentOptions.map((t) => <SelectItem key={t} value={t}>{t}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label className="text-xs">Status</Label>
              <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v as RiskStatus })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUSES.map((s) => <SelectItem key={s} value={s}>{s}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label className="text-xs">Plano de tratamento</Label>
            <Textarea rows={2} value={form.treatment_plan ?? ""} onChange={(e) => setForm({ ...form, treatment_plan: e.target.value })} />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Prazo de tratamento</Label>
              <Input type="date" value={form.treatment_due_date ?? ""} onChange={(e) => setForm({ ...form, treatment_due_date: e.target.value || null })} />
            </div>
            <div>
              <Label className="text-xs">Frequência de revisão (meses)</Label>
              <Input type="number" min={1} value={form.review_frequency_months ?? 12}
                onChange={(e) => setForm({ ...form, review_frequency_months: Number(e.target.value) })} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label className="text-xs">Probabilidade residual</Label>
              <Input type="number" min={1} max={5} value={form.residual_probability ?? ""}
                onChange={(e) => setForm({ ...form, residual_probability: e.target.value ? Number(e.target.value) : null })} />
            </div>
            <div>
              <Label className="text-xs">Impacto residual</Label>
              <Input type="number" min={1} max={5} value={form.residual_impact ?? ""}
                onChange={(e) => setForm({ ...form, residual_impact: e.target.value ? Number(e.target.value) : null })} />
            </div>
          </div>

          {risk && (
            <>
              <div className="flex gap-2 pt-2">
                <Button size="sm" variant="outline" onClick={() => review.mutate(risk.id)}>
                  Marcar como revisado
                </Button>
                {risk.last_reviewed_at && (
                  <span className="text-xs text-muted-foreground self-center">
                    Última: {format(parseISO(risk.last_reviewed_at), "dd/MM/yyyy")}
                  </span>
                )}
              </div>

              <Card>
                <CardContent className="pt-4">
                  <div className="font-medium text-sm mb-2">Ações de tratamento</div>
                  <div className="flex gap-2 mb-3">
                    <Input placeholder="Nova ação..." value={newAction} onChange={(e) => setNewAction(e.target.value)} />
                    <Button size="sm" onClick={addAction}><Plus className="h-4 w-4" /></Button>
                  </div>
                  {actions.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Nenhuma ação cadastrada.</p>
                  ) : (
                    <ul className="space-y-1">
                      {actions.map((a) => (
                        <li key={a.id} className="flex items-center justify-between text-sm py-1 border-b last:border-0">
                          <span>
                            <Badge variant="outline" className="mr-2">{a.status}</Badge>
                            {a.description}
                          </span>
                          <Button size="icon" variant="ghost" onClick={() => removeAction.mutate(a.id)}>
                            <Trash2 className="h-3 w-3 text-destructive" />
                          </Button>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>

              <Card>
                <CardContent className="pt-4">
                  <div className="font-medium text-sm mb-2">Histórico</div>
                  {events.length === 0 ? (
                    <p className="text-xs text-muted-foreground">Sem eventos.</p>
                  ) : (
                    <ul className="space-y-1 text-xs">
                      {events.slice(0, 10).map((ev) => (
                        <li key={ev.id} className="flex justify-between">
                          <span className="text-muted-foreground">{format(parseISO(ev.at), "dd/MM/yyyy HH:mm")}</span>
                          <span>{ev.event_type}</span>
                        </li>
                      ))}
                    </ul>
                  )}
                </CardContent>
              </Card>
            </>
          )}
        </div>

        <SheetFooter className="gap-2">
          {risk && (
            <Button variant="destructive" size="sm" onClick={() => { if (confirm("Remover este registro?")) { remove.mutate(risk.id, { onSuccess: onClose }); } }}>
              Remover
            </Button>
          )}
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={save} disabled={!form.title}>Salvar</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default RiskAssessmentDrawer;
