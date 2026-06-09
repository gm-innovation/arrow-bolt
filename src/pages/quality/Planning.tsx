import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Target, Gauge, GitBranch, Plus, Trash2, LineChart, CheckCircle2, XCircle, Rocket, ShieldCheck,
} from "lucide-react";
import {
  useQualityObjectives,
  useQualityIndicators,
  useQualityIndicatorMeasurements,
  useQualityPlannedChanges,
  type QualityObjective,
  type QualityIndicator,
  type QualityPlannedChange,
  type ObjectiveStatus,
  type IndicatorFrequency,
  type IndicatorStatus,
  type PlannedChangeStatus,
  type PlannedChangeType,
} from "@/hooks/useQualityPlanning";
import { useQualityPolicy } from "@/hooks/useQualityPolicy";
import { useQualitySettings } from "@/hooks/useQualitySettings";
import { useControlledDocMeta } from "@/hooks/useControlledDocMeta";
import IndicatorStatusBadge, { computeIndicatorTrend } from "@/components/quality/IndicatorStatusBadge";
import EvaluateChangeEffectivenessDialog from "@/components/quality/EvaluateChangeEffectivenessDialog";
import ObjectiveTraceabilityPanel from "@/components/quality/ObjectiveTraceabilityPanel";
import QualityPdfPreviewButton from "@/components/quality/pdf/QualityPdfPreviewButton";
import QualityPlanPdf from "@/components/quality/pdf/QualityPlanPdf";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";

const OBJ_STATUS_LABEL: Record<ObjectiveStatus, { label: string; tone: string }> = {
  rascunho: { label: "Rascunho", tone: "border-muted-foreground text-muted-foreground" },
  ativo: { label: "Ativo", tone: "border-emerald-600 text-emerald-700" },
  concluido: { label: "Concluído", tone: "border-blue-600 text-blue-700" },
  cancelado: { label: "Cancelado", tone: "border-red-500 text-red-700" },
};

const IND_STATUS_LABEL: Record<IndicatorStatus, { label: string; tone: string }> = {
  ativo: { label: "Ativo", tone: "border-emerald-600 text-emerald-700" },
  pausado: { label: "Pausado", tone: "border-amber-500 text-amber-700" },
  arquivado: { label: "Arquivado", tone: "border-muted-foreground text-muted-foreground" },
};

const PCHG_STATUS_LABEL: Record<PlannedChangeStatus, { label: string; tone: string }> = {
  rascunho: { label: "Rascunho", tone: "border-muted-foreground text-muted-foreground" },
  em_analise: { label: "Em análise", tone: "border-amber-500 text-amber-700" },
  aprovada: { label: "Aprovada", tone: "border-emerald-600 text-emerald-700" },
  implementada: { label: "Implementada", tone: "border-blue-600 text-blue-700" },
  rejeitada: { label: "Rejeitada", tone: "border-red-500 text-red-700" },
};

const FREQS: { value: IndicatorFrequency; label: string }[] = [
  { value: "mensal", label: "Mensal" },
  { value: "trimestral", label: "Trimestral" },
  { value: "semestral", label: "Semestral" },
  { value: "anual", label: "Anual" },
];

const CHANGE_TYPES: { value: PlannedChangeType; label: string }[] = [
  { value: "processo", label: "Processo" },
  { value: "documento", label: "Documento" },
  { value: "recurso", label: "Recurso" },
  { value: "estrutura", label: "Estrutura" },
  { value: "sistema", label: "Sistema" },
  { value: "outro", label: "Outro" },
];

/* ---------------- OBJETIVOS ---------------- */

const ObjectiveDialog = ({
  open, onOpenChange, initial, onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Partial<QualityObjective>;
  onSave: (p: Partial<QualityObjective>) => void;
}) => {
  const { settings } = useQualitySettings();
  const [form, setForm] = useState<Partial<QualityObjective>>(initial ?? {});
  const set = (patch: Partial<QualityObjective>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Editar objetivo" : "Novo objetivo da qualidade"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Título</Label>
            <Input value={form.title ?? ""} onChange={(e) => set({ title: e.target.value })} />
          </div>
          <div>
            <Label>Código</Label>
            <Input value={form.code ?? ""} onChange={(e) => set({ code: e.target.value })} />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status ?? "rascunho"} onValueChange={(v) => set({ status: v as ObjectiveStatus })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(OBJ_STATUS_LABEL) as ObjectiveStatus[]).map((k) => (
                  <SelectItem key={k} value={k}>{OBJ_STATUS_LABEL[k].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Início do ciclo</Label>
            <Input type="date" value={form.period_start ?? ""} onChange={(e) => set({ period_start: e.target.value || null })} />
          </div>
          <div>
            <Label>Fim do ciclo</Label>
            <Input type="date" value={form.period_end ?? ""} onChange={(e) => set({ period_end: e.target.value || null })} />
          </div>
          <div>
            <Label>Meta (valor numérico)</Label>
            <Input
              type="number"
              value={form.target_value ?? ""}
              onChange={(e) => set({ target_value: e.target.value === "" ? null : Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>Unidade</Label>
            <Input value={form.unit ?? ""} onChange={(e) => set({ unit: e.target.value || null })} placeholder="%, NPS, h, ..." />
          </div>
          <div className="sm:col-span-2">
            <Label>Descrição</Label>
            <Textarea rows={3} value={form.description ?? ""} onChange={(e) => set({ description: e.target.value || null })} />
          </div>
          <div className="sm:col-span-2 border-t pt-3">
            <ObjectiveTraceabilityPanel objectiveId={initial?.id ?? null} />
          </div>
          <div className="sm:col-span-2 text-xs text-muted-foreground">
            Vinculado à Política da Qualidade vigente
            {settings?.quality_policy_version ? ` (versão ${settings.quality_policy_version})` : ""}.
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => { onSave(form); onOpenChange(false); }} disabled={!form.title}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const ObjectivesTab = () => {
  const { objectives, upsert, remove } = useQualityObjectives();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<QualityObjective | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Objetivos da qualidade</h3>
          <p className="text-xs text-muted-foreground">
            Objetivos operacionais do SGQ vinculados à Política. Não é BSC.
          </p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Novo objetivo
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Ciclo</TableHead>
                <TableHead>Meta</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {objectives.length === 0 && (
                <TableRow>
                  <TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">
                    Nenhum objetivo cadastrado.
                  </TableCell>
                </TableRow>
              )}
              {objectives.map((o) => (
                <TableRow key={o.id} className="cursor-pointer" onClick={() => { setEditing(o); setOpen(true); }}>
                  <TableCell className="font-mono text-xs">{o.code ?? "—"}</TableCell>
                  <TableCell>{o.title}</TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {o.period_start ? format(parseISO(o.period_start), "dd/MM/yy") : "—"}
                    {" → "}
                    {o.period_end ? format(parseISO(o.period_end), "dd/MM/yy") : "—"}
                  </TableCell>
                  <TableCell className="text-xs">
                    {o.target_value !== null ? `${o.target_value} ${o.unit ?? ""}` : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={OBJ_STATUS_LABEL[o.status].tone}>
                      {OBJ_STATUS_LABEL[o.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    <Button
                      size="icon"
                      variant="ghost"
                      onClick={(e) => { e.stopPropagation(); if (confirm("Remover objetivo?")) remove.mutate(o.id); }}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ObjectiveDialog
        open={open}
        onOpenChange={setOpen}
        initial={editing ?? undefined}
        onSave={(p) => upsert.mutate({ ...editing, ...p })}
      />
    </div>
  );
};

/* ---------------- INDICADORES ---------------- */

const MeasurementsDialog = ({
  open, onOpenChange, indicator,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  indicator: QualityIndicator | null;
}) => {
  const { measurements, add, remove } = useQualityIndicatorMeasurements(indicator?.id);
  const [form, setForm] = useState({ period_label: "", period_start: "", period_end: "", value: "", note: "" });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle>Medições — {indicator?.name}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-2 sm:grid-cols-5 items-end">
          <div className="sm:col-span-1">
            <Label className="text-xs">Período</Label>
            <Input value={form.period_label} onChange={(e) => setForm((f) => ({ ...f, period_label: e.target.value }))} placeholder="2026-Q1" />
          </div>
          <div>
            <Label className="text-xs">Início</Label>
            <Input type="date" value={form.period_start} onChange={(e) => setForm((f) => ({ ...f, period_start: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Fim</Label>
            <Input type="date" value={form.period_end} onChange={(e) => setForm((f) => ({ ...f, period_end: e.target.value }))} />
          </div>
          <div>
            <Label className="text-xs">Valor</Label>
            <Input type="number" value={form.value} onChange={(e) => setForm((f) => ({ ...f, value: e.target.value }))} />
          </div>
          <Button
            size="sm"
            onClick={() => {
              add.mutate({
                period_label: form.period_label,
                period_start: form.period_start,
                period_end: form.period_end,
                value: Number(form.value),
                note: form.note || null,
              });
              setForm({ period_label: "", period_start: "", period_end: "", value: "", note: "" });
            }}
            disabled={!form.period_label || !form.period_start || !form.period_end || form.value === ""}
          >
            <Plus className="h-4 w-4 mr-1" /> Registrar
          </Button>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Período</TableHead>
                  <TableHead>Intervalo</TableHead>
                  <TableHead>Valor</TableHead>
                  <TableHead>Meta</TableHead>
                  <TableHead className="w-12"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {measurements.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">
                      Sem medições.
                    </TableCell>
                  </TableRow>
                )}
                {measurements.map((m) => {
                  const hit =
                    indicator?.target_value != null ? Number(m.value) >= Number(indicator.target_value) : null;
                  return (
                    <TableRow key={m.id}>
                      <TableCell className="font-mono text-xs">{m.period_label}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">
                        {format(parseISO(m.period_start), "dd/MM/yy")} → {format(parseISO(m.period_end), "dd/MM/yy")}
                      </TableCell>
                      <TableCell className="font-medium">
                        {m.value} {indicator?.unit ?? ""}
                        {hit !== null && (
                          <Badge variant="outline" className={`ml-2 ${hit ? "border-emerald-600 text-emerald-700" : "border-red-500 text-red-700"}`}>
                            {hit ? "Atingiu" : "Abaixo"}
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-xs">
                        {indicator?.target_value != null ? `${indicator.target_value} ${indicator.unit ?? ""}` : "—"}
                      </TableCell>
                      <TableCell>
                        <Button size="icon" variant="ghost" onClick={() => remove.mutate(m.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </DialogContent>
    </Dialog>
  );
};

const IndicatorDialog = ({
  open, onOpenChange, initial, onSave, objectives,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Partial<QualityIndicator>;
  onSave: (p: Partial<QualityIndicator>) => void;
  objectives: QualityObjective[];
}) => {
  const [form, setForm] = useState<Partial<QualityIndicator>>(initial ?? {});
  const set = (patch: Partial<QualityIndicator>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Editar indicador" : "Novo indicador"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Nome</Label>
            <Input value={form.name ?? ""} onChange={(e) => set({ name: e.target.value })} />
          </div>
          <div>
            <Label>Código</Label>
            <Input value={form.code ?? ""} onChange={(e) => set({ code: e.target.value })} />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status ?? "ativo"} onValueChange={(v) => set({ status: v as IndicatorStatus })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(IND_STATUS_LABEL) as IndicatorStatus[]).map((k) => (
                  <SelectItem key={k} value={k}>{IND_STATUS_LABEL[k].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Frequência</Label>
            <Select value={form.frequency ?? "mensal"} onValueChange={(v) => set({ frequency: v as IndicatorFrequency })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {FREQS.map((f) => <SelectItem key={f.value} value={f.value}>{f.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Objetivo vinculado</Label>
            <Select
              value={form.objective_id ?? "__none__"}
              onValueChange={(v) => set({ objective_id: v === "__none__" ? null : v })}
            >
              <SelectTrigger><SelectValue placeholder="Sem vínculo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">Sem vínculo</SelectItem>
                {objectives.map((o) => <SelectItem key={o.id} value={o.id}>{o.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Meta</Label>
            <Input
              type="number"
              value={form.target_value ?? ""}
              onChange={(e) => set({ target_value: e.target.value === "" ? null : Number(e.target.value) })}
            />
          </div>
          <div>
            <Label>Unidade</Label>
            <Input value={form.unit ?? ""} onChange={(e) => set({ unit: e.target.value || null })} />
          </div>
          <div className="sm:col-span-2">
            <Label>Fórmula / método de cálculo</Label>
            <Textarea rows={2} value={form.formula ?? ""} onChange={(e) => set({ formula: e.target.value || null })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => { onSave(form); onOpenChange(false); }} disabled={!form.name}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const IndicatorTrendCell = ({ indicator }: { indicator: QualityIndicator }) => {
  const { data: ms = [] } = useQuery({
    queryKey: ["quality_indicator_measurements_trend", indicator.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_indicator_measurements" as any)
        .select("value, period_end")
        .eq("indicator_id", indicator.id)
        .order("period_end", { ascending: false })
        .limit(6);
      if (error) throw error;
      return (data ?? []) as unknown as { value: number; period_end: string }[];
    },
  });
  const trend = computeIndicatorTrend(indicator, ms);
  return <IndicatorStatusBadge trend={trend} />;
};

const IndicatorsTab = () => {
  const { indicators, upsert, remove } = useQualityIndicators();
  const { objectives } = useQualityObjectives();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<QualityIndicator | null>(null);
  const [measOpen, setMeasOpen] = useState(false);
  const [measFor, setMeasFor] = useState<QualityIndicator | null>(null);

  const objMap = useMemo(() => new Map(objectives.map((o) => [o.id, o.title])), [objectives]);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Indicadores</h3>
          <p className="text-xs text-muted-foreground">
            Indicadores vinculados a objetivos com meta, frequência e medições periódicas.
          </p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Novo indicador
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Objetivo</TableHead>
                <TableHead>Frequência</TableHead>
                <TableHead>Meta</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Farol</TableHead>
                <TableHead className="w-32"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {indicators.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                    Nenhum indicador cadastrado.
                  </TableCell>
                </TableRow>
              )}
              {indicators.map((i) => (
                <TableRow key={i.id} className="cursor-pointer" onClick={() => { setEditing(i); setOpen(true); }}>
                  <TableCell>
                    <div className="font-medium">{i.name}</div>
                    {i.code && <div className="font-mono text-xs text-muted-foreground">{i.code}</div>}
                  </TableCell>
                  <TableCell className="text-xs">{i.objective_id ? objMap.get(i.objective_id) ?? "—" : "—"}</TableCell>
                  <TableCell className="text-xs">{FREQS.find((f) => f.value === i.frequency)?.label}</TableCell>
                  <TableCell className="text-xs">
                    {i.target_value !== null ? `${i.target_value} ${i.unit ?? ""}` : "—"}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={IND_STATUS_LABEL[i.status].tone}>
                      {IND_STATUS_LABEL[i.status].label}
                    </Badge>
                  </TableCell>
                  <TableCell><IndicatorTrendCell indicator={i} /></TableCell>
                  <TableCell>
                    <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                      <Button size="sm" variant="ghost" onClick={() => { setMeasFor(i); setMeasOpen(true); }}>
                        <LineChart className="h-4 w-4 mr-1" /> Medições
                      </Button>
                      <Button size="icon" variant="ghost" onClick={() => { if (confirm("Remover indicador?")) remove.mutate(i.id); }}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <IndicatorDialog
        open={open}
        onOpenChange={setOpen}
        initial={editing ?? undefined}
        objectives={objectives}
        onSave={(p) => upsert.mutate({ ...editing, ...p })}
      />
      <MeasurementsDialog open={measOpen} onOpenChange={setMeasOpen} indicator={measFor} />
    </div>
  );
};

/* ---------------- MUDANÇAS PLANEJADAS ---------------- */

const ChangeDialog = ({
  open, onOpenChange, initial, onSave,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Partial<QualityPlannedChange>;
  onSave: (p: Partial<QualityPlannedChange>) => void;
}) => {
  const [form, setForm] = useState<Partial<QualityPlannedChange>>(initial ?? {});
  const set = (patch: Partial<QualityPlannedChange>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Editar mudança" : "Nova mudança planejada"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label>Título</Label>
            <Input value={form.title ?? ""} onChange={(e) => set({ title: e.target.value })} />
          </div>
          <div>
            <Label>Código</Label>
            <Input value={form.code ?? ""} onChange={(e) => set({ code: e.target.value || null })} />
          </div>
          <div>
            <Label>Tipo</Label>
            <Select value={form.change_type ?? "processo"} onValueChange={(v) => set({ change_type: v as PlannedChangeType })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {CHANGE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Planejada para</Label>
            <Input type="date" value={form.planned_for ?? ""} onChange={(e) => set({ planned_for: e.target.value || null })} />
          </div>
          <div>
            <Label>Status</Label>
            <Select value={form.status ?? "rascunho"} onValueChange={(v) => set({ status: v as PlannedChangeStatus })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(PCHG_STATUS_LABEL) as PlannedChangeStatus[]).map((k) => (
                  <SelectItem key={k} value={k}>{PCHG_STATUS_LABEL[k].label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="sm:col-span-2">
            <Label>Descrição</Label>
            <Textarea rows={3} value={form.description ?? ""} onChange={(e) => set({ description: e.target.value || null })} />
          </div>
          <div className="sm:col-span-2">
            <Label>Justificativa</Label>
            <Textarea rows={2} value={form.justification ?? ""} onChange={(e) => set({ justification: e.target.value || null })} />
          </div>
          <div className="sm:col-span-2">
            <Label>Avaliação de impacto</Label>
            <Textarea
              rows={3}
              value={form.impact_assessment ?? ""}
              onChange={(e) => set({ impact_assessment: e.target.value || null })}
              placeholder="Recursos, responsabilidades, riscos, integridade do SGQ..."
            />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={() => { onSave(form); onOpenChange(false); }} disabled={!form.title}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const EFFECT_LABELS: Record<string, { label: string; tone: string }> = {
  pendente: { label: "Pendente", tone: "border-muted-foreground text-muted-foreground" },
  eficaz: { label: "Eficaz", tone: "border-emerald-600 text-emerald-700" },
  parcial: { label: "Parcial", tone: "border-amber-500 text-amber-700" },
  nao_eficaz: { label: "Não eficaz", tone: "border-red-500 text-red-700" },
};

const ChangesTab = () => {
  const { changes, upsert, decide, remove } = useQualityPlannedChanges();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<QualityPlannedChange | null>(null);
  const [evalOpen, setEvalOpen] = useState(false);
  const [evalFor, setEvalFor] = useState<QualityPlannedChange | null>(null);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-semibold">Mudanças planejadas</h3>
          <p className="text-xs text-muted-foreground">
            Avaliação prévia e eficácia de mudanças no SGQ conforme ISO 9001 §6.3.
          </p>
        </div>
        <Button size="sm" onClick={() => { setEditing(null); setOpen(true); }}>
          <Plus className="h-4 w-4 mr-1" /> Nova mudança
        </Button>
      </div>

      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Prazo</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Eficácia</TableHead>
                <TableHead className="w-56"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {changes.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center text-sm text-muted-foreground py-8">
                    Nenhuma mudança registrada.
                  </TableCell>
                </TableRow>
              )}
              {changes.map((c) => {
                const ef = (c as any).effectiveness_status as string | null;
                return (
                  <TableRow key={c.id} className="cursor-pointer" onClick={() => { setEditing(c); setOpen(true); }}>
                    <TableCell className="font-mono text-xs">{c.code ?? "—"}</TableCell>
                    <TableCell>{c.title}</TableCell>
                    <TableCell className="text-xs">{CHANGE_TYPES.find((t) => t.value === c.change_type)?.label}</TableCell>
                    <TableCell className="text-xs text-muted-foreground">
                      {c.planned_for ? format(parseISO(c.planned_for), "dd/MM/yyyy") : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline" className={PCHG_STATUS_LABEL[c.status].tone}>
                        {PCHG_STATUS_LABEL[c.status].label}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {c.status === "implementada" ? (
                        <Badge variant="outline" className={EFFECT_LABELS[ef ?? "pendente"].tone}>
                          {EFFECT_LABELS[ef ?? "pendente"].label}
                        </Badge>
                      ) : (
                        <span className="text-xs text-muted-foreground">—</span>
                      )}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                        {(c.status === "em_analise" || c.status === "rascunho") && (
                          <>
                            <Button size="sm" variant="ghost" onClick={() => decide.mutate({ id: c.id, decision: "aprovada" })}>
                              <CheckCircle2 className="h-4 w-4 mr-1 text-emerald-600" /> Aprovar
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => decide.mutate({ id: c.id, decision: "rejeitada" })}>
                              <XCircle className="h-4 w-4 mr-1 text-red-600" /> Rejeitar
                            </Button>
                          </>
                        )}
                        {c.status === "aprovada" && (
                          <Button size="sm" variant="ghost" onClick={() => decide.mutate({ id: c.id, decision: "implementada" })}>
                            <Rocket className="h-4 w-4 mr-1 text-blue-600" /> Implementar
                          </Button>
                        )}
                        {c.status === "implementada" && (
                          <Button size="sm" variant="ghost" onClick={() => { setEvalFor(c); setEvalOpen(true); }}>
                            <ShieldCheck className="h-4 w-4 mr-1 text-emerald-600" /> Avaliar eficácia
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => { if (confirm("Remover mudança?")) remove.mutate(c.id); }}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <ChangeDialog
        open={open}
        onOpenChange={setOpen}
        initial={editing ?? undefined}
        onSave={(p) => upsert.mutate({ ...editing, ...p })}
      />
      <EvaluateChangeEffectivenessDialog
        open={evalOpen}
        onOpenChange={setEvalOpen}
        changeId={evalFor?.id ?? null}
        initial={evalFor as any}
      />
    </div>
  );
};

/* ---------------- Página ---------------- */

const Planning = () => {
  const [tab, setTab] = useState<"objectives" | "indicators" | "changes">("objectives");

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Target className="h-4 w-4" /> Planejamento da Qualidade
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Objetivos do SGQ, indicadores e mudanças planejadas (ISO 9001 §6). Vincule objetivos à Política da
            Qualidade e relacione indicadores e medições periódicas.
          </p>
        </CardContent>
      </Card>

      <Tabs value={tab} onValueChange={(v) => setTab(v as any)}>
        <TabsList>
          <TabsTrigger value="objectives"><Target className="h-4 w-4 mr-1" /> Objetivos</TabsTrigger>
          <TabsTrigger value="indicators"><Gauge className="h-4 w-4 mr-1" /> Indicadores</TabsTrigger>
          <TabsTrigger value="changes"><GitBranch className="h-4 w-4 mr-1" /> Mudanças planejadas</TabsTrigger>
        </TabsList>
        <TabsContent value="objectives" className="mt-4"><ObjectivesTab /></TabsContent>
        <TabsContent value="indicators" className="mt-4"><IndicatorsTab /></TabsContent>
        <TabsContent value="changes" className="mt-4"><ChangesTab /></TabsContent>
      </Tabs>
    </div>
  );
};

export default Planning;
