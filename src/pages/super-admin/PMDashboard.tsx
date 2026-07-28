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
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Skeleton } from "@/components/ui/skeleton";
import { Label } from "@/components/ui/label";
import {
  Sparkles, Zap, Target, GitBranch, Trophy, AlertTriangle, TrendingUp,
  Plus, RefreshCw, Trash2, Copy, ExternalLink, BrainCircuit, Layers, History, Code2,
} from "lucide-react";
import {
  usePMTickets, useRecalcRice, useUpdateTicketPM, useRegisterCodeChange,
  useNorthStarMetrics, useOSTNodes, useChangelog, useAIPerformance,
  useRefreshProductMetrics, usePMTicketLiveCounts, useOSTSeed, useSeedChangelog,
  type PMTicket, type NorthStarMetric, type OSTNode, type ChangelogEntry, type OSTSeedPlan,
  type AIPerfWindow,
} from "@/hooks/usePMDashboard";
import { BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip, CartesianGrid, AreaChart, Area } from "recharts";
import { toast } from "@/hooks/use-toast";
import { formatLocalDate } from "@/lib/utils";
import { RoadmapBoard } from "./RoadmapBoard";
import { PMHistoryTab } from "./PMHistoryTab";

const HORIZONS = [
  { value: "now", label: "Agora", color: "bg-red-500/10 text-red-700 border-red-300" },
  { value: "next", label: "Próximo", color: "bg-amber-500/10 text-amber-700 border-amber-300" },
  { value: "later", label: "Depois", color: "bg-blue-500/10 text-blue-700 border-blue-300" },
  { value: "icebox", label: "Gelo", color: "bg-slate-500/10 text-slate-700 border-slate-300" },
];

const ROADMAP_CATEGORIES = new Set(["feature_request", "improvement", "suggestion"]);

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
        <TabsList className="grid grid-cols-2 md:grid-cols-5 w-full">
          <TabsTrigger value="tickets">Tickets & Contexto</TabsTrigger>
          <TabsTrigger value="strategy">OST & North Star</TabsTrigger>
          <TabsTrigger value="priority">RICE & Roadmap</TabsTrigger>
          <TabsTrigger value="history">Histórico</TabsTrigger>
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
        <TabsContent value="history" className="space-y-4">
          <HistoryTabWrapper />
        </TabsContent>
        <TabsContent value="impact" className="space-y-4">
          <ImpactTab />
        </TabsContent>
      </Tabs>
    </div>
  );
}

function HistoryTabWrapper() {
  const [selected, setSelected] = useState<PMTicket | null>(null);
  return (
    <>
      <PMHistoryTab onOpen={setSelected} />
      <TicketDetailDialog ticket={selected} onClose={() => setSelected(null)} />
    </>
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
  const registerCodeChange = useRegisterCodeChange();
  if (!ticket) return null;

  const isRoadmapCategory = ROADMAP_CATEGORIES.has(ticket.category);

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
          <div className="flex justify-end">
            <Button
              size="sm"
              variant="outline"
              onClick={() => registerCodeChange.mutate(ticket)}
              disabled={registerCodeChange.isPending}
            >
              <Code2 className="h-4 w-4 mr-1" />
              {registerCodeChange.isPending ? "Registrando..." : "Registrar alteração de código"}
            </Button>
          </div>

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
              <Label>Roadmap</Label>
              {isRoadmapCategory ? (
                <Select value={ticket.roadmap_horizon ?? ""} onValueChange={(v) => update.mutate({ id: ticket.id, patch: { roadmap_horizon: v as any } })}>
                  <SelectTrigger><SelectValue placeholder="Selecionar..." /></SelectTrigger>
                  <SelectContent>
                    {HORIZONS.map((h) => <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              ) : (
                <div className="h-10 flex items-center rounded-md border px-3 text-sm text-muted-foreground bg-muted/40">
                  Correções de bug ficam fora do roadmap
                </div>
              )}
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
  const refresh = useRefreshProductMetrics();
  const liveTickets = usePMTicketLiveCounts();
  const [openMetric, setOpenMetric] = useState<Partial<NorthStarMetric> | null>(null);
  const [openNode, setOpenNode] = useState<Partial<OSTNode> | null>(null);
  const [seedOpen, setSeedOpen] = useState(false);

  // Auto-refresh product metrics if the latest snapshot is older than 6h
  useEffect(() => {
    const list = nsm.data ?? [];
    if (list.length === 0 || refresh.isPending) return;
    const latest = list.reduce((max, m) => {
      const t = m.updated_at ? new Date(m.updated_at).getTime() : 0;
      return t > max ? t : max;
    }, 0);
    const sixHoursAgo = Date.now() - 6 * 3600_000;
    if (latest > 0 && latest < sixHoursAgo) {
      refresh.mutate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [nsm.data]);


  return (
    <>
      <Card>
        <CardHeader className="flex-row justify-between items-center">
          <div>
            <CardTitle className="flex items-center gap-2"><Target className="h-5 w-5" /> Saúde do produto — North Star</CardTitle>
            <CardDescription>
              Métricas de adoção, engajamento e confiabilidade do Arrow. Não confundir com KPIs operacionais dos clientes.
            </CardDescription>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => refresh.mutate()} disabled={refresh.isPending}>
              <RefreshCw className={`h-4 w-4 mr-1 ${refresh.isPending ? "animate-spin" : ""}`} />
              {refresh.isPending ? "Atualizando..." : "Atualizar com Marina"}
            </Button>
            <Button size="sm" onClick={() => setOpenMetric({})}><Plus className="h-4 w-4 mr-1" /> Nova métrica</Button>
          </div>
        </CardHeader>
        <CardContent>
          {nsm.isLoading ? <Skeleton className="h-24 w-full" /> : (
            <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
              {(nsm.data ?? []).map((m) => {
                const liveVal = m.metric_key && liveTickets.data ? liveTickets.data[m.metric_key] : undefined;
                const displayVal = liveVal !== undefined ? liveVal : m.current_value;
                const isLive = liveVal !== undefined;
                return (
                <button key={m.id} onClick={() => setOpenMetric(m)} className="text-left p-4 border rounded-lg hover:bg-muted/40 transition">
                  <div className="flex items-center gap-2">
                    <div className="text-sm text-muted-foreground flex-1">{m.name}</div>
                    {isLive ? (
                      <Badge variant="outline" className="text-[10px] border-emerald-400 text-emerald-700">live</Badge>
                    ) : m.metric_key && (
                      <Badge variant="outline" className="text-[10px]">auto</Badge>
                    )}
                  </div>
                  <div className="text-2xl font-bold mt-1">
                    {displayVal ?? "—"}<span className="text-sm text-muted-foreground ml-1">{m.unit}</span>
                  </div>
                  {m.target != null && (
                    <div className="text-xs text-muted-foreground mt-1">Meta: {m.target} {m.unit}</div>
                  )}
                  {m.description && <div className="text-xs mt-2 line-clamp-2">{m.description}</div>}
                </button>
                );
              })}

              {(nsm.data ?? []).length === 0 && !nsm.isLoading && (
                <div className="col-span-full text-center text-muted-foreground py-8">
                  Nenhuma métrica cadastrada. Ex.: "Usuários Ativos Semanais (WAU)", "Stickiness (WAU/MAU)", "Bugs reportados (7d)", "Adoção do módulo SGQ".
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
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={() => setSeedOpen(true)}>
              <Sparkles className="h-4 w-4 mr-1" /> Sugerir a partir de sinais
            </Button>
            <Button size="sm" onClick={() => setOpenNode({ node_type: "outcome" })}><Plus className="h-4 w-4 mr-1" /> Novo nó</Button>
          </div>
        </CardHeader>
        <CardContent>
          {ost.isLoading ? <Skeleton className="h-40 w-full" /> : <OSTTree nodes={ost.data ?? []} onEdit={setOpenNode} />}
        </CardContent>
      </Card>

      <MetricDialog value={openMetric} onClose={() => setOpenMetric(null)} nsm={nsm} />
      <OSTNodeDialog value={openNode} onClose={() => setOpenNode(null)} ost={ost} metrics={nsm.data ?? []} />
      <OSTSeedDialog open={seedOpen} onClose={() => setSeedOpen(false)} />
    </>
  );
}

function OSTTree({ nodes, onEdit }: { nodes: OSTNode[]; onEdit: (n: OSTNode) => void }) {
  const roots = nodes.filter((n) => !n.parent_id);
  if (nodes.length === 0) return <div className="text-center text-muted-foreground py-8">Árvore vazia. Comece por um Outcome de produto (ex.: "Elevar Stickiness a 40%" ou "Reduzir bugs por 100 sessões").</div>;
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

function OSTSeedDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { preview, apply } = useOSTSeed();
  const [plan, setPlan] = useState<OSTSeedPlan | null>(null);
  const [counts, setCounts] = useState<any>(null);

  useEffect(() => {
    if (open) {
      setPlan(null);
      setCounts(null);
      preview.mutate(undefined, {
        onSuccess: (d) => {
          setPlan(d.plan);
          setCounts(d.counts);
        },
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  const handleApply = () => {
    apply.mutate(undefined, {
      onSuccess: () => onClose(),
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" /> Sugerir OST a partir de sinais
          </DialogTitle>
          <DialogDescription>
            Gera uma árvore inicial a partir das North Star Metrics e dos tickets em aberto. Nada é criado até você confirmar.
          </DialogDescription>
        </DialogHeader>

        {preview.isPending || !plan ? (
          <div className="py-8 text-center text-muted-foreground">
            <RefreshCw className="h-5 w-5 animate-spin inline mr-2" />
            Analisando sinais...
          </div>
        ) : (
          <>
            {counts && (
              <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
                <div className="border rounded p-2">
                  <div className="text-muted-foreground">Outcomes</div>
                  <div className="font-semibold">
                    +{counts.outcomes_new} novos <span className="text-muted-foreground">({counts.outcomes_existing} já existem)</span>
                  </div>
                </div>
                <div className="border rounded p-2">
                  <div className="text-muted-foreground">Opportunities</div>
                  <div className="font-semibold">
                    +{counts.opportunities_new} novos <span className="text-muted-foreground">({counts.opportunities_existing} já existem)</span>
                  </div>
                </div>
                <div className="border rounded p-2">
                  <div className="text-muted-foreground">Solutions</div>
                  <div className="font-semibold">
                    +{counts.solutions_new} novos <span className="text-muted-foreground">({counts.solutions_existing} já existem)</span>
                  </div>
                </div>
                <div className="border rounded p-2">
                  <div className="text-muted-foreground">Tickets analisados</div>
                  <div className="font-semibold">{counts.tickets_total}</div>
                </div>
              </div>
            )}

            <ScrollArea className="max-h-[50vh] pr-3">
              <div className="space-y-4 text-sm">
                <section>
                  <div className="font-medium mb-1 flex items-center gap-1"><Target className="h-4 w-4" /> Outcomes</div>
                  <ul className="space-y-1">
                    {plan.outcomes.map((o, i) => (
                      <li key={i} className="border rounded p-2 flex items-start gap-2">
                        {o.existing_id ? <Badge variant="secondary" className="text-[10px]">existe</Badge> : <Badge className="text-[10px]">novo</Badge>}
                        <span className="flex-1"><span className="font-medium">{o.title}</span>{o.description && <span className="text-muted-foreground"> — {o.description}</span>}</span>
                      </li>
                    ))}
                  </ul>
                </section>

                <section>
                  <div className="font-medium mb-1 flex items-center gap-1"><Sparkles className="h-4 w-4" /> Opportunities (por módulo)</div>
                  <ul className="space-y-1">
                    {plan.opportunities.map((o, i) => (
                      <li key={i} className="border rounded p-2 flex items-start gap-2">
                        {o.existing_id ? <Badge variant="secondary" className="text-[10px]">existe</Badge> : <Badge className="text-[10px]">novo</Badge>}
                        <span className="flex-1"><span className="font-medium">{o.title}</span> <span className="text-muted-foreground">— {o.description}</span></span>
                      </li>
                    ))}
                    {plan.opportunities.length === 0 && (
                      <li className="text-muted-foreground">Nenhum ticket em aberto para agrupar por módulo.</li>
                    )}
                  </ul>
                </section>

                <section>
                  <div className="font-medium mb-1 flex items-center gap-1"><Zap className="h-4 w-4" /> Solutions (a partir de feature requests)</div>
                  <ul className="space-y-1">
                    {plan.solutions.map((s, i) => (
                      <li key={i} className="border rounded p-2 flex items-start gap-2">
                        {s.existing_id ? <Badge variant="secondary" className="text-[10px]">existe</Badge> : <Badge className="text-[10px]">novo</Badge>}
                        <span className="flex-1">
                          <span className="font-medium">{s.title}</span>
                          <span className="text-muted-foreground"> → {s.parent_opportunity_title}</span>
                        </span>
                      </li>
                    ))}
                    {plan.solutions.length === 0 && (
                      <li className="text-muted-foreground">Nenhuma feature request aberta.</li>
                    )}
                  </ul>
                </section>
              </div>
            </ScrollArea>
          </>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={apply.isPending}>Cancelar</Button>
          <Button onClick={handleApply} disabled={!plan || apply.isPending}>
            {apply.isPending ? <><RefreshCw className="h-4 w-4 animate-spin mr-1" /> Aplicando...</> : "Aplicar sugestão"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
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
            <div><Label>Unidade</Label><Input value={form.unit ?? ""} onChange={(e) => setForm({ ...form, unit: e.target.value })} placeholder="%, usuários, tickets, dias, ..." /></div>
            <div><Label>Atual</Label><Input type="number" value={form.current_value ?? ""} onChange={(e) => setForm({ ...form, current_value: e.target.value === "" ? null : Number(e.target.value) })} /></div>
            <div><Label>Meta</Label><Input type="number" value={form.target ?? ""} onChange={(e) => setForm({ ...form, target: e.target.value === "" ? null : Number(e.target.value) })} /></div>
          </div>
          <div><Label>Fórmula/Notas</Label><Textarea value={form.formula_notes ?? ""} onChange={(e) => setForm({ ...form, formula_notes: e.target.value })} placeholder='ex.: COUNT(DISTINCT auth.users) com last_sign_in nos últimos 7 dias' /></div>
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
  const [selected, setSelected] = useState<PMTicket | null>(null);

  const scored = useMemo(
    () => tickets.filter((t) => t.rice_score != null).sort((a, b) => (b.rice_score ?? 0) - (a.rice_score ?? 0)),
    [tickets],
  );
  const roadmapTickets = useMemo(
    () => tickets.filter((t) => ROADMAP_CATEGORIES.has(t.category)),
    [tickets],
  );
  const unscored = tickets.filter((t) => t.rice_score == null);

  

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
                      {ROADMAP_CATEGORIES.has(t.category) ? (
                        <Select value={t.roadmap_horizon ?? ""} onValueChange={(v) => update.mutate({ id: t.id, patch: { roadmap_horizon: v as any } })}>
                          <SelectTrigger className="h-7 text-xs"><SelectValue placeholder="—" /></SelectTrigger>
                          <SelectContent>{HORIZONS.map((h) => <SelectItem key={h.value} value={h.value}>{h.label}</SelectItem>)}</SelectContent>
                        </Select>
                      ) : (
                        <Badge variant="outline" className="text-[10px]">Fora do roadmap</Badge>
                      )}
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
          <CardDescription>
            Arraste itens entre os horizontes. Expanda para ver descrição, defesa e o prompt pronto para o Lovable.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RoadmapBoard tickets={roadmapTickets} onOpen={setSelected} />
        </CardContent>
      </Card>
      <TicketDetailDialog ticket={selected} onClose={() => setSelected(null)} />
    </>
  );
}

// ==================== TAB 4: AI & Changelog ====================
function ImpactTab() {
  const [window, setWindow] = useState<AIPerfWindow>("30d");
  const { data: perf, isLoading } = useAIPerformance(window);
  const cl = useChangelog();
  const seed = useSeedChangelog();
  const nsm = useNorthStarMetrics();
  const [openEntry, setOpenEntry] = useState<Partial<ChangelogEntry> | null>(null);

  const windowLabel = window === "30d" ? "30 dias" : window === "90d" ? "90 dias" : "todo o período";

  return (
    <>
      <Card>
        <CardHeader className="flex-row items-start justify-between gap-4">
          <div>
            <CardTitle className="flex items-center gap-2"><BrainCircuit className="h-5 w-5" /> Performance da IA ({windowLabel})</CardTitle>
            <CardDescription>Monitoramento da Marina e demais agentes — dados reais das conversas, feedback e ações executadas</CardDescription>
          </div>
          <Select value={window} onValueChange={(v) => setWindow(v as AIPerfWindow)}>
            <SelectTrigger className="w-40"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="30d">Últimos 30 dias</SelectItem>
              <SelectItem value="90d">Últimos 90 dias</SelectItem>
              <SelectItem value="all">Todo o período</SelectItem>
            </SelectContent>
          </Select>
        </CardHeader>
        <CardContent>
          {isLoading ? <Skeleton className="h-24 w-full" /> : (
            <>
              <div className="grid gap-3 md:grid-cols-4">
                <StatCard label="Mensagens IA" value={perf?.totalMessages ?? 0} icon={BrainCircuit} accent="text-primary" />
                <StatCard label="Conversas" value={perf?.totalConversations ?? 0} icon={Sparkles} />
                <StatCard label="Usuários únicos" value={perf?.uniqueUsers ?? 0} icon={Trophy} />
                <StatCard label="Ações totais" value={perf?.totalActions ?? 0} icon={Zap} />
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Sucesso das ações</CardTitle></CardHeader>
                  <CardContent><div className="text-2xl font-bold text-green-600">{(perf?.actionSuccessRate ?? 0).toFixed(1)}%</div>
                    <div className="text-xs text-muted-foreground mt-1">{perf?.actionsExecuted ?? 0} ok · {perf?.actionsFailed ?? 0} falhas</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Resolutividade</CardTitle></CardHeader>
                  <CardContent><div className="text-2xl font-bold text-green-600">{(perf?.resolutionRate ?? 0).toFixed(1)}%</div>
                    <div className="text-xs text-muted-foreground mt-1">{perf?.positiveFeedback ?? 0} 👍 · {perf?.negativeFeedback ?? 0} 👎</div>
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Feedback total</CardTitle></CardHeader>
                  <CardContent><div className="text-2xl font-bold">{perf?.totalFeedback ?? 0}</div>
                    {(perf?.totalFeedback ?? 0) === 0 && <div className="text-xs text-muted-foreground mt-1">Sem feedback ainda — coletado após 👍/👎 no chat</div>}
                  </CardContent>
                </Card>
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Agentes ativos</CardTitle></CardHeader>
                  <CardContent>
                    <div className="flex flex-wrap gap-1">
                      {(perf?.agents ?? []).map((a: any) => <Badge key={a.id} variant="outline">{a.name}</Badge>)}
                    </div>
                  </CardContent>
                </Card>
              </div>

              {(perf?.messagesByDay?.length ?? 0) > 0 && (
                <Card className="mt-4">
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Mensagens por dia</CardTitle></CardHeader>
                  <CardContent>
                    <ResponsiveContainer width="100%" height={180}>
                      <AreaChart data={perf?.messagesByDay ?? []}>
                        <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                        <Tooltip />
                        <Area type="monotone" dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} />
                      </AreaChart>
                    </ResponsiveContainer>
                  </CardContent>
                </Card>
              )}

              <div className="grid md:grid-cols-2 gap-3 mt-4">
                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Top ferramentas usadas pela Marina</CardTitle></CardHeader>
                  <CardContent>
                    {(perf?.topTools?.length ?? 0) === 0 ? (
                      <div className="text-sm text-muted-foreground">Nenhuma ação registrada nesta janela.</div>
                    ) : (
                      <table className="w-full text-sm">
                        <thead className="text-xs text-muted-foreground">
                          <tr><th className="text-left py-1">Ferramenta</th><th className="text-right">Uso</th><th className="text-right">Sucesso</th></tr>
                        </thead>
                        <tbody>
                          {(perf?.topTools ?? []).map((t) => (
                            <tr key={t.tool_name} className="border-t">
                              <td className="py-1 font-mono text-xs">{t.tool_name}</td>
                              <td className="text-right">{t.total}</td>
                              <td className="text-right">{t.rate.toFixed(0)}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </CardContent>
                </Card>

                <Card>
                  <CardHeader className="pb-2"><CardTitle className="text-sm">Mensagens por agente</CardTitle></CardHeader>
                  <CardContent>
                    {(perf?.messagesByAgent?.length ?? 0) === 0 ? (
                      <div className="text-sm text-muted-foreground">Sem mensagens nesta janela.</div>
                    ) : (
                      <div className="space-y-2">
                        {(perf?.messagesByAgent ?? []).map((a) => (
                          <div key={a.agent_id} className="flex items-center justify-between text-sm">
                            <span className="truncate">{a.name}</span>
                            <Badge variant="outline">{a.count}</Badge>
                          </div>
                        ))}
                      </div>
                    )}
                  </CardContent>
                </Card>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex-row justify-between items-center">
          <div>
            <CardTitle>Changelog de Impacto</CardTitle>
            <CardDescription>Cada implementação vinculada à métrica que ela deveria mover</CardDescription>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" disabled={seed.isPending} onClick={() => seed.mutate()}>
              <RefreshCw className={`h-4 w-4 mr-1 ${seed.isPending ? "animate-spin" : ""}`} /> Sincronizar do histórico
            </Button>
            <Button size="sm" onClick={() => setOpenEntry({ released_at: new Date().toISOString() })}><Plus className="h-4 w-4 mr-1" /> Nova entrada</Button>
          </div>
        </CardHeader>
        <CardContent>
          {cl.isLoading ? <Skeleton className="h-40 w-full" /> : (
            <div className="space-y-3">
              {(cl.data ?? []).map((e) => (
                <button key={e.id} onClick={() => setOpenEntry(e)} className="w-full text-left border rounded-lg p-4 hover:bg-muted/40">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1">
                      <div className="font-medium">{e.title}</div>
                      {e.description && <div className="text-sm text-muted-foreground mt-1 whitespace-pre-line line-clamp-4">{e.description}</div>}
                      <div className="flex flex-wrap items-center gap-2 mt-2">
                        {(e.impacted_modules ?? []).map((m) => (
                          <Badge key={m} variant="secondary" className="text-xs">{m}</Badge>
                        ))}
                        {(e.related_ticket_ids?.length ?? 0) > 0 && (
                          <Badge variant="outline" className="text-xs">{e.related_ticket_ids!.length} ticket(s) vinculado(s)</Badge>
                        )}
                        {e.metric_before != null && e.metric_after != null && (
                          <span className="text-xs flex items-center gap-1"><TrendingUp className="h-3 w-3" />{e.metric_before} → <strong className="text-primary">{e.metric_after}</strong></span>
                        )}
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground whitespace-nowrap">{formatLocalDate(e.released_at)}</div>
                  </div>
                </button>
              ))}
              {(cl.data ?? []).length === 0 && !cl.isLoading && (
                <div className="text-center text-muted-foreground py-8">
                  Nenhuma entrada. Clique em <strong>"Sincronizar do histórico"</strong> para gerar releases a partir do log de atividades, ou crie uma manualmente.
                </div>
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
