import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import {
  Card, CardContent, CardHeader, CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
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
  Sparkles, Plus, ExternalLink, AlertTriangle, Clock, UserX, Link2Off,
} from "lucide-react";
import {
  useQualityImprovements,
  ImprovementRow,
  ImprovementSource,
  ImprovementPriority,
  ImprovementEffectiveness,
} from "@/hooks/useQualityImprovements";
import { differenceInDays, parseISO } from "date-fns";

const SOURCE_LABELS: Record<ImprovementSource, string> = {
  ncr: "NCR",
  audit_finding: "Auditoria",
  review_output: "Análise Crítica",
  complaint: "Reclamação",
  manual: "Manual",
  risk: "Risco",
  supplier: "Fornecedor",
  device: "Instrumento",
};

const SOURCE_VARIANTS: Record<ImprovementSource, string> = {
  ncr: "bg-destructive/10 text-destructive border-destructive/30",
  audit_finding: "bg-amber-500/10 text-amber-700 border-amber-500/30",
  review_output: "bg-blue-500/10 text-blue-700 border-blue-500/30",
  complaint: "bg-orange-500/10 text-orange-700 border-orange-500/30",
  manual: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  risk: "bg-rose-500/10 text-rose-700 border-rose-500/30",
  supplier: "bg-sky-500/10 text-sky-700 border-sky-500/30",
  device: "bg-violet-500/10 text-violet-700 border-violet-500/30",
};

const PRIORITY_LABELS: Record<ImprovementPriority, string> = {
  high: "Alta",
  medium: "Média",
  low: "Baixa",
};

const STATUS_LABELS: Record<string, string> = {
  open: "Aberto",
  in_progress: "Em andamento",
  done: "Concluído",
  cancelled: "Cancelado",
};

const EFFECTIVENESS_LABELS: Record<ImprovementEffectiveness, string> = {
  pendente: "Pendente",
  eficaz: "Eficaz",
  ineficaz: "Ineficaz",
  nao_aplicavel: "N/A",
};

const EFFECTIVENESS_VARIANT: Record<ImprovementEffectiveness, string> = {
  pendente: "bg-muted text-muted-foreground",
  eficaz: "bg-emerald-500/10 text-emerald-700 border-emerald-500/30",
  ineficaz: "bg-destructive/10 text-destructive border-destructive/30",
  nao_aplicavel: "bg-muted text-muted-foreground",
};


const Improvements = () => {
  const { items, isLoading, createManual, generateActionPlan, verifyEffectiveness } = useQualityImprovements();

  const [filters, setFilters] = useState({
    source: "all",
    priority: "all",
    status: "open_only",
    plan: "all",
  });

  const [effDialog, setEffDialog] = useState<{ row: ImprovementRow | null; status: ImprovementEffectiveness; notes: string }>({
    row: null, status: "eficaz", notes: "",
  });


  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    title: "",
    description: "",
    category: "",
    priority: "medium" as ImprovementPriority,
    due_date: "",
  });

  const filtered = useMemo(() => {
    return items.filter((r) => {
      if (filters.source !== "all" && r.source !== filters.source) return false;
      if (filters.priority !== "all" && r.priority !== filters.priority) return false;
      if (filters.status === "open_only" && (r.status === "done" || r.status === "cancelled")) return false;
      if (filters.status !== "all" && filters.status !== "open_only" && r.status !== filters.status) return false;
      if (filters.plan === "with" && !r.action_plan_id) return false;
      if (filters.plan === "without" && r.action_plan_id) return false;
      return true;
    });
  }, [items, filters]);

  const kpis = useMemo(() => {
    const open = items.filter((r) => r.status !== "done" && r.status !== "cancelled");
    const today = new Date();
    const overdue = open.filter(
      (r) => r.due_date && differenceInDays(parseISO(r.due_date), today) < 0,
    ).length;
    const noOwner = open.filter((r) => !r.owner_user_id).length;
    const noPlan = open.filter((r) => !r.action_plan_id).length;
    return { total: open.length, overdue, noOwner, noPlan };
  }, [items]);

  const submit = async () => {
    if (!form.title.trim()) return;
    await createManual.mutateAsync({
      title: form.title.trim(),
      description: form.description || undefined,
      category: form.category || undefined,
      priority: form.priority,
      due_date: form.due_date || null,
    });
    setForm({ title: "", description: "", category: "", priority: "medium", due_date: "" });
    setOpen(false);
  };

  return (
    <div className="container mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold flex items-center gap-2">
            <Sparkles className="h-7 w-7 text-primary" />
            Melhorias Consolidadas
          </h1>
          <p className="text-muted-foreground mt-1">
            Fila única de oportunidades de melhoria do SGQ — origem NCR, Auditoria, Análise Crítica, Reclamações e sugestões manuais.
          </p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Nova melhoria
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Registrar melhoria manual</DialogTitle>
            </DialogHeader>
            <div className="space-y-3">
              <div>
                <Label>Título *</Label>
                <Input
                  value={form.title}
                  onChange={(e) => setForm({ ...form, title: e.target.value })}
                  placeholder="Ex.: Reduzir tempo de retrabalho na bancada"
                />
              </div>
              <div>
                <Label>Categoria</Label>
                <Input
                  value={form.category}
                  onChange={(e) => setForm({ ...form, category: e.target.value })}
                  placeholder="Ex.: Kaizen, Sugestão, 5S"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Prioridade</Label>
                  <Select
                    value={form.priority}
                    onValueChange={(v) => setForm({ ...form, priority: v as ImprovementPriority })}
                  >
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="high">Alta</SelectItem>
                      <SelectItem value="medium">Média</SelectItem>
                      <SelectItem value="low">Baixa</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Prazo</Label>
                  <Input
                    type="date"
                    value={form.due_date}
                    onChange={(e) => setForm({ ...form, due_date: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label>Descrição</Label>
                <Textarea
                  rows={4}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Contexto, ganho esperado, evidências…"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={submit} disabled={createManual.isPending}>
                {createManual.isPending ? "Registrando…" : "Registrar"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <KpiCard label="Abertas" value={kpis.total} icon={<Sparkles className="h-5 w-5" />} />
        <KpiCard label="Vencidas" value={kpis.overdue} icon={<AlertTriangle className="h-5 w-5 text-destructive" />} />
        <KpiCard label="Sem responsável" value={kpis.noOwner} icon={<UserX className="h-5 w-5 text-amber-600" />} />
        <KpiCard label="Sem plano de ação" value={kpis.noPlan} icon={<Link2Off className="h-5 w-5 text-muted-foreground" />} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            <div>
              <Label>Origem</Label>
              <Select value={filters.source} onValueChange={(v) => setFilters({ ...filters, source: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="ncr">NCR</SelectItem>
                  <SelectItem value="audit_finding">Auditoria</SelectItem>
                  <SelectItem value="review_output">Análise Crítica</SelectItem>
                  <SelectItem value="complaint">Reclamação</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prioridade</Label>
              <Select value={filters.priority} onValueChange={(v) => setFilters({ ...filters, priority: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="low">Baixa</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={filters.status} onValueChange={(v) => setFilters({ ...filters, status: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="open_only">Abertas (padrão)</SelectItem>
                  <SelectItem value="all">Todas</SelectItem>
                  <SelectItem value="open">Aberto</SelectItem>
                  <SelectItem value="in_progress">Em andamento</SelectItem>
                  <SelectItem value="done">Concluído</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Plano de ação</Label>
              <Select value={filters.plan} onValueChange={(v) => setFilters({ ...filters, plan: v })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="with">Com plano</SelectItem>
                  <SelectItem value="without">Sem plano</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>{filtered.length} oportunidade(s)</CardTitle>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground">Carregando…</p>
          ) : filtered.length === 0 ? (
            <p className="text-muted-foreground">Nenhuma melhoria encontrada com os filtros atuais.</p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Origem</TableHead>
                  <TableHead>Identificador</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead>Plano</TableHead>
                  <TableHead>Eficácia</TableHead>
                  <TableHead className="text-right">Ações</TableHead>

                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((row) => {
                  const overdue =
                    row.due_date &&
                    differenceInDays(parseISO(row.due_date), new Date()) < 0 &&
                    row.status !== "done";
                  return (
                    <TableRow key={`${row.source}-${row.id}`}>
                      <TableCell>
                        <Badge variant="outline" className={SOURCE_VARIANTS[row.source]}>
                          {SOURCE_LABELS[row.source]}
                        </Badge>
                      </TableCell>
                      <TableCell className="font-mono text-xs">{row.source_label}</TableCell>
                      <TableCell className="max-w-[320px] truncate" title={row.title}>{row.title}</TableCell>
                      <TableCell>{PRIORITY_LABELS[row.priority]}</TableCell>
                      <TableCell>{STATUS_LABELS[row.status] ?? row.status}</TableCell>
                      <TableCell>
                        {row.due_date ? (
                          <span className={overdue ? "text-destructive font-medium flex items-center gap-1" : ""}>
                            {overdue && <Clock className="h-3 w-3" />}
                            {new Date(row.due_date).toLocaleDateString("pt-BR")}
                          </span>
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.action_plan_id ? (
                          <Badge variant="secondary">Vinculado</Badge>
                        ) : (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => generateActionPlan.mutate(row)}
                            disabled={generateActionPlan.isPending}
                          >
                            Gerar
                          </Button>
                        )}
                      </TableCell>
                      <TableCell>
                        {row.source === "manual" ? (
                          <button
                            type="button"
                            onClick={() =>
                              setEffDialog({
                                row,
                                status: (row.effectiveness_status && row.effectiveness_status !== "pendente"
                                  ? row.effectiveness_status
                                  : "eficaz") as ImprovementEffectiveness,
                                notes: "",
                              })
                            }
                            className="cursor-pointer"
                            title="Avaliar eficácia"
                          >
                            <Badge
                              variant="outline"
                              className={EFFECTIVENESS_VARIANT[(row.effectiveness_status ?? "pendente") as ImprovementEffectiveness]}
                            >
                              {EFFECTIVENESS_LABELS[(row.effectiveness_status ?? "pendente") as ImprovementEffectiveness]}
                            </Badge>
                          </button>
                        ) : (
                          <span className="text-muted-foreground text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button asChild size="sm" variant="ghost">
                          <Link to={row.source_url}>
                            <ExternalLink className="h-4 w-4" />
                          </Link>
                        </Button>
                      </TableCell>

                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={!!effDialog.row} onOpenChange={(o) => !o && setEffDialog({ row: null, status: "eficaz", notes: "" })}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Verificar eficácia</DialogTitle>
          </DialogHeader>
          {effDialog.row && (
            <div className="space-y-3">
              <div className="rounded-md border bg-muted/40 p-3 text-sm">
                <p className="font-medium">{effDialog.row.title}</p>
                <p className="text-xs text-muted-foreground">{effDialog.row.source_label}</p>
              </div>
              <div>
                <Label>Resultado</Label>
                <Select
                  value={effDialog.status}
                  onValueChange={(v) => setEffDialog({ ...effDialog, status: v as ImprovementEffectiveness })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="eficaz">Eficaz</SelectItem>
                    <SelectItem value="ineficaz">Ineficaz</SelectItem>
                    <SelectItem value="nao_aplicavel">Não aplicável</SelectItem>
                    <SelectItem value="pendente">Voltar para pendente</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Notas da verificação</Label>
                <Textarea
                  rows={4}
                  value={effDialog.notes}
                  onChange={(e) => setEffDialog({ ...effDialog, notes: e.target.value })}
                  placeholder="Evidências consideradas, indicadores comparados, conclusão…"
                />
              </div>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setEffDialog({ row: null, status: "eficaz", notes: "" })}>
              Cancelar
            </Button>
            <Button
              onClick={async () => {
                if (!effDialog.row) return;
                await verifyEffectiveness.mutateAsync({
                  id: effDialog.row.id,
                  status: effDialog.status,
                  notes: effDialog.notes || null,
                });
                setEffDialog({ row: null, status: "eficaz", notes: "" });
              }}
              disabled={verifyEffectiveness.isPending}
            >
              {verifyEffectiveness.isPending ? "Salvando…" : "Registrar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};


const KpiCard = ({ label, value, icon }: { label: string; value: number; icon: React.ReactNode }) => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-3xl font-bold">{value}</p>
        </div>
        <div className="text-muted-foreground">{icon}</div>
      </div>
    </CardContent>
  </Card>
);

export default Improvements;
