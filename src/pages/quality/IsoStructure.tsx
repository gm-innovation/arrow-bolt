import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, FileText, BookOpen, Library, Building2, CheckCircle2, AlertCircle, Clock } from "lucide-react";
import { Link } from "react-router-dom";
import { format, parseISO, differenceInDays } from "date-fns";
import {
  useQualityReferenceNorms,
  useQualityTerms,
  useQualityOrgContext,
} from "@/hooks/useQualityIsoStructure";
import { useQualitySettings } from "@/hooks/useQualitySettings";
import { useQualityDocuments } from "@/hooks/useQualityDocuments";

const IsoStructure = () => {
  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold">Estrutura ISO</h2>
        <p className="text-muted-foreground">
          Escopo do SGQ, normas de referência, termos e contexto da organização.
        </p>
      </div>

      <Tabs defaultValue="scope" className="space-y-4">
        <TabsList>
          <TabsTrigger value="scope"><FileText className="h-4 w-4 mr-2" /> Escopo do SGQ</TabsTrigger>
          <TabsTrigger value="norms"><Library className="h-4 w-4 mr-2" /> Normas de Referência</TabsTrigger>
          <TabsTrigger value="terms"><BookOpen className="h-4 w-4 mr-2" /> Termos e Definições</TabsTrigger>
          <TabsTrigger value="context"><Building2 className="h-4 w-4 mr-2" /> Contexto da Organização</TabsTrigger>
        </TabsList>

        <TabsContent value="scope"><ScopeTab /></TabsContent>
        <TabsContent value="norms"><NormsTab /></TabsContent>
        <TabsContent value="terms"><TermsTab /></TabsContent>
        <TabsContent value="context"><ContextTab /></TabsContent>
      </Tabs>
    </div>
  );
};

// =============== Escopo (wrapper sobre GED) ===============
const ScopeTab = () => {
  const { documents } = useQualityDocuments();
  // Heurística: documentos cujo tipo seja "ESCOPO_SGQ" (code_prefix do quality_document_types).
  const scopeDocs = documents.filter((d: any) => (d.code || "").startsWith("ESCOPO_SGQ"));
  const published = scopeDocs.find((d: any) => d.status === "published");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Escopo do Sistema de Gestão da Qualidade</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">
          O Escopo do SGQ é tratado como um documento controlado no GED, com versão, aprovação e
          assinatura. Crie um tipo de documento com prefixo <code className="font-mono">ESCOPO_SGQ</code>
          {" "}em <Link to="/quality/settings" className="underline">Configurações</Link>{" "}
          e mantenha um único documento ativo.
        </p>
        {published ? (
          <div className="border rounded-lg p-4 flex items-center justify-between">
            <div>
              <p className="font-medium">{published.code} — {published.title}</p>
              <p className="text-xs text-muted-foreground">
                Revisão {published.current_revision ?? "—"} · publicado em{" "}
                {published.published_at ? format(parseISO(published.published_at), "dd/MM/yyyy") : "—"}
              </p>
            </div>
            <Link to={`/quality/documents/${published.id}`}>
              <Button size="sm" variant="outline">Abrir documento</Button>
            </Link>
          </div>
        ) : (
          <div className="border border-dashed rounded-lg p-6 text-center text-sm text-muted-foreground">
            Nenhum Escopo do SGQ publicado.{" "}
            <Link to="/quality/documents" className="underline">Criar agora</Link>
          </div>
        )}
        {scopeDocs.length > 0 && (
          <div>
            <p className="text-xs font-medium mb-2">Histórico</p>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {scopeDocs.map((d: any) => (
                  <TableRow key={d.id}>
                    <TableCell className="font-mono">{d.code}</TableCell>
                    <TableCell>{d.title}</TableCell>
                    <TableCell><Badge variant="outline">{d.status}</Badge></TableCell>
                    <TableCell className="text-right">
                      <Link to={`/quality/documents/${d.id}`}>
                        <Button size="sm" variant="ghost">Abrir</Button>
                      </Link>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// =============== Normas ===============
const NORM_STATUS_LABELS: Record<string, { label: string; tone: string }> = {
  vigente: { label: "Vigente", tone: "border-green-500 text-green-700" },
  substituida: { label: "Substituída", tone: "border-blue-500 text-blue-700" },
  cancelada: { label: "Cancelada", tone: "border-destructive text-destructive" },
  rascunho: { label: "Rascunho", tone: "border-yellow-500 text-yellow-700" },
};

const NormsTab = () => {
  const { norms, create, update, remove } = useQualityReferenceNorms();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    code: "", title: "", issuer: "", revision: "", status: "vigente",
    valid_from: "", valid_until: "", attachment_url: "", attachment_name: "",
    review_frequency_months: "", notes: "",
  });

  const submit = async () => {
    if (!form.code || !form.title) return;
    await create.mutateAsync({
      code: form.code,
      title: form.title,
      issuer: form.issuer || null,
      revision: form.revision || null,
      status: form.status,
      valid_from: form.valid_from || null,
      valid_until: form.valid_until || null,
      attachment_url: form.attachment_url || null,
      attachment_name: form.attachment_name || null,
      review_frequency_months: form.review_frequency_months ? Number(form.review_frequency_months) : null,
      notes: form.notes || null,
    } as any);
    setForm({
      code: "", title: "", issuer: "", revision: "", status: "vigente",
      valid_from: "", valid_until: "", attachment_url: "", attachment_name: "",
      review_frequency_months: "", notes: "",
    });
    setOpen(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Normas de Referência</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Nova norma</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Nova norma de referência</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Código *</Label>
                  <Input placeholder="ISO 9001:2015" value={form.code} onChange={(e) => setForm({ ...form, code: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Emissor</Label>
                  <Input placeholder="ABNT, ANVISA..." value={form.issuer} onChange={(e) => setForm({ ...form, issuer: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Título *</Label>
                <Input value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Válida desde</Label>
                  <Input type="date" value={form.valid_from} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Válida até</Label>
                  <Input type="date" value={form.valid_until} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <Label>Revisão</Label>
                  <Input placeholder="Rev. 03" value={form.revision} onChange={(e) => setForm({ ...form, revision: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Status</Label>
                  <Select value={form.status} onValueChange={(v) => setForm({ ...form, status: v })}>
                    <SelectTrigger><SelectValue /></SelectTrigger>
                    <SelectContent>
                      {Object.entries(NORM_STATUS_LABELS).map(([k, v]) => (
                        <SelectItem key={k} value={k}>{v.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1">
                  <Label>Ciclo de revisão (meses)</Label>
                  <Input type="number" min={1} value={form.review_frequency_months}
                    onChange={(e) => setForm({ ...form, review_frequency_months: e.target.value })} />
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>URL do anexo</Label>
                  <Input placeholder="https://..." value={form.attachment_url}
                    onChange={(e) => setForm({ ...form, attachment_url: e.target.value })} />
                </div>
                <div className="space-y-1">
                  <Label>Nome do anexo</Label>
                  <Input value={form.attachment_name}
                    onChange={(e) => setForm({ ...form, attachment_name: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>Observações</Label>
                <Textarea value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={submit} disabled={!form.code || !form.title}>Cadastrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {norms.length === 0 ? (
          <p className="text-center py-6 text-muted-foreground text-sm">Nenhuma norma cadastrada.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Código</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Rev.</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Emissor</TableHead>
                <TableHead>Vigência</TableHead>
                <TableHead>Anexo</TableHead>
                <TableHead></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {norms.map((n: any) => {
                const st = NORM_STATUS_LABELS[n.status || "vigente"];
                return (
                  <TableRow key={n.id}>
                    <TableCell className="font-mono">{n.code}</TableCell>
                    <TableCell>{n.title}</TableCell>
                    <TableCell className="text-xs">{n.revision || "—"}</TableCell>
                    <TableCell>
                      <Badge variant="outline" className={st?.tone}>{st?.label || n.status}</Badge>
                    </TableCell>
                    <TableCell>{n.issuer || "—"}</TableCell>
                    <TableCell className="text-xs">
                      {n.valid_from ? format(parseISO(n.valid_from), "dd/MM/yyyy") : "—"} —{" "}
                      {n.valid_until ? format(parseISO(n.valid_until), "dd/MM/yyyy") : "vigente"}
                    </TableCell>
                    <TableCell className="text-xs">
                      {n.attachment_url ? (
                        <a href={n.attachment_url} target="_blank" rel="noopener noreferrer" className="underline">
                          {n.attachment_name || "abrir"}
                        </a>
                      ) : "—"}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="icon" variant="ghost" onClick={() => remove.mutate(n.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
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
  );
};

// =============== Termos ===============
const TERM_STATUS_LABELS: Record<string, { label: string; tone: string }> = {
  rascunho: { label: "Rascunho", tone: "border-yellow-500 text-yellow-700" },
  vigente: { label: "Vigente", tone: "border-green-500 text-green-700" },
  obsoleto: { label: "Obsoleto", tone: "border-muted-foreground text-muted-foreground" },
};

const TermsTab = () => {
  const { terms, create, remove } = useQualityTerms();
  const { norms } = useQualityReferenceNorms();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({
    term: "", definition: "", source_norm_id: "",
    version: "1", status: "vigente", review_frequency_months: "",
  });

  const submit = async () => {
    if (!form.term || !form.definition) return;
    await create.mutateAsync({
      term: form.term,
      definition: form.definition,
      source_norm_id: form.source_norm_id || null,
    });
    setForm({ term: "", definition: "", source_norm_id: "" });
    setOpen(false);
  };

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle>Glossário ISO</CardTitle>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Novo termo</Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>Novo termo</DialogTitle></DialogHeader>
            <div className="grid gap-3">
              <div className="space-y-1">
                <Label>Termo *</Label>
                <Input value={form.term} onChange={(e) => setForm({ ...form, term: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Definição *</Label>
                <Textarea rows={4} value={form.definition} onChange={(e) => setForm({ ...form, definition: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Norma de origem</Label>
                <Select value={form.source_norm_id} onValueChange={(v) => setForm({ ...form, source_norm_id: v })}>
                  <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                  <SelectContent>
                    {norms.map((n) => (
                      <SelectItem key={n.id} value={n.id}>{n.code} — {n.title}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
              <Button onClick={submit} disabled={!form.term || !form.definition}>Cadastrar</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </CardHeader>
      <CardContent>
        {terms.length === 0 ? (
          <p className="text-center py-6 text-muted-foreground text-sm">Nenhum termo cadastrado.</p>
        ) : (
          <div className="space-y-3">
            {terms.map((t) => {
              const norm = norms.find((n) => n.id === t.source_norm_id);
              return (
                <div key={t.id} className="border rounded-lg p-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-semibold">{t.term}</p>
                      <p className="text-sm text-muted-foreground mt-1">{t.definition}</p>
                      {norm && <Badge variant="outline" className="mt-2 text-xs">{norm.code}</Badge>}
                    </div>
                    <Button size="icon" variant="ghost" onClick={() => remove.mutate(t.id)}>
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// =============== Contexto da Organização ===============
const ContextTab = () => {
  const { context, upsert, markReviewed } = useQualityOrgContext();
  const { cycles } = useQualitySettings();
  const [form, setForm] = useState({
    internal_issues: "",
    external_issues: "",
    applicable_scope: "",
    review_frequency_months: "",
  });
  const [reviewNotes, setReviewNotes] = useState("");
  const [reviewOpen, setReviewOpen] = useState(false);
  const [initialized, setInitialized] = useState(false);

  if (context && !initialized) {
    setInitialized(true);
    setForm({
      internal_issues: context.internal_issues ?? "",
      external_issues: context.external_issues ?? "",
      applicable_scope: context.applicable_scope ?? "",
      review_frequency_months: context.review_frequency_months?.toString() ?? "",
    });
  }

  const reviewStatus = (() => {
    if (!context?.next_review_due_at) return { label: "Sem ciclo", variant: "outline" as const, icon: Clock };
    const days = differenceInDays(parseISO(context.next_review_due_at), new Date());
    if (days < 0) return { label: "Vencida", variant: "destructive" as const, icon: AlertCircle };
    if (days <= cycles.alert_window_days) return { label: `Vence em ${days}d`, variant: "secondary" as const, icon: Clock };
    return { label: `OK (${days}d)`, variant: "default" as const, icon: CheckCircle2 };
  })();

  const save = async () => {
    await upsert.mutateAsync({
      internal_issues: form.internal_issues || null,
      external_issues: form.external_issues || null,
      applicable_scope: form.applicable_scope || null,
      review_frequency_months: form.review_frequency_months
        ? Number(form.review_frequency_months)
        : cycles.org_context_months,
    });
  };

  const doReview = async () => {
    await markReviewed.mutateAsync(reviewNotes);
    setReviewNotes("");
    setReviewOpen(false);
  };

  const StatusIcon = reviewStatus.icon;

  return (
    <Card>
      <CardHeader className="flex flex-row items-start justify-between">
        <div>
          <CardTitle>Contexto da Organização</CardTitle>
          <p className="text-xs text-muted-foreground mt-1">
            Questões internas, externas e escopo aplicável. Revisão periódica obrigatória.
          </p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <Badge variant={reviewStatus.variant} className="gap-1">
            <StatusIcon className="h-3 w-3" /> {reviewStatus.label}
          </Badge>
          {context?.last_reviewed_at && (
            <p className="text-xs text-muted-foreground">
              Última revisão: {format(parseISO(context.last_reviewed_at), "dd/MM/yyyy")}
            </p>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-2">
          <Label>Questões internas</Label>
          <Textarea
            rows={4}
            placeholder="Cultura, estrutura, recursos, conhecimento..."
            value={form.internal_issues}
            onChange={(e) => setForm({ ...form, internal_issues: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Questões externas</Label>
          <Textarea
            rows={4}
            placeholder="Mercado, regulamentação, concorrência, tecnologia..."
            value={form.external_issues}
            onChange={(e) => setForm({ ...form, external_issues: e.target.value })}
          />
        </div>
        <div className="space-y-2">
          <Label>Escopo aplicável</Label>
          <Textarea
            rows={3}
            value={form.applicable_scope}
            onChange={(e) => setForm({ ...form, applicable_scope: e.target.value })}
          />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <div className="space-y-2">
            <Label>Frequência de revisão (meses)</Label>
            <Input
              type="number"
              placeholder={String(cycles.org_context_months)}
              value={form.review_frequency_months}
              onChange={(e) => setForm({ ...form, review_frequency_months: e.target.value })}
            />
          </div>
          {context?.next_review_due_at && (
            <div className="space-y-2">
              <Label>Próxima revisão</Label>
              <Input readOnly value={format(parseISO(context.next_review_due_at), "dd/MM/yyyy")} />
            </div>
          )}
        </div>
        {context?.last_review_notes && (
          <div className="bg-muted/30 rounded-lg p-3 text-sm">
            <p className="text-xs font-medium text-muted-foreground mb-1">Notas da última revisão</p>
            <p>{context.last_review_notes}</p>
          </div>
        )}

        <div className="flex justify-end gap-2 pt-2">
          <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" disabled={!context}>
                <CheckCircle2 className="h-4 w-4 mr-2" /> Marcar como revisado
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Registrar revisão do contexto</DialogTitle></DialogHeader>
              <div className="space-y-2">
                <Label>Observações da revisão</Label>
                <Textarea
                  rows={4}
                  placeholder="O que foi validado, alterado ou mantido"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                />
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setReviewOpen(false)}>Cancelar</Button>
                <Button onClick={doReview}>Confirmar revisão</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
          <Button onClick={save}>Salvar</Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default IsoStructure;
