import { useMemo, useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Save, Target, GitBranch } from "lucide-react";
import { useQualityObjectives, type QualityObjective, type ObjectiveScope, type TimeHorizon, type IdentityLink } from "@/hooks/useQualityPlanning";
import { toast } from "@/hooks/use-toast";

const HORIZON_OPTIONS: { value: TimeHorizon; label: string }[] = [
  { value: "short", label: "Curto (até 1 ano)" },
  { value: "medium", label: "Médio (1 a 3 anos)" },
  { value: "long", label: "Longo (3+ anos)" },
];

const LINK_OPTIONS: { value: IdentityLink; label: string }[] = [
  { value: "mission", label: "Missão" },
  { value: "vision", label: "Visão" },
  { value: "values", label: "Valores" },
];

const STATUS_OPTIONS = [
  { value: "rascunho", label: "Rascunho" },
  { value: "ativo", label: "Ativo" },
  { value: "concluido", label: "Concluído" },
  { value: "cancelado", label: "Cancelado" },
];

function StrategicObjectiveDialog({
  open, onClose, initial, onSave, allStrategic,
}: {
  open: boolean;
  onClose: () => void;
  initial: Partial<QualityObjective> | null;
  onSave: (payload: Partial<QualityObjective>) => void;
  allStrategic: QualityObjective[];
}) {
  const [form, setForm] = useState<Partial<QualityObjective>>({});
  useEffect(() => {
    setForm(initial ?? { objective_scope: "strategic", status: "ativo", time_horizon: "medium" });
  }, [initial, open]);
  const upd = (patch: Partial<QualityObjective>) => setForm((f) => ({ ...f, ...patch }));

  const parentCandidates = allStrategic.filter((o) => o.id !== initial?.id);

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Editar objetivo estratégico" : "Novo objetivo estratégico"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid md:grid-cols-4 gap-3">
            <div>
              <Label>Código</Label>
              <Input value={form.code ?? ""} onChange={(e) => upd({ code: e.target.value })} />
            </div>
            <div className="md:col-span-3">
              <Label>Título *</Label>
              <Input value={form.title ?? ""} onChange={(e) => upd({ title: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea rows={3} value={form.description ?? ""} onChange={(e) => upd({ description: e.target.value })} />
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <Label>Horizonte de tempo</Label>
              <Select value={form.time_horizon ?? ""} onValueChange={(v) => upd({ time_horizon: v as TimeHorizon })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{HORIZON_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Vinculado a</Label>
              <Select value={form.linked_to ?? ""} onValueChange={(v) => upd({ linked_to: v as IdentityLink })}>
                <SelectTrigger><SelectValue placeholder="Missão / Visão / Valores" /></SelectTrigger>
                <SelectContent>{LINK_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status ?? "ativo"} onValueChange={(v) => upd({ status: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{STATUS_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <Label>Período (início)</Label>
              <Input type="date" value={form.period_start ?? ""} onChange={(e) => upd({ period_start: e.target.value || null })} />
            </div>
            <div>
              <Label>Período (fim)</Label>
              <Input type="date" value={form.period_end ?? ""} onChange={(e) => upd({ period_end: e.target.value || null })} />
            </div>
            <div>
              <Label>Objetivo pai (desdobramento)</Label>
              <Select value={form.parent_objective_id ?? "none"} onValueChange={(v) => upd({ parent_objective_id: v === "none" ? null : v })}>
                <SelectTrigger><SelectValue placeholder="Nenhum" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhum</SelectItem>
                  {parentCandidates.map((o) => <SelectItem key={o.id} value={o.id}>{o.code ? `[${o.code}] ` : ""}{o.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>Meta (valor)</Label>
              <Input type="number" step="0.01" value={form.target_value ?? ""} onChange={(e) => upd({ target_value: e.target.value ? Number(e.target.value) : null })} />
            </div>
            <div>
              <Label>Unidade</Label>
              <Input value={form.unit ?? ""} onChange={(e) => upd({ unit: e.target.value })} />
            </div>
          </div>
          <div>
            <Label>Notas</Label>
            <Textarea rows={2} value={form.notes ?? ""} onChange={(e) => upd({ notes: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => {
            if (!form.title?.trim()) { toast({ title: "Informe o título", variant: "destructive" }); return; }
            onSave({ ...form, objective_scope: "strategic" });
          }}><Save className="h-4 w-4 mr-1" />Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function StrategicObjectivesTab() {
  const { objectives, upsert, remove } = useQualityObjectives();

  const strategic = useMemo(
    () => (objectives ?? []).filter((o) => (o as any).objective_scope === "strategic"),
    [objectives]
  );
  const qualityLinked = useMemo(
    () => (objectives ?? []).filter((o) => (o as any).objective_scope !== "strategic" && (o as any).parent_objective_id),
    [objectives]
  );

  const [dialog, setDialog] = useState<{ open: boolean; initial: Partial<QualityObjective> | null }>({ open: false, initial: null });

  const childrenOf = (id: string) => qualityLinked.filter((c) => (c as any).parent_objective_id === id);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-base">
              <Target className="h-4 w-4" /> Objetivos Estratégicos
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Objetivos de alto nível da organização (não confundir com Objetivos da Qualidade). Devem estar ancorados na Missão, Visão e Valores.
            </p>
          </div>
          <Button size="sm" onClick={() => setDialog({ open: true, initial: null })}>
            <Plus className="h-4 w-4 mr-1" /> Novo objetivo
          </Button>
        </CardHeader>
      </Card>

      {strategic.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            Nenhum objetivo estratégico cadastrado.
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 gap-3">
          {strategic.map((o) => {
            const children = childrenOf(o.id);
            const horizon = HORIZON_OPTIONS.find((h) => h.value === (o as any).time_horizon)?.label;
            const link = LINK_OPTIONS.find((l) => l.value === (o as any).linked_to)?.label;
            return (
              <Card key={o.id}>
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <CardTitle className="text-base flex items-center gap-2">
                        {o.code && <Badge variant="outline">{o.code}</Badge>}
                        <span className="truncate">{o.title}</span>
                      </CardTitle>
                      <div className="flex flex-wrap gap-1 mt-1">
                        {link && <Badge variant="secondary" className="text-[10px]">{link}</Badge>}
                        {horizon && <Badge variant="outline" className="text-[10px]">{horizon}</Badge>}
                        <Badge variant={o.status === "ativo" ? "default" : "outline"} className="text-[10px]">{o.status}</Badge>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <Button size="icon" variant="ghost" onClick={() => setDialog({ open: true, initial: o })}>
                        <Pencil className="h-3.5 w-3.5" />
                      </Button>
                      <Button size="icon" variant="ghost" className="text-destructive"
                        onClick={() => { if (confirm("Excluir objetivo?")) remove.mutate(o.id); }}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="text-xs space-y-2">
                  {o.description && <p className="text-muted-foreground">{o.description}</p>}
                  {o.target_value != null && (
                    <div><b>Meta:</b> {o.target_value} {o.unit ?? ""}</div>
                  )}
                  {children.length > 0 && (
                    <div className="border-t pt-2">
                      <div className="flex items-center gap-1 text-muted-foreground mb-1">
                        <GitBranch className="h-3 w-3" /> Desdobramentos ({children.length})
                      </div>
                      <ul className="list-disc list-inside space-y-0.5">
                        {children.map((c) => (
                          <li key={c.id} className="truncate">
                            {c.code && <span className="text-muted-foreground">[{c.code}] </span>}{c.title}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}

      <StrategicObjectiveDialog
        open={dialog.open}
        onClose={() => setDialog({ open: false, initial: null })}
        initial={dialog.initial}
        allStrategic={strategic}
        onSave={(p) => upsert.mutate(p as any, { onSuccess: () => setDialog({ open: false, initial: null }) })}
      />
    </div>
  );
}
