import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useQualityControlledCopies, ControlledCopyStatus } from "@/hooks/useQualityControlledCopies";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { format, parseISO } from "date-fns";

interface Props {
  documentId: string;
  currentVersionId: string | null;
}

const statusLabel: Record<ControlledCopyStatus, string> = {
  issued: "Emitida",
  returned: "Recolhida",
  destroyed: "Inutilizada",
  lost: "Extraviada",
  superseded: "Substituída",
};

const statusVariant = (s: ControlledCopyStatus): any =>
  s === "issued" ? "default" : s === "destroyed" || s === "lost" ? "destructive" : "secondary";

const DocumentControlledCopiesPanel = ({ documentId, currentVersionId }: Props) => {
  const { copies, issue, updateStatus } = useQualityControlledCopies(documentId);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ recipient_name: "", recipient_location: "", notes: "" });

  const submit = async () => {
    if (!currentVersionId) {
      alert("Documento precisa ter uma versão publicada antes de gerar cópias controladas.");
      return;
    }
    await issue.mutateAsync({
      document_id: documentId,
      version_id: currentVersionId,
      recipient_name: form.recipient_name || null,
      recipient_location: form.recipient_location || null,
      notes: form.notes || null,
    });
    setForm({ recipient_name: "", recipient_location: "", notes: "" });
    setOpen(false);
  };

  return (
    <Card>
      <CardContent className="pt-6 space-y-4">
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Registro formal das cópias impressas controladas: quem recebeu, quando, status e recolhimento/inutilização.
          </p>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button size="sm" disabled={!currentVersionId}>
                <Plus className="h-4 w-4 mr-2" /> Registrar cópia impressa
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Nova cópia controlada</DialogTitle>
              </DialogHeader>
              <div className="space-y-3">
                <div className="space-y-1">
                  <Label>Destinatário</Label>
                  <Input
                    value={form.recipient_name}
                    onChange={(e) => setForm({ ...form, recipient_name: e.target.value })}
                    placeholder="Nome de quem recebe a cópia impressa"
                  />
                </div>
                <div className="space-y-1">
                  <Label>Local / Setor</Label>
                  <Input
                    value={form.recipient_location}
                    onChange={(e) => setForm({ ...form, recipient_location: e.target.value })}
                    placeholder="Ex.: Sala de Laboratório, Almoxarifado, etc."
                  />
                </div>
                <div className="space-y-1">
                  <Label>Observações</Label>
                  <Input value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setOpen(false)}>
                  Cancelar
                </Button>
                <Button onClick={submit}>Registrar</Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>

        {copies.length === 0 ? (
          <p className="text-center py-6 text-sm text-muted-foreground">Nenhuma cópia controlada registrada.</p>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nº</TableHead>
                <TableHead>Destinatário</TableHead>
                <TableHead>Local</TableHead>
                <TableHead>Emitida em</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {copies.map((c: any) => (
                <TableRow key={c.id}>
                  <TableCell className="font-mono">{c.copy_number}</TableCell>
                  <TableCell>{c.recipient?.full_name || c.recipient_name || "—"}</TableCell>
                  <TableCell>{c.recipient_location || "—"}</TableCell>
                  <TableCell>{format(parseISO(c.issued_at), "dd/MM/yyyy HH:mm")}</TableCell>
                  <TableCell>
                    <Badge variant={statusVariant(c.status)}>{statusLabel[c.status as ControlledCopyStatus]}</Badge>
                  </TableCell>
                  <TableCell>
                    {c.status === "issued" && (
                      <div className="flex gap-1">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => updateStatus.mutate({ id: c.id, status: "returned" })}
                        >
                          <RotateCcw className="h-3 w-3 mr-1" /> Recolher
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => updateStatus.mutate({ id: c.id, status: "destroyed" })}
                        >
                          <Trash2 className="h-3 w-3 mr-1 text-destructive" /> Inutilizar
                        </Button>
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
};

export default DocumentControlledCopiesPanel;
