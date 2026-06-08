import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Edit, Trash2, Workflow, FileText, History as HistoryIcon, AlertTriangle } from "lucide-react";
import { useQualityProcesses, useProcessSIPOC, useProcessActivities, type QualityProcess } from "@/hooks/useQualityProcesses";
import { useQualityDocuments } from "@/hooks/useQualityDocuments";
import { useCentralApproval } from "@/hooks/useCentralApproval";
import { useQualitySettings } from "@/hooks/useQualitySettings";
import { useQualityProcessDocumentHistory } from "@/hooks/useQualityProcessDocumentHistory";
import { format, parseISO } from "date-fns";

const TYPE_LABELS: Record<QualityProcess["type"], string> = {
  strategic: "Estratégico", tactical: "Tático", operational: "Operacional", support: "Suporte",
};

const ProcessApproval = ({ documentId }: { documentId: string | null }) => {
  const { approval, request } = useCentralApproval(documentId ? "document" : undefined, documentId || undefined);
  const { approvalScope } = useQualitySettings();
  if (!documentId) return <span className="text-xs text-muted-foreground">Sem documento controlado vinculado</span>;
  if (!approvalScope.document) return null;
  if (!approval) return <Button size="sm" variant="outline" onClick={() => request.mutate(undefined)}>Solicitar aprovação ao Master</Button>;
  return <Badge variant={approval.status === "approved" ? "default" : approval.status === "rejected" ? "destructive" : "secondary"}>
    {approval.status === "approved" ? "Documento aprovado" : approval.status === "rejected" ? "Rejeitado" : "Pendente Master"}
  </Badge>;
};

const ProcessDrawer = ({ process, open, onClose }: { process: QualityProcess | null; open: boolean; onClose: () => void; }) => {
  const { sipoc, save } = useProcessSIPOC(process?.id || null);
  const { activities, upsert: upsertAct, remove: removeAct } = useProcessActivities(process?.id || null);
  const { documents } = useQualityDocuments();
  const { upsertProcess } = useQualityProcesses();
  const { data: history = [] } = useQualityProcessDocumentHistory(process?.id || null);
  const [s, setS] = useState({
    suppliers: sipoc?.suppliers || "", inputs: sipoc?.inputs || "",
    activities: sipoc?.activities || "", outputs: sipoc?.outputs || "", customers: sipoc?.customers || "",
  });
  const [newAct, setNewAct] = useState("");

  if (!process) return null;

  const linkDoc = (id: string) => upsertProcess.mutate({ id: process.id, current_document_id: id === "none" ? null : id });
  const doc = documents.find(d => d.id === process.current_document_id);
  const docInvalid = doc && (
    (doc.status !== "published" && (doc.status as any) !== "approved")
    || (doc.expires_at && new Date(doc.expires_at) < new Date())
  );
  const docInvalidReason = !doc
    ? null
    : doc.status !== "published" && (doc.status as any) !== "approved"
      ? `Documento está com status "${doc.status}"`
      : (doc.expires_at && new Date(doc.expires_at) < new Date())
        ? `Documento vencido em ${doc.expires_at}`
        : null;

  const docCode = (id: string | null) => {
    if (!id) return "—";
    const d = documents.find(x => x.id === id);
    return d ? `${d.code} — ${d.title}` : id.slice(0, 8);
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader><SheetTitle>{process.name}</SheetTitle></SheetHeader>
        <Tabs defaultValue="doc" className="mt-4">
          <TabsList>
            <TabsTrigger value="doc">Documento Controlado</TabsTrigger>
            <TabsTrigger value="sipoc">SIPOC</TabsTrigger>
            <TabsTrigger value="acts">Atividades</TabsTrigger>
            <TabsTrigger value="history"><HistoryIcon className="h-3.5 w-3.5 mr-1" />Histórico</TabsTrigger>
          </TabsList>
          <TabsContent value="doc" className="space-y-3">
            <Label>Vincular documento controlado</Label>
            <Select value={process.current_document_id || "none"} onValueChange={linkDoc}>
              <SelectTrigger><SelectValue placeholder="Selecionar documento" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Nenhum —</SelectItem>
                {documents.map(d => <SelectItem key={d.id} value={d.id}>{d.code} — {d.title}</SelectItem>)}
              </SelectContent>
            </Select>
            {doc && (
              <Card><CardContent className="p-3 text-sm space-y-1">
                <div className="flex items-center gap-2"><FileText className="h-4 w-4" /><span className="font-medium">{doc.code} — {doc.title}</span></div>
                <div className="text-xs text-muted-foreground">Status: {doc.status} {doc.next_review_date && `· Próx. revisão: ${doc.next_review_date}`}</div>
              </CardContent></Card>
            )}
            {docInvalid && (
              <div className="flex items-start gap-2 border border-destructive/40 bg-destructive/5 rounded p-3 text-sm">
                <AlertTriangle className="h-4 w-4 text-destructive shrink-0 mt-0.5" />
                <div>
                  <div className="font-medium text-destructive">Documento vinculado inválido</div>
                  <div className="text-xs text-muted-foreground">
                    {docInvalidReason}. O processo não poderá ficar com status <span className="font-mono">active</span> enquanto a regra "Processo só fica ativo com documento válido" estiver ligada em Configurações.
                  </div>
                </div>
              </div>
            )}
            <ProcessApproval documentId={process.current_document_id} />
          </TabsContent>
          <TabsContent value="sipoc" className="space-y-3">
            {(["suppliers","inputs","activities","outputs","customers"] as const).map(k => (
              <div key={k}>
                <Label className="capitalize">{k}</Label>
                <Textarea rows={2} value={(s as any)[k]} onChange={(e) => setS(x => ({ ...x, [k]: e.target.value }))} />
              </div>
            ))}
            <Button onClick={() => save.mutate(s)}>Salvar SIPOC</Button>
          </TabsContent>
          <TabsContent value="acts" className="space-y-3">
            <div className="flex gap-2">
              <Input placeholder="Nova atividade" value={newAct} onChange={(e) => setNewAct(e.target.value)} />
              <Button onClick={() => { if (newAct.trim()) { upsertAct.mutate({ activity: newAct.trim(), order_index: activities.length }); setNewAct(""); } }}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            <Table><TableHeader><TableRow><TableHead>#</TableHead><TableHead>Atividade</TableHead><TableHead></TableHead></TableRow></TableHeader>
              <TableBody>
                {activities.map((a, i) => (
                  <TableRow key={a.id}>
                    <TableCell>{i + 1}</TableCell><TableCell>{a.activity}</TableCell>
                    <TableCell><Button size="icon" variant="ghost" onClick={() => removeAct.mutate(a.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TabsContent>
          <TabsContent value="history" className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Histórico imutável de trocas do documento controlado vinculado a este processo.
            </p>
            {history.length === 0 ? (
              <p className="text-center py-6 text-sm text-muted-foreground">Sem registros de troca de documento.</p>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Documento anterior</TableHead>
                    <TableHead>Novo documento</TableHead>
                    <TableHead>Motivo</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {history.map(h => (
                    <TableRow key={h.id}>
                      <TableCell className="text-xs">{format(parseISO(h.changed_at), "dd/MM/yyyy HH:mm")}</TableCell>
                      <TableCell className="text-xs">{docCode(h.previous_document_id)}</TableCell>
                      <TableCell className="text-xs">{docCode(h.new_document_id)}</TableCell>
                      <TableCell className="text-xs text-muted-foreground">{h.reason || "—"}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  );
};

const ProcessDialog = ({ open, onClose, process }: { open: boolean; onClose: () => void; process: Partial<QualityProcess> | null; }) => {
  const { upsertProcess } = useQualityProcesses();
  const [form, setForm] = useState<Partial<QualityProcess>>(process || { name: "", type: "operational", status: "draft" });
  const submit = () => {
    if (!form.name) return;
    upsertProcess.mutate(form as any, { onSuccess: onClose });
  };
  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent>
        <DialogHeader><DialogTitle>{process?.id ? "Editar" : "Novo"} Processo</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div><Label>Nome</Label><Input value={form.name || ""} onChange={(e) => setForm(s => ({ ...s, name: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Tipo</Label>
              <Select value={form.type} onValueChange={(v: any) => setForm(s => ({ ...s, type: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(TYPE_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div>
              <Label>Status</Label>
              <Select value={form.status} onValueChange={(v: any) => setForm(s => ({ ...s, status: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent><SelectItem value="draft">Rascunho</SelectItem><SelectItem value="active">Ativo</SelectItem><SelectItem value="obsolete">Obsoleto</SelectItem></SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>Descrição</Label><Textarea rows={3} value={form.description || ""} onChange={(e) => setForm(s => ({ ...s, description: e.target.value || null }))} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={upsertProcess.isPending}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const Processes = () => {
  const { processes, removeProcess } = useQualityProcesses();
  const [editing, setEditing] = useState<Partial<QualityProcess> | null>(null);
  const [drawer, setDrawer] = useState<QualityProcess | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2"><Workflow className="h-5 w-5" />Processos</h3>
          <p className="text-sm text-muted-foreground">Mapeamento dos processos com SIPOC, atividades e vínculo ao documento controlado.</p>
        </div>
        <Button onClick={() => { setEditing({}); setDialogOpen(true); }}><Plus className="h-4 w-4 mr-1" />Novo Processo</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader><TableRow>
              <TableHead>Nome</TableHead><TableHead>Tipo</TableHead><TableHead>Status</TableHead><TableHead>Documento</TableHead><TableHead className="w-32"></TableHead>
            </TableRow></TableHeader>
            <TableBody>
              {processes.length === 0 && <TableRow><TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-8">Nenhum processo cadastrado.</TableCell></TableRow>}
              {processes.map(p => (
                <TableRow key={p.id} className="cursor-pointer hover:bg-muted/30" onClick={() => setDrawer(p)}>
                  <TableCell className="font-medium">{p.name}</TableCell>
                  <TableCell><Badge variant="outline">{TYPE_LABELS[p.type]}</Badge></TableCell>
                  <TableCell><Badge variant={p.status === "active" ? "default" : "secondary"}>{p.status}</Badge></TableCell>
                  <TableCell>{p.current_document_id ? <Badge variant="outline">Vinculado</Badge> : <span className="text-xs text-muted-foreground">—</span>}</TableCell>
                  <TableCell className="flex gap-1" onClick={(e) => e.stopPropagation()}>
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(p); setDialogOpen(true); }}><Edit className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => confirm("Remover?") && removeProcess.mutate(p.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {dialogOpen && <ProcessDialog open={dialogOpen} onClose={() => { setDialogOpen(false); setEditing(null); }} process={editing} />}
      <ProcessDrawer process={drawer} open={!!drawer} onClose={() => setDrawer(null)} />
    </div>
  );
};

export default Processes;
