import { useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Paperclip, Plus } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useQualityAuditAttachments, type AuditAttachment } from "@/hooks/useQualityAuditAttachments";

const KIND_LABELS: Record<AuditAttachment["kind"], string> = {
  plan: "Plano", evidence: "Evidência", report: "Relatório", photo: "Foto", other: "Outro",
};

const AuditAttachmentsDrawer = ({ auditId, title, open, onClose }: { auditId: string | null; title: string; open: boolean; onClose: () => void; }) => {
  const { attachments, add, remove } = useQualityAuditAttachments(auditId);
  const [form, setForm] = useState({ file_name: "", file_url: "", kind: "evidence" as AuditAttachment["kind"], notes: "" });

  const submit = () => {
    if (!form.file_name || !form.file_url) return;
    add.mutate(form, { onSuccess: () => setForm({ file_name: "", file_url: "", kind: "evidence", notes: "" }) });
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader><SheetTitle className="flex items-center gap-2"><Paperclip className="h-4 w-4" />Anexos — {title}</SheetTitle></SheetHeader>
        <div className="space-y-3 mt-4 border rounded p-3">
          <div className="grid grid-cols-2 gap-2">
            <div><Label>Nome do arquivo</Label><Input value={form.file_name} onChange={(e) => setForm(s => ({ ...s, file_name: e.target.value }))} /></div>
            <div>
              <Label>Tipo</Label>
              <Select value={form.kind} onValueChange={(v: any) => setForm(s => ({ ...s, kind: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>{Object.entries(KIND_LABELS).map(([k, v]) => <SelectItem key={k} value={k}>{v}</SelectItem>)}</SelectContent>
              </Select>
            </div>
          </div>
          <div><Label>URL</Label><Input value={form.file_url} onChange={(e) => setForm(s => ({ ...s, file_url: e.target.value }))} placeholder="https://..." /></div>
          <div><Label>Notas</Label><Input value={form.notes} onChange={(e) => setForm(s => ({ ...s, notes: e.target.value }))} /></div>
          <Button onClick={submit} disabled={add.isPending} size="sm"><Plus className="h-4 w-4 mr-1" />Adicionar</Button>
        </div>
        <Table className="mt-4">
          <TableHeader><TableRow><TableHead>Tipo</TableHead><TableHead>Arquivo</TableHead><TableHead>Data</TableHead><TableHead></TableHead></TableRow></TableHeader>
          <TableBody>
            {attachments.length === 0 && <TableRow><TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">Sem anexos.</TableCell></TableRow>}
            {attachments.map(a => (
              <TableRow key={a.id}>
                <TableCell><Badge variant="outline">{KIND_LABELS[a.kind]}</Badge></TableCell>
                <TableCell><a href={a.file_url} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">{a.file_name}</a></TableCell>
                <TableCell className="text-xs">{format(parseISO(a.created_at), "dd/MM/yyyy")}</TableCell>
                <TableCell><Button size="icon" variant="ghost" onClick={() => remove.mutate(a.id)}><Trash2 className="h-4 w-4" /></Button></TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SheetContent>
    </Sheet>
  );
};

export default AuditAttachmentsDrawer;
