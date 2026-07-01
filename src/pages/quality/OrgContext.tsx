import { useEffect, useMemo, useState } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Eye, Save, History, ClipboardCheck, AlertCircle, Filter } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useQualityOrgContext, type ContextCategory, type ContextItem } from "@/hooks/useQualityOrgContext";
import { useQualityRisks } from "@/hooks/useQualityRisks";
import { useDepartments } from "@/hooks/useDepartments";
import CategoryColumn from "@/components/quality/context/CategoryColumn";
import ExcludedClausesCard from "@/components/quality/context/ExcludedClausesCard";
import ContextItemDialog from "@/components/quality/context/ContextItemDialog";
import ReviewContextDialog from "@/components/quality/context/ReviewContextDialog";
import VersionViewerDialog from "@/components/quality/context/VersionViewerDialog";
import LastManagementReviewCard from "@/components/quality/context/LastManagementReviewCard";
import type { ContextVersion } from "@/hooks/useQualityOrgContext";
import { toast } from "@/hooks/use-toast";
import CompetitiveAnalysisTab from "@/components/quality/context/CompetitiveAnalysisTab";
import StrategicObjectivesTab from "@/components/quality/context/StrategicObjectivesTab";

const OrgContext = () => {
  const { context, items, versions, saveContext, removeItem, linkItemRisk } = useQualityOrgContext();
  const { upsert: upsertRisk } = useQualityRisks();
  const { departments } = useDepartments();

  const [swotDept, setSwotDept] = useState<string>("all");
  const [swotPeriod, setSwotPeriod] = useState<string>("all");

  const swotItems = useMemo(() => items.filter((i) => i.category.startsWith("swot_")), [items]);
  const periodOptions = useMemo(() => {
    const set = new Set<string>();
    swotItems.forEach((i) => { if (i.analysis_period) set.add(i.analysis_period); });
    return Array.from(set).sort().reverse();
  }, [swotItems]);

  const filteredSwot = useMemo(() => {
    return swotItems.filter((i) => {
      if (swotDept === "all") {
        // include all
      } else if (swotDept === "none") {
        if (i.department_id) return false;
      } else if (i.department_id !== swotDept) {
        return false;
      }
      if (swotPeriod !== "all" && (i.analysis_period ?? "") !== swotPeriod) return false;
      return true;
    });
  }, [swotItems, swotDept, swotPeriod]);

  const [scope, setScope] = useState<string>("");
  const [internal, setInternal] = useState<string>("");
  const [external, setExternal] = useState<string>("");
  const [freq, setFreq] = useState<number>(12);
  const [mission, setMission] = useState<string>("");
  const [vision, setVision] = useState<string>("");
  const [values, setValues] = useState<string>("");

  useEffect(() => {
    if (context) {
      setScope(context.applicable_scope ?? "");
      setInternal(context.internal_issues ?? "");
      setExternal(context.external_issues ?? "");
      setFreq(context.review_frequency_months ?? 12);
      setMission((context as any).mission ?? "");
      setVision((context as any).vision ?? "");
      setValues((context as any).values ?? "");
    }
  }, [context?.id]);

  const [dialogCat, setDialogCat] = useState<ContextCategory | null>(null);
  const [editing, setEditing] = useState<ContextItem | null>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [viewVersion, setViewVersion] = useState<ContextVersion | null>(null);

  const openAdd = (cat: ContextCategory) => { setEditing(null); setDialogCat(cat); };
  const openEdit = (item: ContextItem) => { setEditing(item); setDialogCat(item.category); };
  const closeDialog = () => { setDialogCat(null); setEditing(null); };

  const handleGenerateRisk = (item: ContextItem) => {
    const isOpportunity = item.category === "swot_opportunity";
    upsertRisk.mutate(
      {
        kind: isOpportunity ? "opportunity" : "risk",
        title: item.title,
        description: item.description ?? undefined,
        source: "context",
        source_ref_id: item.id,
        probability: 3, impact: 3,
        status: "identified",
      } as any,
      {
        onSuccess: (created: any) => {
          if (created?.id) {
            linkItemRisk.mutate({ itemId: item.id, riskId: created.id });
            toast({ title: isOpportunity ? "Oportunidade gerada" : "Risco gerado", description: `Vinculado ao item "${item.title}"` });
          }
        },
      }
    );
  };

  const overdue = context?.next_review_due_at && new Date(context.next_review_due_at) < new Date();

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h3 className="text-xl font-bold">Contexto da Organização</h3>
          <p className="text-sm text-muted-foreground">ISO 9001 §4.1 — questões internas, externas, SWOT e PESTAL.</p>
        </div>
        <div className="flex items-center gap-2">
          {context?.last_reviewed_at && (
            <Badge variant="outline">
              Última revisão: {format(parseISO(context.last_reviewed_at), "dd/MM/yyyy", { locale: ptBR })}
            </Badge>
          )}
          {context?.next_review_due_at && (
            <Badge variant={overdue ? "destructive" : "secondary"}>
              {overdue && <AlertCircle className="h-3 w-3 mr-1" />}
              Próxima: {format(parseISO(context.next_review_due_at), "dd/MM/yyyy", { locale: ptBR })}
            </Badge>
          )}
          <Button onClick={() => setReviewOpen(true)}>
            <ClipboardCheck className="h-4 w-4 mr-1" />Registrar Revisão
          </Button>
        </div>
      </div>

      <Tabs defaultValue="overview">
        <TabsList>
          <TabsTrigger value="overview">Visão Geral</TabsTrigger>
          <TabsTrigger value="swot">SWOT</TabsTrigger>
          <TabsTrigger value="pestal">PESTAL</TabsTrigger>
          <TabsTrigger value="history">Histórico ({versions.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="overview" className="mt-4 space-y-4">
          <LastManagementReviewCard />
          <Card>
            <CardHeader><CardTitle className="text-base">Identidade Organizacional</CardTitle></CardHeader>
            <CardContent className="grid md:grid-cols-3 gap-3">
              <div>
                <Label className="text-xs">Missão</Label>
                <Textarea rows={4} value={mission} onChange={(e) => setMission(e.target.value)}
                  placeholder="Razão de existir da organização." />
              </div>
              <div>
                <Label className="text-xs">Visão</Label>
                <Textarea rows={4} value={vision} onChange={(e) => setVision(e.target.value)}
                  placeholder="Onde a organização quer chegar." />
              </div>
              <div>
                <Label className="text-xs">Valores</Label>
                <Textarea rows={4} value={values} onChange={(e) => setValues(e.target.value)}
                  placeholder="Princípios que orientam decisões e comportamentos." />
              </div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Escopo do SGQ</CardTitle></CardHeader>
            <CardContent>
              <Textarea rows={3} value={scope} onChange={(e) => setScope(e.target.value)}
                placeholder="Defina os limites e aplicabilidade do SGQ na sua organização." />
            </CardContent>
          </Card>
          <div className="grid md:grid-cols-2 gap-4">
            <Card>
              <CardHeader><CardTitle className="text-base">Questões Internas</CardTitle></CardHeader>
              <CardContent>
                <Textarea rows={6} value={internal} onChange={(e) => setInternal(e.target.value)}
                  placeholder="Cultura, valores, conhecimento, desempenho, recursos, estrutura, governança…" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader><CardTitle className="text-base">Questões Externas</CardTitle></CardHeader>
              <CardContent>
                <Textarea rows={6} value={external} onChange={(e) => setExternal(e.target.value)}
                  placeholder="Mercado, tecnologia, legislação, concorrência, sociedade, ambiente…" />
              </CardContent>
            </Card>
          </div>
          <Card>
            <CardContent className="p-4 flex items-end gap-3 flex-wrap">
              <div>
                <Label>Frequência de revisão (meses)</Label>
                <Input type="number" min={1} max={36} className="w-32"
                  value={freq} onChange={(e) => setFreq(Number(e.target.value) || 12)} />
              </div>
              <Button onClick={() => saveContext.mutate({
                applicable_scope: scope, internal_issues: internal,
                external_issues: external, review_frequency_months: freq,
                mission, vision, values,
              } as any)} disabled={saveContext.isPending}>
                <Save className="h-4 w-4 mr-1" />Salvar
              </Button>
            </CardContent>
          </Card>

          <ExcludedClausesCard />
        </TabsContent>

        <TabsContent value="swot" className="mt-4 space-y-3">
          <Card>
            <CardContent className="p-3 flex flex-wrap items-end gap-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Filter className="h-4 w-4" /> Filtros
              </div>
              <div className="min-w-[200px]">
                <Label className="text-xs">Departamento</Label>
                <Select value={swotDept} onValueChange={setSwotDept}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="none">Organização toda (sem depto)</SelectItem>
                    {departments.map((d: any) => (
                      <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="min-w-[160px]">
                <Label className="text-xs">Período</Label>
                <Select value={swotPeriod} onValueChange={setSwotPeriod}>
                  <SelectTrigger className="h-9"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {periodOptions.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="text-xs text-muted-foreground ml-auto">
                {filteredSwot.length} itens visíveis
              </div>
            </CardContent>
          </Card>
          <div className="grid md:grid-cols-2 gap-4">
            <CategoryColumn title="Forças" category="swot_strength" items={filteredSwot}
              accent="bg-emerald-50 dark:bg-emerald-950/30"
              onAdd={openAdd} onEdit={openEdit} onRemove={(i) => removeItem.mutate(i.id)} onGenerateRisk={handleGenerateRisk} />
            <CategoryColumn title="Fraquezas" category="swot_weakness" items={filteredSwot}
              accent="bg-amber-50 dark:bg-amber-950/30"
              onAdd={openAdd} onEdit={openEdit} onRemove={(i) => removeItem.mutate(i.id)} onGenerateRisk={handleGenerateRisk} />
            <CategoryColumn title="Oportunidades" category="swot_opportunity" items={filteredSwot}
              accent="bg-sky-50 dark:bg-sky-950/30"
              onAdd={openAdd} onEdit={openEdit} onRemove={(i) => removeItem.mutate(i.id)} onGenerateRisk={handleGenerateRisk} />
            <CategoryColumn title="Ameaças" category="swot_threat" items={filteredSwot}
              accent="bg-rose-50 dark:bg-rose-950/30"
              onAdd={openAdd} onEdit={openEdit} onRemove={(i) => removeItem.mutate(i.id)} onGenerateRisk={handleGenerateRisk} />
          </div>
        </TabsContent>

        <TabsContent value="pestal" className="mt-4">
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            <CategoryColumn title="Político" category="pestal_political" items={items} onAdd={openAdd} onEdit={openEdit} onRemove={(i) => removeItem.mutate(i.id)} onGenerateRisk={handleGenerateRisk} />
            <CategoryColumn title="Econômico" category="pestal_economic" items={items} onAdd={openAdd} onEdit={openEdit} onRemove={(i) => removeItem.mutate(i.id)} onGenerateRisk={handleGenerateRisk} />
            <CategoryColumn title="Social" category="pestal_social" items={items} onAdd={openAdd} onEdit={openEdit} onRemove={(i) => removeItem.mutate(i.id)} onGenerateRisk={handleGenerateRisk} />
            <CategoryColumn title="Tecnológico" category="pestal_technological" items={items} onAdd={openAdd} onEdit={openEdit} onRemove={(i) => removeItem.mutate(i.id)} onGenerateRisk={handleGenerateRisk} />
            <CategoryColumn title="Ambiental" category="pestal_environmental" items={items} onAdd={openAdd} onEdit={openEdit} onRemove={(i) => removeItem.mutate(i.id)} onGenerateRisk={handleGenerateRisk} />
            <CategoryColumn title="Legal" category="pestal_legal" items={items} onAdd={openAdd} onEdit={openEdit} onRemove={(i) => removeItem.mutate(i.id)} onGenerateRisk={handleGenerateRisk} />
          </div>
        </TabsContent>

        <TabsContent value="history" className="mt-4">
          <Card>
            <CardContent className="p-0">
              {versions.length === 0 ? (
                <div className="p-8 text-center text-sm text-muted-foreground">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  Nenhuma revisão registrada. Use "Registrar Revisão" para criar o primeiro snapshot.
                </div>
              ) : (
                <ul className="divide-y">
                  {versions.map(v => (
                    <li key={v.id} className="p-3 flex items-center justify-between gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">Versão #{v.version_number}</span>
                          {v.approved && <Badge variant="secondary">Aprovada</Badge>}
                          <span className="text-xs text-muted-foreground">
                            {format(parseISO(v.reviewed_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                          </span>
                        </div>
                        {v.review_notes && <p className="text-xs text-muted-foreground truncate mt-0.5">{v.review_notes}</p>}
                      </div>
                      <Button size="sm" variant="outline" onClick={() => setViewVersion(v)}>
                        <Eye className="h-3.5 w-3.5 mr-1" />Visualizar
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {dialogCat && (
        <ContextItemDialog
          open={!!dialogCat}
          onClose={closeDialog}
          category={dialogCat}
          item={editing}
          defaultDepartmentId={dialogCat.startsWith("swot_") && swotDept !== "all" && swotDept !== "none" ? swotDept : null}
          defaultAnalysisPeriod={dialogCat.startsWith("swot_") && swotPeriod !== "all" ? swotPeriod : null}
        />
      )}
      <ReviewContextDialog open={reviewOpen} onClose={() => setReviewOpen(false)} />
      <VersionViewerDialog version={viewVersion} onClose={() => setViewVersion(null)} />
    </div>
  );
};

export default OrgContext;
