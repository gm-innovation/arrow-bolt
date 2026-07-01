import { useEffect, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import {
  Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import { useQualityInterestedParties, usePartyEvidences, QIPCategory } from "@/hooks/useQualityInterestedParties";
import {
  usePartyProcessLinks,
  RELATIONSHIP_LABELS,
  RELEVANCE_LABELS,
  type PartyProcessRelationship,
  type PartyProcessRelevance,
} from "@/hooks/useQualityPartyProcesses";
import { useQualityProcesses } from "@/hooks/useQualityProcesses";
import { CheckCircle2, FileText, Plus, Trash2, Download, Clock, Workflow, Link2 } from "lucide-react";
import { format, parseISO } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import PartyTreatmentHistoryTab from "@/components/quality/PartyTreatmentHistoryTab";

interface Props {
  partyId: string | null;
  onClose: () => void;
}

const CATEGORIES: { value: QIPCategory; label: string }[] = [
  { value: "cliente", label: "Cliente" },
  { value: "fornecedor", label: "Fornecedor" },
  { value: "orgao_regulador", label: "Órgão Regulador" },
  { value: "sociedade", label: "Sociedade" },
  { value: "colaborador", label: "Colaborador" },
  { value: "acionista", label: "Acionista" },
  { value: "parceiro", label: "Parceiro" },
  { value: "outro", label: "Outro" },
];

const EVIDENCE_TYPES = [
  "documento", "e-mail", "ata", "pesquisa", "licença", "certificado", "autorização", "outro",
];

const InterestedPartyDrawer = ({ partyId, onClose }: Props) => {
  const { parties, update, markReviewed } = useQualityInterestedParties();
  const party = parties.find((p) => p.id === partyId);
  const { evidences, create: addEvidence, remove: rmEvidence } = usePartyEvidences(partyId ?? undefined);

  const [edit, setEdit] = useState<any>(null);
  const [reviewOpen, setReviewOpen] = useState(false);
  const [reviewNotes, setReviewNotes] = useState("");
  const [evOpen, setEvOpen] = useState(false);
  const [evForm, setEvForm] = useState({
    title: "",
    description: "",
    evidence_type: "documento",
    evidence_date: "",
    valid_until: "",
    file: null as File | null,
  });

  useEffect(() => {
    if (party) {
      setEdit({
        name: party.name,
        category: party.category,
        relevance: party.relevance,
        status: party.status,
        needs_expectations: party.needs_expectations ?? "",
        monitoring_method: party.monitoring_method ?? "",
        review_frequency_months: party.review_frequency_months ?? 12,
      });
    } else {
      setEdit(null);
    }
  }, [party?.id]);

  const downloadEvidence = async (path: string) => {
    const { data, error } = await supabase.storage.from("quality-evidences").createSignedUrl(path, 60);
    if (!error && data?.signedUrl) window.open(data.signedUrl, "_blank");
  };

  const submitEv = async () => {
    if (!evForm.title.trim()) return;
    await addEvidence.mutateAsync({
      title: evForm.title.trim(),
      description: evForm.description || null,
      evidence_type: evForm.evidence_type,
      evidence_date: evForm.evidence_date || null,
      valid_until: evForm.valid_until || null,
      file: evForm.file,
    });
    setEvForm({ title: "", description: "", evidence_type: "documento", evidence_date: "", valid_until: "", file: null });
    setEvOpen(false);
  };

  return (
    <Sheet open={!!partyId} onOpenChange={(o) => !o && onClose()}>
      <SheetContent side="right" className="sm:max-w-2xl overflow-y-auto">
        {party && edit && (
          <>
            <SheetHeader>
              <SheetTitle className="flex items-center gap-2">
                {party.name}
                <Badge variant="outline" className="capitalize">{party.status}</Badge>
              </SheetTitle>
            </SheetHeader>

            <Tabs defaultValue="data" className="mt-4">
              <TabsList>
                <TabsTrigger value="data">Dados</TabsTrigger>
                <TabsTrigger value="evidences">Evidências</TabsTrigger>
                <TabsTrigger value="treatments"><Clock className="h-3 w-3 mr-1" /> Tratativas</TabsTrigger>
                <TabsTrigger value="review">Revisão</TabsTrigger>
              </TabsList>

              <TabsContent value="data" className="space-y-3 mt-4">
                <div className="space-y-1">
                  <Label>Nome</Label>
                  <Input value={edit.name} onChange={(e) => setEdit({ ...edit, name: e.target.value })} />
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="space-y-1">
                    <Label>Categoria</Label>
                    <Select value={edit.category} onValueChange={(v) => setEdit({ ...edit, category: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        {CATEGORIES.map((c) => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Relevância</Label>
                    <Select value={edit.relevance} onValueChange={(v) => setEdit({ ...edit, relevance: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="alta">Alta</SelectItem>
                        <SelectItem value="media">Média</SelectItem>
                        <SelectItem value="baixa">Baixa</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-1">
                    <Label>Status</Label>
                    <Select value={edit.status} onValueChange={(v) => setEdit({ ...edit, status: v })}>
                      <SelectTrigger><SelectValue /></SelectTrigger>
                      <SelectContent>
                        <SelectItem value="ativo">Ativo</SelectItem>
                        <SelectItem value="inativo">Inativo</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-1">
                  <Label>Necessidades e expectativas</Label>
                  <Textarea
                    rows={3}
                    value={edit.needs_expectations}
                    onChange={(e) => setEdit({ ...edit, needs_expectations: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Método de monitoramento</Label>
                  <Textarea
                    rows={2}
                    value={edit.monitoring_method}
                    onChange={(e) => setEdit({ ...edit, monitoring_method: e.target.value })}
                  />
                </div>
                <div className="space-y-1">
                  <Label>Ciclo de revisão (meses)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={edit.review_frequency_months}
                    onChange={(e) => setEdit({ ...edit, review_frequency_months: Number(e.target.value) || 0 })}
                  />
                </div>
                <div className="flex justify-end">
                  <Button
                    onClick={() => update.mutate({ id: party.id, ...edit })}
                  >
                    Salvar alterações
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="evidences" className="space-y-3 mt-4">
                <div className="flex justify-between items-center">
                  <p className="text-sm text-muted-foreground">
                    {evidences.length} evidência{evidences.length === 1 ? "" : "s"} registrada{evidences.length === 1 ? "" : "s"}
                  </p>
                  <Dialog open={evOpen} onOpenChange={setEvOpen}>
                    <DialogTrigger asChild>
                      <Button size="sm"><Plus className="h-4 w-4 mr-2" /> Nova evidência</Button>
                    </DialogTrigger>
                    <DialogContent>
                      <DialogHeader><DialogTitle>Nova evidência</DialogTitle></DialogHeader>
                      <div className="grid gap-3">
                        <div className="space-y-1">
                          <Label>Título *</Label>
                          <Input value={evForm.title} onChange={(e) => setEvForm({ ...evForm, title: e.target.value })} />
                        </div>
                        <div className="grid grid-cols-2 gap-3">
                          <div className="space-y-1">
                            <Label>Tipo</Label>
                            <Select value={evForm.evidence_type} onValueChange={(v) => setEvForm({ ...evForm, evidence_type: v })}>
                              <SelectTrigger><SelectValue /></SelectTrigger>
                              <SelectContent>
                                {EVIDENCE_TYPES.map((t) => <SelectItem key={t} value={t} className="capitalize">{t}</SelectItem>)}
                              </SelectContent>
                            </Select>
                          </div>
                          <div className="space-y-1">
                            <Label>Data da evidência</Label>
                            <Input type="date" value={evForm.evidence_date} onChange={(e) => setEvForm({ ...evForm, evidence_date: e.target.value })} />
                          </div>
                        </div>
                        <div className="space-y-1">
                          <Label>Validade (opcional, para licenças/certificados)</Label>
                          <Input type="date" value={evForm.valid_until} onChange={(e) => setEvForm({ ...evForm, valid_until: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                          <Label>Descrição</Label>
                          <Textarea rows={2} value={evForm.description} onChange={(e) => setEvForm({ ...evForm, description: e.target.value })} />
                        </div>
                        <div className="space-y-1">
                          <Label>Arquivo (opcional)</Label>
                          <Input type="file" onChange={(e) => setEvForm({ ...evForm, file: e.target.files?.[0] ?? null })} />
                        </div>
                      </div>
                      <DialogFooter>
                        <Button variant="outline" onClick={() => setEvOpen(false)}>Cancelar</Button>
                        <Button onClick={submitEv} disabled={!evForm.title.trim() || addEvidence.isPending}>Registrar</Button>
                      </DialogFooter>
                    </DialogContent>
                  </Dialog>
                </div>
                <div className="space-y-2">
                  {evidences.map((ev) => (
                    <div key={ev.id} className="border rounded p-3 flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <FileText className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{ev.title}</span>
                          <Badge variant="outline" className="capitalize">{ev.evidence_type}</Badge>
                        </div>
                        {ev.description && <p className="text-sm text-muted-foreground mt-1">{ev.description}</p>}
                        <div className="text-xs text-muted-foreground mt-1 flex gap-3">
                          {ev.evidence_date && <span>Emitida: {format(parseISO(ev.evidence_date), "dd/MM/yyyy")}</span>}
                          {ev.valid_until && <span>Validade: {format(parseISO(ev.valid_until), "dd/MM/yyyy")}</span>}
                        </div>
                      </div>
                      <div className="flex gap-1">
                        {ev.external_file_path && (
                          <Button size="icon" variant="ghost" onClick={() => downloadEvidence(ev.external_file_path!)}>
                            <Download className="h-4 w-4" />
                          </Button>
                        )}
                        <Button size="icon" variant="ghost" onClick={() => { if (confirm("Remover evidência?")) rmEvidence.mutate(ev); }}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </div>
                  ))}
                  {evidences.length === 0 && (
                    <p className="text-sm text-muted-foreground text-center py-4">Nenhuma evidência registrada.</p>
                  )}
                </div>
              </TabsContent>

              <TabsContent value="treatments" className="space-y-3 mt-4">
                <PartyTreatmentHistoryTab partyId={party.id} />
              </TabsContent>



              <TabsContent value="review" className="space-y-3 mt-4">
                <div className="text-sm space-y-2">
                  <div><span className="text-muted-foreground">Última revisão:</span> {party.last_reviewed_at ? format(parseISO(party.last_reviewed_at), "dd/MM/yyyy") : "—"}</div>
                  <div><span className="text-muted-foreground">Próxima revisão:</span> {party.next_review_due_at ? format(parseISO(party.next_review_due_at), "dd/MM/yyyy") : "—"}</div>
                  <div><span className="text-muted-foreground">Notas:</span> {party.last_review_notes || "—"}</div>
                </div>
                <Dialog open={reviewOpen} onOpenChange={setReviewOpen}>
                  <DialogTrigger asChild>
                    <Button><CheckCircle2 className="h-4 w-4 mr-2" /> Marcar como revisada</Button>
                  </DialogTrigger>
                  <DialogContent>
                    <DialogHeader><DialogTitle>Registrar revisão</DialogTitle></DialogHeader>
                    <div className="space-y-2">
                      <Label>Observação (opcional)</Label>
                      <Textarea rows={4} value={reviewNotes} onChange={(e) => setReviewNotes(e.target.value)} />
                    </div>
                    <DialogFooter>
                      <Button variant="outline" onClick={() => setReviewOpen(false)}>Cancelar</Button>
                      <Button
                        onClick={async () => {
                          await markReviewed.mutateAsync({ id: party.id, notes: reviewNotes || null });
                          setReviewNotes("");
                          setReviewOpen(false);
                        }}
                      >
                        Registrar
                      </Button>
                    </DialogFooter>
                  </DialogContent>
                </Dialog>
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default InterestedPartyDrawer;
