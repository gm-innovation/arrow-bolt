import { useState, useMemo, useEffect } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Sparkles, Zap, Target, GitBranch, Trophy, AlertTriangle, TrendingUp,
  Plus, RefreshCw, Trash2, Copy, ExternalLink, BrainCircuit, Layers,
} from "lucide-react";
import {
  usePMTickets, useRecalcRice, useUpdateTicketPM,
  useNorthStarMetrics, useOSTNodes, useChangelog, useAIPerformance,
  type PMTicket, type NorthStarMetric, type OSTNode, type ChangelogEntry,
} from "@/hooks/usePMDashboard";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid } from "recharts";
import { toast } from "@/hooks/use-toast";
import { formatLocalDate } from "@/lib/utils";

const HORIZONS = [
  { value: "now", label: "Agora", color: "bg-red-500/10 text-red-700 border-red-300" },
  { value: "next", label: "Próximo", color: "bg-amber-500/10 text-amber-700 border-amber-300" },
  { value: "later", label: "Depois", color: "bg-blue-500/10 text-blue-700 border-blue-300" },
  { value: "icebox", label: "Gelo", color: "bg-slate-500/10 text-slate-700 border-slate-300" },
];

const NODE_TYPES = [
  { value: "outcome", label: "Objetivo (Outcome)", icon: Target },
  { value: "opportunity", label: "Oportunidade", icon: Sparkles },
  { value: "solution", label: "Solução", icon: Zap },
  { value: "experiment", label: "Experimento", icon: BrainCircuit },
];

export default function PMDashboard() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold flex items-center gap-2">
          <Layers className="h-7 w-7 text-primary" />
          Dashboard de PM
        </h1>
        <p className="text-muted-foreground">
          Inteligência de produto do Arrow: priorização, descoberta e impacto — powered by Marina
        </p>
      </div>

      <Tabs defaultValue="tickets" className="space-y-4">
        <TabsList className="grid grid-cols-2 md:grid-cols-4 w-full">
          <TabsTrigger value="tickets">Tickets & Contexto</TabsTrigger>
          <TabsTrigger value="strategy">OST & North Star</TabsTrigger>
          <TabsTrigger value="priority">RICE & Roadmap</TabsTrigger>
          <TabsTrigger value="impact">IA & Impacto</TabsTrigger>
        </TabsList>

        <TabsContent value="tickets" className="space-y-4">
          <TicketsTab />
        </TabsContent>
        <TabsContent value="strategy" className="space-y-4">
          <StrategyTab />
        </TabsContent>
        <TabsContent value="priority" className="space-y-4">
          <PriorityTab />
        </TabsContent>
        <TabsContent value="impact" className="space-y-4">
          <ImpactTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

// ==================== TAB 1: Tickets & Blast Radius ====================
function TicketsTab() {
  const { data: tickets = [], isLoading } = usePMTickets();
  const [selected, setSelected] = useState<PMTicket | null>(null);

  const blastData = useMemo(() => {
    const counts: Record<string, number> = {};
    tickets.forEach((t) => {
      const mod = t.impacted_module || t.suggested_area || "Não classificado";
      counts[mod] = (counts[mod] || 0) + 1;
    });
    return Object.entries(counts)
      .map(([module, count]) => ({ module, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 10);
  }, [tickets]);

  return (
    <>
      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Tickets (total)" value={tickets.length} icon={GitBranch} />
        <StatCard label="Abertos" value={tickets.filter((t) => t.status === "open").length} icon={AlertTriangle} accent="text-amber-600" />
        <StatCard label="Bugs" value={tickets.filter((t) => t.category === "bug").length} icon={AlertTriangle} accent="text-red-600" />
        <StatCard label="Com prompt IA" value={tickets.filter((t) => t.dev_prompt_status === "ready").length} icon={Sparkles} accent="text-primary" />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" /> Blast Radius — módulos mais impactados
          </CardTitle>
          <CardDescription>Distribuição de tickets por módulo do sistema</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-64 w-full" /> : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={blastData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="module" tick={{ fontSize: 11 }} angle={-25} textAnchor="end" height={80} />
                <YAxis tick={{ fontSize: 12 }} />
                <Tooltip />
                <Bar dataKey="count" fill="hsl(var(--primary))" name="Tickets" />
              </BarChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Central Agêntica de Tickets</CardTitle>
          <CardDescription>Tickets processados pela Marina — resumo, área e prompt de execução prontos</CardDescription>
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[500px]">
            <div className="divide-y">
              {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="p-4"><Skeleton className="h-16 w-full" /></div>
              )) : tickets.map((t) => (
                <button key={t.id} onClick={() => setSelected(t)}
                  className="w-full text-left p-4 hover:bg-muted/40 transition-colors">
                  <div className="flex items-start justify-between gap-4">
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap mb-1">
                        <span className="font-mono text-xs text-muted-foreground">#{t.ticket_number}</span>
                        <Badge variant="outline">{t.category}</Badge>
                        <Badge variant={t.status === "open" ? "default" : "secondary"}>{t.status}</Badge>
                        {t.impacted_module || t.suggested_area ? (
                          <Badge variant="outline" className="border-primary/30 text-primary">
                            {t.impacted_module || t.suggested_area}
                          </Badge>
                        ) : null}
                        {t.rice_score != null && (
                          <Badge className="bg-primary/10 text-primary border-primary/30" variant="outline">
                            RICE {t.rice_score}
                          </Badge>
                        )}
                      </div>
                      <div className="font-medium truncate">{t.title}</div>
                      <div className="text-xs text-muted-foreground line-clamp-1 mt-0.5">
                        {t.ai_summary || t.description}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground shrink-0">{formatLocalDate(t.created_at)}</div>
                  </div>
                </button>
              ))}
              {!isLoading && tickets.length === 0 && (
                <div className="p-8 text-center text-muted-foreground">Nenhum ticket ainda.</div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      <TicketDetailDialog ticket={selected} onClose={() => setSelected(null)} />
    </>
  );
}

function TicketDetailDialog({ ticket, onClose }: { ticket: PMTicket | null; onClose: () => void }) {
  const recalc = useRecalcRice();
  const update = useUpdateTicketPM();
  if (!ticket) return null;

  return (
    <Dialog open={!!ticket} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>#{ticket.ticket_number} — {ticket.title}</DialogTitle>
          <DialogDescription className="flex gap-2 flex-wrap pt-1">
            <Badge>{ticket.category}</Badge>
            <Badge variant="secondary">{ticket.status}</Badge>
            <Badge variant="outline">{ticket.user_role}</Badge>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div>
            <Label>Descrição</Label>
            <div className="text-sm mt-1 whitespace-pre-wrap p-3 bg-muted/40 rounded">{ticket.description}</div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Módulo impactado</Label>
              <Input value={ticket.impacted_module ?? ticket.suggested_area ?? ""}
                onChange={(e) => update.mutate({ id: ticket.id, patch: { impacted_module: e.target.value } })}
                placeholder="ex.: OS, RH/DP, Comercial/CRM, SGQ, Financeiro, Suprimentos, Corporativo, Marina (IA)" />
            </div>
            <div>
              <Label>Horizonte Roadmap</Label>
              <Select value={ticket.roadmap_horizon ?? ""} onValueChange={(v) => update.mutate({ id: ticket.id, patch: { roadmap_horizon: v as any } })}>
                <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                <SelectContent>
                  {HORIZONS.map((h) => <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <Label className="text-base">RICE Score {ticket.rice_score != null && <span className="ml-2 text-primary">{ticket.rice_score}</span>}</Label>
              <Button size="sm" onClick={() => recalc.mutate(ticket.id)} disabled={recalc.isPending}>
                <Sparkles className="h-4 w-4 mr-1" />
                {recalc.isPending ? "Calculando..." : "Recalcular com IA"}
              </Button>
            </div>
            <div className="grid grid-cols-4 gap-2 text-sm">
              <RiceCell label="Reach" value={ticket.reach} />
              <RiceCell label="Impact" value={ticket.impact} />
              <RiceCell label="Confidence" value={ticket.confidence} />
              <RiceCell label="Effort" value={ticket.effort} />
            </div>
            {ticket.rice_rationale && (
              <p className="text-xs text-muted-foreground mt-2 italic">{ticket.rice_rationale}</p>
            )}
          </div>

          {ticket.dev_prompt && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <Label>Prompt de execução (Lovable)</Label>
                <Button size="sm" variant="ghost" onClick={() => {
                  navigator.clipboard.writeText(ticket.dev_prompt!);
                  toast({ title: "Copiado" });
                }}>
                  <Copy className="h-4 w-4 mr-1" /> Copiar
                </Button>
              </div>
              <Textarea readOnly value={ticket.dev_prompt} className="font-mono text-xs h-48" />
            </div>
          )}

          {ticket.suggested_files && Array.isArray(ticket.suggested_files) && ticket.suggested_files.length > 0 && (
            <div>
              <Label>Arquivos sugeridos</Label>
              <div className="flex flex-wrap gap-1 mt-1">
                {ticket.suggested_files.map((f: string, i: number) => (
                  <Badge key={i} variant="outline" className="font-mono text-xs">{f}</Badge>
                ))}
              </div>
            </div>
          )}

          {ticket.page_url && (
            <div className="text-xs text-muted-foreground flex items-center gap-1">
              <ExternalLink className="h-3 w-3" /> {ticket.page_url}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function RiceCell({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="border rounded p-2 text-center">
      <div className="text-xs text-muted-foreground">{label}</div>
      <div className="text-xl font-bold">{value ?? "—"}</div>
    </div>
  );
}

function StatCard({ label, value, icon: Icon, accent }: { label: string; value: number; icon: any; accent?: string }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
        <Icon className={`h-4 w-4 ${accent ?? "text-muted-foreground"}`} />
      </CardHeader>
      <CardContent><div className="text-2xl font-bold">{value}</div></CardContent>
    </Card>
  );
}

// ==================== TAB 2: OST & North Star ====================
function StrategyTab() {
  const nsm = useNorthStarMetrics();
  const ost = useOSTNodes();
  const [openMetric, setOpenMetric] = useState<Partial<NorthStarMetric> | null>(null);
  const [openNode, setOpenNode] = useState<Partial<OSTNode> | null>(null);

  return (
    <>
      <Card>
        <CardHeader className="flex-row justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" /> Métricas North Star</CardTitle>
            <CardDescription>Indicadores principais de sucesso do produto</CardDescription>
          </div>
          <Button size="sm" onClick={() => setOpenMetric({})}><Plus className="h-4 w-4 mr-1" /> Nova métrica</Button>
        </CardHeader>
        <CardContent>
          {nsm.isLoading ? <Skeleton className="h-24 w-full" /> : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {(nsm.data ?? []).map((m) => (
                <button key={m.id} onClick={() => setOpenMetric(m)} className="text-left p-4 border rounded-lg hover:bg-muted/40 transition">
                  <div className="text-sm text-muted-foreground">{m.name}</div>
                  <div className="text-2xl font-bold mt-1">
                    {m.current_value ?? "—"}<span className="text-sm text-muted-foreground ml-1">{m.unit}</span>
                  </div>
                  {m.target != null && (
                    <div className="text-xs text-muted-foreground mt-1">Meta: {m.target} {m.unit}</div>
                  )}
                  {m.description && <div className="text-xs mt-2 line-clamp-2">{m.description}</div>}
                </button>
              ))}
              {(nsm.data ?? []).length === 0 && !nsm.isLoading && (
                <div className="col-span-full text-center text-muted-foreground py-8">
                  Nenhuma métrica cadastrada. Ex.: "OS concluídas no prazo", "Tempo médio de fechamento de OS", "Aderência documental SGQ", "Conformidade ASO ativa".
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2"><GitBranch className="h-5 w-5" /> Opportunity Solution Tree</CardTitle>
            <CardDescription>Conecte objetivos, dores dos usuários e soluções</CardDescription>
          </div>
          <Button size="sm" onClick={() => setOpenNode({ node_type: "outcome" })}><Plus className="h-4 w-4 mr-1" /> Novo nó</Button>
        </CardHeader>
        <CardContent>
          {ost.isLoading ? <Skeleton className="h-40 w-full" /> : <OSTTree nodes={ost.data ?? []} onEdit={setOpenNode} />}
        </CardContent>
      </Card>

      <MetricDialog value={openMetric} onClose={() => setOpenMetric(null)} nsm={nsm} />
      <OSTNodeDialog value={openNode} onClose={() => setOpenNode(null)} ost={ost} metrics={nsm.data ?? []} />
    </>
  );
}

function OSTTree({ nodes, onEdit }: { nodes: OSTNode[]; onEdit: (n: OSTNode) => void }) {
  const roots = nodes.filter((n) => !n.parent_id);
  if (nodes.length === 0) return <div className="text-center text-muted-foreground py-8">Árvore vazia. Comece por um Outcome do Arrow (ex.: "Aumentar OS entregues no prazo" ou "Reduzir retrabalho documental no SGQ").</div>;
  return <ul className="space-y-2">{roots.map((r) => <OSTBranch key={r.id} node={r} all={nodes} onEdit={onEdit} depth={0} />)}</ul>;
}

function OSTBranch({ node, all, onEdit, depth }: { node: OSTNode; all: OSTNode[]; onEdit: (n: OSTNode) => void; depth: number }) {
  const children = all.filter((n) => n.parent_id === node.id);
  const typeInfo = NODE_TYPES.find((t) => t.value === node.node_type);
  const Icon = typeInfo?.icon ?? Sparkles;
  return (
    <li style={{ marginLeft: depth * 16 }}>
      <button onClick={() => onEdit(node)} className="w-full text-left p-3 border rounded hover:bg-muted/40 flex items-start gap-2">
        <Icon className="h-4 w-4 mt-0.5 text-primary shrink-0" />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[10px]">{typeInfo?.label}</Badge>
            <span className="font-medium">{node.title}</span>
          </div>
          {node.description && <div className="text-xs text-muted-foreground mt-1 line-clamp-2">{node.description}</div>}
        </div>
      </button>
      {children.length > 0 && (
        <ul className="mt-2 space-y-2 border-l-2 border-muted pl-3">
          {children.map((c) => <OSTBranch key={c.id} node={c} all={all} onEdit={onEdit} depth={depth + 1} />)}
        </ul>
      )}
    </li>
  );
}

function MetricDialog({ value, onClose, nsm }: { value: Partial<NorthStarMetric> | null; onClose: () => void; nsm: ReturnType<typeof useNorthStarMetrics> }) {
  const [form, setForm] = useState<Partial<NorthStarMetric>>({});
  useEffect(() => { setForm(value ?? {}); }, [value]);
  if (!value) return null;
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>{value.id ? "Editar Métrica" : "Nova Métrica"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Nome</Label><Input value={form.name ?? ""} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
          <div><Label>Descrição</Label><Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div className="grid grid-cols-3 gap-2">
            <div><Label>Unidade</Label><Input value={form.unit ?? ""} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="min, %, ..." /></div>
            <div><Label>Atual</Label><Input type="number" value={form.current_value ?? ""} onChange={(e) => setForm({ ...form, current_value: e.target.value === "" ? null : Number(e.target.value) })} /></div>
            <div><Label>Meta</Label><Input type="number" value={form.target ?? ""} onChange={(e) => setForm({ ...form, target: e.target.value === "" ? null : Number(e.target.value) })} /></div>
          </div>
          <div><Label>Fórmula/Notas</Label><Textarea value={form.formula_notes ?? ""} onChange={(e) => setForm({ ...form, formula_notes: e.target.value })} /></div>
        </div>
        <DialogFooter className="gap-2">
          {value.id && <Button variant="destructive" onClick={() => { nsm.remove.mutate(value.id!); onClose(); }}><Trash2 className="h-4 w-4 mr-1" /> Excluir</Button>}
          <Button onClick={() => { nsm.upsert.mutate(form, { onSuccess: onClose }); }}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OSTNodeDialog({ value, onClose, ost, metrics }: { value: Partial<OSTNode> | null; onClose: () => void; ost: ReturnType<typeof useOSTNodes>; metrics: NorthStarMetric[] }) {
  const [form, setForm] = useState<Partial<OSTNode>>({});
  useEffect(() => { setForm(value ?? {}); }, [value]);
  if (!value) return null;
  const possibleParents = (ost.data ?? []).filter((n) => n.id !== value.id);
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent>
        <DialogHeader><DialogTitle>{value.id ? "Editar Nó" : "Novo Nó da OST"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Tipo</Label>
            <Select value={form.node_type} onValueChange={(v: any) => setForm({ ...form, node_type: v })}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{NODE_TYPES.map((t) => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Título</Label><Input value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>Descrição</Label><Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div>
            <Label>Nó pai (opcional)</Label>
            <Select value={form.parent_id ?? "none"} onValueChange={(v) => setForm({ ...form, parent_id: v === "none" ? null : v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhum (raiz)</SelectItem>
                {possibleParents.map((p) => <SelectItem key={p.id} value={p.id}>{p.title}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          {form.node_type === "outcome" && (
            <div>
              <Label>Métrica North Star vinculada</Label>
              <Select value={form.north_star_metric_id ?? "none"} onValueChange={(v) => setForm({ ...form, north_star_metric_id: v === "none" ? null : v })}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Nenhuma</SelectItem>
                  {metrics.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
        <DialogFooter className="gap-2">
          {value.id && <Button variant="destructive" onClick={() => { ost.remove.mutate(value.id!); onClose(); }}><Trash2 className="h-4 w-4 mr-1" /> Excluir</Button>}
          <Button onClick={() => { ost.upsert.mutate(form, { onSuccess: onClose }); }}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ==================== TAB 3: RICE & Roadmap ====================
function PriorityTab() {
  const { data: tickets = [], isLoading } = usePMTickets();
  const recalc = useRecalcRice();
  const update = useUpdateTicketPM();

  const scored = useMemo(
    () => tickets.filter((t) => t.rice_score != null).sort((a, b) => (b.rice_score ?? 0) - (a.rice_score ?? 0)),
    [tickets],
  );
  const unscored = tickets.filter((t) => t.rice_score == null);

  const byHorizon = (h: string) => tickets.filter((t) => t.roadmap_horizon === h);

  const isQuickWin = (t: PMTicket) => (t.impact ?? 0) >= 4 && (t.effort ?? 5) <= 2;

  return (
    <>
      <Card>
        <CardHeader className="flex-row justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2"><Trophy className="h-5 w-5" /> Priorização RICE</CardTitle>
            <CardDescription>Reach × Impact × Confidence ÷ Effort — Quick Wins destacados</CardDescription>
          </div>
          {unscored.length > 0 && (
            <Button size="sm" variant="outline" onClick={async () => {
              toast({ title: `Calculando ${unscored.length} tickets...` });
              for (const t of unscored.slice(0, 10)) {
                try { await recalc.mutateAsync(t.id); } catch { /* skip */ }
              }
            }}>
              <Sparkles className="h-4 w-4 mr-1" /> Calcular pendentes ({unscored.length})
            </Button>
          )}
        </CardHeader>
        <CardContent className="p-0">
          <ScrollArea className="h-[400px]">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-muted/60 backdrop-blur">
                <tr className="text-left">
                  <th className="p-2 w-12">#</th>
                  <th className="p-2">Título</th>
                  <th className="p-2 text-center">R</th>
                  <th className="p-2 text-center">I</th>
                  <th className="p-2 text-center">C</th>
                  <th className="p-2 text-center">E</th>
                  <th className="p-2 text-right">RICE</th>
                  <th className="p-2">Horizonte</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}><td colSpan={8} className="p-2"><Skeleton className="h-8 w-full" /></td></tr>
                )) : scored.map((t) => (
                  <tr key={t.id} className={`border-t ${isQuickWin(t) ? "bg-green-50/50 dark:bg-green-950/20" : ""}`}>
                    <td className="p-2 font-mono text-xs">{t.ticket_number}</td>
                    <td className="p-2">
                      <div className="flex items-center gap-2">
                        {isQuickWin(t) && <Badge className="bg-green-600 text-white">Quick Win</Badge>}
                        <span className="truncate max-w-md">{t.title}</span>
                      </div>
                    </td>
                    <td className="p-2 text-center">{t.reach}</td>
                    <td className="p-2 text-center">{t.impact}</td>
                    <td className="p-2 text-center">{t.confidence}</td>
                    <td className="p-2 text-center">{t.effort}</td>
                    <td className="p-2 text-right font-bold text-primary">{t.rice_score}</td>
                    <td className="p-2">
                      <Select value={t.roadmap_horizon ?? ""} onValueChange={(v) => update.mutate({ id: t.id, patch: { roadmap_horizon: v as any } })}>
                        <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                        <SelectContent>{HORIZONS.map((h) => <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>)}</SelectContent>
                      </Select>
                    </td>
                  </tr>
                ))}
                {!isLoading && scored.length === 0 && (
                  <tr><td colSpan={8} className="p-8 text-center text-muted-foreground">Nenhum ticket com RICE calculado ainda.</td></tr>
                )}
              </tbody>
            </table>
          </ScrollArea>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Roadmap — Now / Next / Later</CardTitle>
          <CardDescription>Horizontes em vez de datas rígidas</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 md:grid-cols-4">
            {HORIZONS.map((h) => {
              const items = byHorizon(h.value);
              return (
                <div key={h.value} className={`border rounded-lg p-3 ${h.color}`}>
                  <div className="font-semibold mb-2 flex items-center justify-between">
                    <span>{h.label}</span>
                    <Badge variant="outline">{items.length}</Badge>
                  </div>
                  <div className="space-y-2 max-h-72 overflow-y-auto">
                    {items.map((t) => (
                      <div key={t.id} className="bg-background rounded p-2 text-sm">
                        <div className="flex items-center justify-between gap-1">
                          <span className="font-mono text-[10px] text-muted-foreground">#{t.ticket_number}</span>
                          {t.rice_score != null && <span className="text-[10px] font-bold text-primary">{t.rice_score}</span>}
                        </div>
                        <div className="text-xs truncate">{t.title}</div>
                      </div>
                    ))}
                    {items.length === 0 && <div className="text-xs text-muted-foreground italic">Vazio</div>}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </>
  );
}

// ==================== TAB 4: AI & Changelog ====================
function ImpactTab() {
  const { data: perf, isLoading } = useAIPerformance();
  const cl = useChangelog();
  const nsm = useNorthStarMetrics();
  const [openEntry, setOpenEntry] = useState<Partial<ChangelogEntry> | null>(null);

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2"><BrainCircuit className="h-5 w-5" /> Performance da IA (30d)</CardTitle>
          <CardDescription>Monitoramento da Marina e do agente de leads</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-24 w-full" /> : (
            <div className="grid gap-3 md:grid-cols-4">
              <StatCard label="Mensagens IA" value={perf?.totalMessages ?? 0} icon={BrainCircuit} accent="text-primary" />
              <StatCard label="Feedbacks" value={perf?.totalFeedback ?? 0} icon={Sparkles} />
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Resolutividade</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold text-green-600">{(perf?.resolutionRate ?? 0).toFixed(1)}%</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Feedback negativo</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold text-red-600">{perf?.negativeFeedback ?? 0}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Ações executadas</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold">{perf?.actionsExecuted ?? 0}</div></CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2"><CardTitle className="text-sm">Ações falhas</CardTitle></CardHeader>
                <CardContent><div className="text-2xl font-bold text-amber-600">{perf?.actionsFailed ?? 0}</div></CardContent>
              </Card>
              <Card className="md:col-span-2">
                <CardHeader className="pb-2"><CardTitle className="text-sm">Agentes ativos</CardTitle></CardHeader>
                <CardContent>
                  <div className="flex flex-wrap gap-1">
                    {(perf?.agents ?? []).map((a: any) => <Badge key={a.id} variant="outline">{a.name}</Badge>)}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row justify-between items-center">
          <div>
            <CardTitle>Changelog de Impacto</CardTitle>
            <CardDescription>Cada implementação vinculada à métrica que ela deveria mover</CardDescription>
          </div>
          <Button size="sm" onClick={() => setOpenEntry({ released_at: new Date().toISOString() })}><Plus className="h-4 w-4 mr-1" /> Nova entrada</Button>
        </CardHeader>
        <CardContent>
          {cl.isLoading ? <Skeleton className="h-40 w-full" /> : (
            <div className="space-y-3">
              {(cl.data ?? []).map((e) => (
                <button key={e.id} onClick={() => setOpenEntry(e)} className="w-full text-left border rounded-lg p-4 hover:bg-muted/40">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="font-medium">{e.title}</div>
                      {e.description && <div className="text-sm text-muted-foreground mt-1">{e.description}</div>}
                      {e.metric_before != null && e.metric_after != null && (
                        <div className="text-xs mt-2 flex items-center gap-2">
                          <TrendingUp className="h-3 w-3" />
                          <span>{e.metric_before} → <strong className="text-primary">{e.metric_after}</strong></span>
                        </div>
                      )}
                    </div>
                    <div className="text-xs text-muted-foreground">{formatLocalDate(e.released_at)}</div>
                  </div>
                </button>
              ))}
              {(cl.data ?? []).length === 0 && !cl.isLoading && (
                <div className="text-center text-muted-foreground py-8">Nenhuma entrada. Registre a primeira implementação!</div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <ChangelogDialog value={openEntry} onClose={() => setOpenEntry(null)} cl={cl} metrics={nsm.data ?? []} />
    </>
  );
}

function ChangelogDialog({ value, onClose, cl, metrics }: { value: Partial<ChangelogEntry> | null; onClose: () => void; cl: ReturnType<typeof useChangelog>; metrics: NorthStarMetric[] }) {
  const [form, setForm] = useState<Partial<ChangelogEntry>>({});
  useEffect(() => { setForm(value ?? {}); }, [value]);
  if (!value) return null;
  return (
    <Dialog open onOpenChange={onClose}>
      <DialogContent className="max-w-xl">
        <DialogHeader><DialogTitle>{value.id ? "Editar entrada" : "Nova entrada"}</DialogTitle></DialogHeader>
        <div className="space-y-3">
          <div><Label>Título</Label><Input value={form.title ?? ""} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><Label>Descrição</Label><Textarea value={form.description ?? ""} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
          <div>
            <Label>Data de liberação</Label>
            <Input type="date" value={(form.released_at ?? "").slice(0, 10)}
              onChange={(e) => setForm({ ...form, released_at: new Date(e.target.value).toISOString() })} />
          </div>
          <div>
            <Label>Métrica impactada</Label>
            <Select value={form.north_star_metric_id ?? "none"} onValueChange={(v) => setForm({ ...form, north_star_metric_id: v === "none" ? null : v })}>
              <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Nenhuma</SelectItem>
                {metrics.map((m) => <SelectItem key={m.id} value={m.id}>{m.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Antes</Label><Input type="number" value={form.metric_before ?? ""} onChange={(e) => setForm({ ...form, metric_before: e.target.value === "" ? null : Number(e.target.value) })} /></div>
            <div><Label>Depois</Label><Input type="number" value={form.metric_after ?? ""} onChange={(e) => setForm({ ...form, metric_after: e.target.value === "" ? null : Number(e.target.value) })} /></div>
          </div>
          <div><Label>Módulos impactados (vírgula)</Label>
            <Input value={(form.impacted_modules ?? []).join(", ")}
              onChange={(e) => setForm({ ...form, impacted_modules: e.target.value.split(",").map((s) => s.trim()).filter(Boolean) })} />
          </div>
          <div><Label>Notas</Label><Textarea value={form.notes ?? ""} onChange={(e) => setForm({ ...form, notes: e.target.value })} /></div>
        </div>
        <DialogFooter className="gap-2">
          {value.id && <Button variant="destructive" onClick={() => { cl.remove.mutate(value.id!); onClose(); }}><Trash2 className="h-4 w-4 mr-1" /> Excluir</Button>}
          <Button onClick={() => cl.upsert.mutate(form, { onSuccess: onClose })}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
