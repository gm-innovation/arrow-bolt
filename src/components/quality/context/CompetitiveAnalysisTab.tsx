import { useEffect, useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Save, ExternalLink, Target, Shield, AlertCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  useQualityCompetitors,
  useQualityCompetitorAnalyses,
  useCompetitorAnalysisItems,
  type Competitor,
  type CompetitorAnalysis,
  type CompetitorAnalysisItem,
  type GapType,
} from "@/hooks/useQualityCompetitors";
import { useQualityRisks } from "@/hooks/useQualityRisks";
import { toast } from "@/hooks/use-toast";

const SIZE_OPTIONS = [
  { value: "small", label: "Pequeno" },
  { value: "medium", label: "Médio" },
  { value: "large", label: "Grande" },
];

const PRICE_OPTIONS = [
  { value: "low", label: "Baixo" },
  { value: "medium", label: "Médio" },
  { value: "high", label: "Alto" },
  { value: "premium", label: "Premium" },
];

const GAP_OPTIONS: { value: GapType; label: string; color: string }[] = [
  { value: "advantage", label: "Vantagem nossa", color: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-200" },
  { value: "parity", label: "Paridade", color: "bg-slate-100 text-slate-800 dark:bg-slate-800 dark:text-slate-200" },
  { value: "disadvantage", label: "Desvantagem", color: "bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200" },
  { value: "opportunity", label: "Oportunidade", color: "bg-sky-100 text-sky-800 dark:bg-sky-900/30 dark:text-sky-200" },
  { value: "threat", label: "Ameaça", color: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-200" },
];

function CompetitorDialog({
  open, onClose, initial, onSave,
}: {
  open: boolean;
  onClose: () => void;
  initial: Partial<Competitor> | null;
  onSave: (payload: Partial<Competitor>) => void;
}) {
  const [form, setForm] = useState<Partial<Competitor>>({});
  useEffect(() => { setForm(initial ?? {}); }, [initial, open]);

  const upd = (patch: Partial<Competitor>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{initial?.id ? "Editar concorrente" : "Novo concorrente"}</DialogTitle>
        </DialogHeader>
        <div className="grid gap-3">
          <div className="grid md:grid-cols-2 gap-3">
            <div className="md:col-span-2">
              <Label>Nome *</Label>
              <Input value={form.name ?? ""} onChange={(e) => upd({ name: e.target.value })} />
            </div>
            <div>
              <Label>Segmento / mercado</Label>
              <Input value={form.market_segment ?? ""} onChange={(e) => upd({ market_segment: e.target.value })} />
            </div>
            <div>
              <Label>Porte</Label>
              <Select value={form.size_category ?? ""} onValueChange={(v) => upd({ size_category: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{SIZE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Faixa de preço</Label>
              <Select value={form.price_range ?? ""} onValueChange={(v) => upd({ price_range: v })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>{PRICE_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Market share estimado (%)</Label>
              <Input type="number" min={0} max={100} step="0.01"
                value={form.estimated_market_share ?? ""} onChange={(e) => upd({ estimated_market_share: e.target.value ? Number(e.target.value) : null })} />
            </div>
            <div className="md:col-span-2">
              <Label>Website</Label>
              <Input value={form.website ?? ""} onChange={(e) => upd({ website: e.target.value })} placeholder="https://..." />
            </div>
            <div className="md:col-span-2">
              <Label>Posicionamento</Label>
              <Textarea rows={2} value={form.positioning ?? ""} onChange={(e) => upd({ positioning: e.target.value })} />
            </div>
            <div>
              <Label>Forças</Label>
              <Textarea rows={3} value={form.strengths ?? ""} onChange={(e) => upd({ strengths: e.target.value })} />
            </div>
            <div>
              <Label>Fraquezas</Label>
              <Textarea rows={3} value={form.weaknesses ?? ""} onChange={(e) => upd({ weaknesses: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Notas</Label>
              <Textarea rows={2} value={form.notes ?? ""} onChange={(e) => upd({ notes: e.target.value })} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => {
            if (!form.name?.trim()) { toast({ title: "Informe o nome", variant: "destructive" }); return; }
            onSave(form);
          }}><Save className="h-4 w-4 mr-1" />Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function AnalysisDialog({
  open, onClose, initial, onSave,
}: {
  open: boolean;
  onClose: () => void;
  initial: Partial<CompetitorAnalysis> | null;
  onSave: (payload: Partial<CompetitorAnalysis>) => void;
}) {
  const [form, setForm] = useState<Partial<CompetitorAnalysis>>({});
  useEffect(() => { setForm(initial ?? { status: "draft", performed_at: new Date().toISOString().slice(0,10) }); }, [initial, open]);
  const upd = (patch: Partial<CompetitorAnalysis>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial?.id ? "Editar análise" : "Nova análise competitiva"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div>
            <Label>Título *</Label>
            <Input value={form.title ?? ""} onChange={(e) => upd({ title: e.target.value })} />
          </div>
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <Label>Período</Label>
              <Input placeholder="Ex: 2026-Q1" value={form.analysis_period ?? ""} onChange={(e) => upd({ analysis_period: e.target.value })} />
            </div>
            <div>
              <Label>Data</Label>
              <Input type="date" value={form.performed_at ?? ""} onChange={(e) => upd({ performed_at: e.target.value })} />
            </div>
            <div>
              <Label>Próxima revisão</Label>
              <Input type="date" value={form.next_review_at ?? ""} onChange={(e) => upd({ next_review_at: e.target.value || null })} />
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status ?? "draft"} onValueChange={(v) => upd({ status: v as any })}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="draft">Rascunho</SelectItem>
                  <SelectItem value="published">Publicada</SelectItem>
                  <SelectItem value="archived">Arquivada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Resumo</Label>
            <Textarea rows={2} value={form.summary ?? ""} onChange={(e) => upd({ summary: e.target.value })} />
          </div>
          <div>
            <Label>Metodologia</Label>
            <Textarea rows={2} value={form.methodology ?? ""} onChange={(e) => upd({ methodology: e.target.value })} />
          </div>
          <div>
            <Label>Conclusões</Label>
            <Textarea rows={3} value={form.conclusions ?? ""} onChange={(e) => upd({ conclusions: e.target.value })} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => {
            if (!form.title?.trim()) { toast({ title: "Informe o título", variant: "destructive" }); return; }
            onSave(form);
          }}><Save className="h-4 w-4 mr-1" />Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function ItemDialog({
  open, onClose, initial, competitors, onSave,
}: {
  open: boolean;
  onClose: () => void;
  initial: Partial<CompetitorAnalysisItem> | null;
  competitors: Competitor[];
  onSave: (payload: Partial<CompetitorAnalysisItem>) => void;
}) {
  const [form, setForm] = useState<Partial<CompetitorAnalysisItem>>({});
  useEffect(() => { setForm(initial ?? {}); }, [initial, open]);
  const upd = (patch: Partial<CompetitorAnalysisItem>) => setForm((f) => ({ ...f, ...patch }));

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader><DialogTitle>{initial?.id ? "Editar item" : "Novo item comparativo"}</DialogTitle></DialogHeader>
        <div className="grid gap-3">
          <div className="grid md:grid-cols-2 gap-3">
            <div>
              <Label>Concorrente</Label>
              <Select value={form.competitor_id ?? ""} onValueChange={(v) => upd({ competitor_id: v || null })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {competitors.map((c) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Dimensão *</Label>
              <Input placeholder="Preço, Qualidade, Prazo, Tecnologia…" value={form.dimension ?? ""} onChange={(e) => upd({ dimension: e.target.value })} />
            </div>
            <div>
              <Label>Nossa posição</Label>
              <Textarea rows={2} value={form.our_position ?? ""} onChange={(e) => upd({ our_position: e.target.value })} />
            </div>
            <div>
              <Label>Posição do concorrente</Label>
              <Textarea rows={2} value={form.competitor_position ?? ""} onChange={(e) => upd({ competitor_position: e.target.value })} />
            </div>
            <div>
              <Label>Tipo de gap</Label>
              <Select value={form.gap_type ?? ""} onValueChange={(v) => upd({ gap_type: v as GapType })}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {GAP_OPTIONS.map((o) => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Ordem</Label>
              <Input type="number" value={form.sort_order ?? 0} onChange={(e) => upd({ sort_order: Number(e.target.value) || 0 })} />
            </div>
            <div className="md:col-span-2">
              <Label>Descrição do gap</Label>
              <Textarea rows={2} value={form.gap_description ?? ""} onChange={(e) => upd({ gap_description: e.target.value })} />
            </div>
            <div className="md:col-span-2">
              <Label>Ação recomendada</Label>
              <Textarea rows={2} value={form.recommended_action ?? ""} onChange={(e) => upd({ recommended_action: e.target.value })} />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={() => {
            if (!form.dimension?.trim()) { toast({ title: "Informe a dimensão", variant: "destructive" }); return; }
            onSave(form);
          }}><Save className="h-4 w-4 mr-1" />Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function CompetitiveAnalysisTab() {
  const { competitors, saveCompetitor, removeCompetitor } = useQualityCompetitors();
  const { analyses, saveAnalysis, removeAnalysis } = useQualityCompetitorAnalyses();

  const [activeAnalysisId, setActiveAnalysisId] = useState<string | null>(null);
  useEffect(() => {
    if (!activeAnalysisId && analyses.length > 0) setActiveAnalysisId(analyses[0].id);
  }, [analyses, activeAnalysisId]);

  const { items, saveItem, removeItem } = useCompetitorAnalysisItems(activeAnalysisId);
  const { upsert: upsertRisk } = useQualityRisks();

  const [compDialog, setCompDialog] = useState<{ open: boolean; initial: Partial<Competitor> | null }>({ open: false, initial: null });
  const [analysisDialog, setAnalysisDialog] = useState<{ open: boolean; initial: Partial<CompetitorAnalysis> | null }>({ open: false, initial: null });
  const [itemDialog, setItemDialog] = useState<{ open: boolean; initial: Partial<CompetitorAnalysisItem> | null }>({ open: false, initial: null });

  const activeAnalysis = useMemo(() => analyses.find((a) => a.id === activeAnalysisId) ?? null, [analyses, activeAnalysisId]);

  const generateRiskFromItem = (item: CompetitorAnalysisItem) => {
    const isOpp = item.gap_type === "opportunity" || item.gap_type === "advantage";
    upsertRisk.mutate(
      {
        kind: isOpp ? "opportunity" : "risk",
        title: `[Competitivo] ${item.dimension}${item.gap_description ? " — " + item.gap_description.slice(0,80) : ""}`,
        description: [item.gap_description, item.recommended_action && `Ação sugerida: ${item.recommended_action}`].filter(Boolean).join("\n\n"),
        source: "competitive_analysis" as any,
        source_ref_id: item.id,
        probability: 3, impact: 3,
        status: "identified",
      } as any,
      {
        onSuccess: (created: any) => {
          if (created?.id) {
            saveItem.mutate({ id: item.id, linked_risk_id: created.id });
            toast({ title: isOpp ? "Oportunidade gerada" : "Risco gerado" });
          }
        },
      }
    );
  };

  return (
    <div className="space-y-4">
      <Tabs defaultValue="analyses">
        <TabsList>
          <TabsTrigger value="analyses">Análises</TabsTrigger>
          <TabsTrigger value="competitors">Concorrentes ({competitors.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="analyses" className="mt-4 space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle className="text-base">Análises competitivas</CardTitle>
              <Button size="sm" onClick={() => setAnalysisDialog({ open: true, initial: null })}>
                <Plus className="h-4 w-4 mr-1" />Nova análise
              </Button>
            </CardHeader>
            <CardContent>
              {analyses.length === 0 ? (
                <div className="text-sm text-muted-foreground text-center py-6">
                  Nenhuma análise cadastrada. Crie a primeira para começar a comparar sua empresa com os concorrentes.
                </div>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {analyses.map((a) => (
                    <button
                      key={a.id}
                      onClick={() => setActiveAnalysisId(a.id)}
                      className={`text-left border rounded-md p-3 min-w-[220px] transition ${activeAnalysisId === a.id ? "border-primary bg-primary/5" : "hover:bg-muted"}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-medium truncate">{a.title}</span>
                        <Badge variant={a.status === "published" ? "default" : a.status === "archived" ? "secondary" : "outline"} className="text-[10px]">
                          {a.status === "published" ? "Publicada" : a.status === "archived" ? "Arquivada" : "Rascunho"}
                        </Badge>
                      </div>
                      <div className="text-xs text-muted-foreground mt-1">
                        {a.analysis_period ?? "—"} · {format(parseISO(a.performed_at), "dd/MM/yyyy", { locale: ptBR })}
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {activeAnalysis && (
            <Card>
              <CardHeader className="flex flex-row items-center justify-between flex-wrap gap-2">
                <div>
                  <CardTitle className="text-base">{activeAnalysis.title}</CardTitle>
                  <div className="text-xs text-muted-foreground mt-1">
                    {activeAnalysis.summary}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {activeAnalysis.next_review_at && (
                    <Badge variant="outline">
                      Próxima revisão: {format(parseISO(activeAnalysis.next_review_at), "dd/MM/yyyy", { locale: ptBR })}
                    </Badge>
                  )}
                  <Button size="sm" variant="outline" onClick={() => setAnalysisDialog({ open: true, initial: activeAnalysis })}>
                    <Pencil className="h-3.5 w-3.5 mr-1" />Editar
                  </Button>
                  <Button size="sm" variant="ghost" className="text-destructive"
                    onClick={() => { if (confirm("Excluir esta análise?")) { removeAnalysis.mutate(activeAnalysis.id); setActiveAnalysisId(null); } }}>
                    <Trash2 className="h-3.5 w-3.5" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between items-center">
                  <h4 className="text-sm font-medium">Matriz comparativa</h4>
                  <Button size="sm" onClick={() => setItemDialog({ open: true, initial: { analysis_id: activeAnalysis.id, sort_order: items.length } })}
                    disabled={competitors.length === 0}>
                    <Plus className="h-4 w-4 mr-1" />Novo item
                  </Button>
                </div>
                {competitors.length === 0 && (
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    <AlertCircle className="h-3.5 w-3.5" /> Cadastre concorrentes primeiro na aba "Concorrentes".
                  </div>
                )}
                {items.length === 0 ? (
                  <div className="text-sm text-muted-foreground text-center py-6">Nenhum item comparativo.</div>
                ) : (
                  <div className="border rounded-md overflow-x-auto">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Dimensão</TableHead>
                          <TableHead>Concorrente</TableHead>
                          <TableHead>Nós</TableHead>
                          <TableHead>Eles</TableHead>
                          <TableHead>Gap</TableHead>
                          <TableHead>Ação</TableHead>
                          <TableHead className="w-[140px] text-right">—</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {items.map((it) => {
                          const comp = competitors.find((c) => c.id === it.competitor_id);
                          const gap = GAP_OPTIONS.find((g) => g.value === it.gap_type);
                          return (
                            <TableRow key={it.id}>
                              <TableCell className="font-medium">{it.dimension}</TableCell>
                              <TableCell>{comp?.name ?? "—"}</TableCell>
                              <TableCell className="text-xs max-w-[220px]">{it.our_position}</TableCell>
                              <TableCell className="text-xs max-w-[220px]">{it.competitor_position}</TableCell>
                              <TableCell>
                                {gap && <Badge className={gap.color + " border-0"}>{gap.label}</Badge>}
                              </TableCell>
                              <TableCell className="text-xs max-w-[200px]">{it.recommended_action}</TableCell>
                              <TableCell className="text-right">
                                <div className="flex justify-end gap-1">
                                  {!it.linked_risk_id && it.gap_type && (
                                    <Button size="icon" variant="ghost" title="Gerar risco/oportunidade"
                                      onClick={() => generateRiskFromItem(it)}>
                                      {(it.gap_type === "opportunity" || it.gap_type === "advantage") ? <Target className="h-3.5 w-3.5" /> : <Shield className="h-3.5 w-3.5" />}
                                    </Button>
                                  )}
                                  {it.linked_risk_id && <Badge variant="secondary" className="text-[10px]">vinc.</Badge>}
                                  <Button size="icon" variant="ghost" onClick={() => setItemDialog({ open: true, initial: it })}>
                                    <Pencil className="h-3.5 w-3.5" />
                                  </Button>
                                  <Button size="icon" variant="ghost" className="text-destructive"
                                    onClick={() => { if (confirm("Excluir item?")) removeItem.mutate(it.id); }}>
                                    <Trash2 className="h-3.5 w-3.5" />
                                  </Button>
                                </div>
                              </TableCell>
                            </TableRow>
                          );
                        })}
                      </TableBody>
                    </Table>
                  </div>
                )}
                {activeAnalysis.conclusions && (
                  <div className="border rounded-md p-3 bg-muted/30">
                    <div className="text-xs font-medium mb-1">Conclusões</div>
                    <div className="text-sm whitespace-pre-wrap">{activeAnalysis.conclusions}</div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="competitors" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button size="sm" onClick={() => setCompDialog({ open: true, initial: null })}>
              <Plus className="h-4 w-4 mr-1" />Novo concorrente
            </Button>
          </div>
          {competitors.length === 0 ? (
            <div className="text-sm text-muted-foreground text-center py-8 border rounded-md">
              Nenhum concorrente cadastrado.
            </div>
          ) : (
            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
              {competitors.map((c) => (
                <Card key={c.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <CardTitle className="text-base truncate">{c.name}</CardTitle>
                        <div className="text-xs text-muted-foreground mt-0.5">
                          {[c.market_segment, SIZE_OPTIONS.find(s => s.value === c.size_category)?.label, PRICE_OPTIONS.find(p => p.value === c.price_range)?.label].filter(Boolean).join(" · ") || "—"}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => setCompDialog({ open: true, initial: c })}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button size="icon" variant="ghost" className="text-destructive"
                          onClick={() => { if (confirm("Excluir concorrente?")) removeCompetitor.mutate(c.id); }}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="text-xs space-y-1.5">
                    {c.estimated_market_share != null && <div><b>Share:</b> {c.estimated_market_share}%</div>}
                    {c.positioning && <div><b>Posicionamento:</b> {c.positioning}</div>}
                    {c.strengths && <div><b>Forças:</b> {c.strengths}</div>}
                    {c.weaknesses && <div><b>Fraquezas:</b> {c.weaknesses}</div>}
                    {c.website && (
                      <a href={c.website} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-primary hover:underline">
                        <ExternalLink className="h-3 w-3" /> Site
                      </a>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      <CompetitorDialog
        open={compDialog.open}
        onClose={() => setCompDialog({ open: false, initial: null })}
        initial={compDialog.initial}
        onSave={(p) => saveCompetitor.mutate(p, { onSuccess: () => setCompDialog({ open: false, initial: null }) })}
      />
      <AnalysisDialog
        open={analysisDialog.open}
        onClose={() => setAnalysisDialog({ open: false, initial: null })}
        initial={analysisDialog.initial}
        onSave={(p) => saveAnalysis.mutate(p, {
          onSuccess: (id) => {
            setAnalysisDialog({ open: false, initial: null });
            if (typeof id === "string") setActiveAnalysisId(id);
          },
        })}
      />
      <ItemDialog
        open={itemDialog.open}
        onClose={() => setItemDialog({ open: false, initial: null })}
        initial={itemDialog.initial}
        competitors={competitors}
        onSave={(p) => saveItem.mutate(p, { onSuccess: () => setItemDialog({ open: false, initial: null }) })}
      />
    </div>
  );
}
