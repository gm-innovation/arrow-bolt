import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2, AlertCircle, FileText, Edit } from "lucide-react";
import { format, parseISO, differenceInDays } from "date-fns";
import { useQualityCompanyDocuments, type CompanyDocument } from "@/hooks/useQualityCompanyDocuments";
import { useCentralApproval } from "@/hooks/useCentralApproval";
import { useQualitySettings } from "@/hooks/useQualitySettings";

const TYPES = ["CNPJ", "Alvará", "Inscrição Estadual", "Inscrição Municipal", "Contrato Social", "Certificado ISO", "Licença Ambiental", "Outro"];

const StatusBadge = ({ doc }: { doc: CompanyDocument }) => {
  if (!doc.expires_at) return <Badge variant="secondary">{doc.status}</Badge>;
  const days = differenceInDays(parseISO(doc.expires_at), new Date());
  if (days < 0) return <Badge variant="destructive"><AlertCircle className="h-3 w-3 mr-1" />Vencido</Badge>;
  if (days <= 30) return <Badge className="bg-amber-500 text-white">Vence em {days}d</Badge>;
  return <Badge variant="secondary">{doc.status}</Badge>;
};

const DocApprovalCell = ({ id }: { id: string }) => {
  const { approval, request } = useCentralApproval("company_document", id);
  const { approvalScope } = useQualitySettings();
  if (!approvalScope.company_document) return <span className="text-xs text-muted-foreground">—</span>;
  if (!approval) return (
    <Button size="sm" variant="outline" onClick={() => request.mutate(undefined)} disabled={request.isPending}>
      Solicitar aprovação
    </Button>
  );
  return <Badge variant={approval.status === "approved" ? "default" : approval.status === "rejected" ? "destructive" : "secondary"}>
    {approval.status === "approved" ? "Aprovado" : approval.status === "rejected" ? "Rejeitado" : "Pendente Master"}
  </Badge>;
};

const CompanyDocumentDialog = ({ doc, open, onClose }: { doc: Partial<CompanyDocument> | null; open: boolean; onClose: () => void; }) => {
  const { upsert } = useQualityCompanyDocuments();
  const [form, setForm] = useState<Partial<CompanyDocument>>(doc || { document_type: "CNPJ", title: "", status: "active" });

  const submit = () => {
    if (!form.title || !form.document_type) return;
    upsert.mutate(form as any, { onSuccess: onClose });
  };

  return (
    <Dialog open={open} onOpenChange={(v) => !v && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>{doc?.id ? "Editar" : "Novo"} Documento da Empresa</DialogTitle></DialogHeader>
        <div className="space-y-3 py-2">
          <div>
            <Label>Tipo</Label>
            <Select value={form.document_type} onValueChange={(v) => setForm(s => ({ ...s, document_type: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>{TYPES.map(t => <SelectItem key={t} value={t}>{t}</SelectItem>)}</SelectContent>
            </Select>
          </div>
          <div><Label>Título</Label><Input value={form.title || ""} onChange={(e) => setForm(s => ({ ...s, title: e.target.value }))} /></div>
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Emissão</Label><Input type="date" value={form.issued_at || ""} onChange={(e) => setForm(s => ({ ...s, issued_at: e.target.value || null }))} /></div>
            <div><Label>Vencimento</Label><Input type="date" value={form.expires_at || ""} onChange={(e) => setForm(s => ({ ...s, expires_at: e.target.value || null }))} /></div>
          </div>
          <div><Label>URL do arquivo</Label><Input value={form.file_url || ""} onChange={(e) => setForm(s => ({ ...s, file_url: e.target.value || null }))} placeholder="https://..." /></div>
          <div><Label>Nome do arquivo</Label><Input value={form.file_name || ""} onChange={(e) => setForm(s => ({ ...s, file_name: e.target.value || null }))} /></div>
          <div>
            <Label>Status</Label>
            <Select value={form.status} onValueChange={(v: any) => setForm(s => ({ ...s, status: v }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="active">Ativo</SelectItem>
                <SelectItem value="renewing">Em renovação</SelectItem>
                <SelectItem value="expired">Vencido</SelectItem>
                <SelectItem value="archived">Arquivado</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div><Label>Notas</Label><Textarea rows={2} value={form.notes || ""} onChange={(e) => setForm(s => ({ ...s, notes: e.target.value || null }))} /></div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onClose}>Cancelar</Button>
          <Button onClick={submit} disabled={upsert.isPending}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const CompanyDocuments = () => {
  const { documents, remove } = useQualityCompanyDocuments();
  const [editing, setEditing] = useState<Partial<CompanyDocument> | null>(null);
  const [open, setOpen] = useState(false);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold flex items-center gap-2"><FileText className="h-5 w-5" />Documentos da Empresa</h3>
          <p className="text-sm text-muted-foreground">CNPJ, Alvará, IE e demais documentos institucionais com controle de validade.</p>
        </div>
        <Button onClick={() => { setEditing({}); setOpen(true); }}><Plus className="h-4 w-4 mr-1" />Novo</Button>
      </div>
      <Card>
        <CardContent className="p-0">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Tipo</TableHead>
                <TableHead>Título</TableHead>
                <TableHead>Vencimento</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Aprovação Master</TableHead>
                <TableHead className="w-24"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {documents.length === 0 && <TableRow><TableCell colSpan={6} className="text-center text-sm text-muted-foreground py-8">Nenhum documento cadastrado.</TableCell></TableRow>}
              {documents.map(d => (
                <TableRow key={d.id}>
                  <TableCell><Badge variant="outline">{d.document_type}</Badge></TableCell>
                  <TableCell className="font-medium">{d.title}</TableCell>
                  <TableCell className="text-sm">{d.expires_at ? format(parseISO(d.expires_at), "dd/MM/yyyy") : "—"}</TableCell>
                  <TableCell><StatusBadge doc={d} /></TableCell>
                  <TableCell><DocApprovalCell id={d.id} /></TableCell>
                  <TableCell className="flex gap-1">
                    <Button size="icon" variant="ghost" onClick={() => { setEditing(d); setOpen(true); }}><Edit className="h-4 w-4" /></Button>
                    <Button size="icon" variant="ghost" onClick={() => confirm("Remover?") && remove.mutate(d.id)}><Trash2 className="h-4 w-4" /></Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
      {open && <CompanyDocumentDialog doc={editing} open={open} onClose={() => { setOpen(false); setEditing(null); }} />}
    </div>
  );
};

export default CompanyDocuments;
