import { useRef, useState } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Trash2, Paperclip, Upload, Loader2, FileText } from "lucide-react";
import { format, parseISO } from "date-fns";
import { toast } from "@/hooks/use-toast";
import { useQualityAuditAttachments, type AuditAttachment } from "@/hooks/useQualityAuditAttachments";

const KIND_LABELS: Record<AuditAttachment["kind"], string> = {
  plan: "Plano", evidence: "Evidência", report: "Relatório", photo: "Foto", other: "Outro",
};

const MAX_SIZE = 25 * 1024 * 1024; // 25 MB
const ACCEPT =
  ".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.csv,.txt,.png,.jpg,.jpeg,.webp";
const ALLOWED_EXT = [
  "pdf", "doc", "docx", "xls", "xlsx", "ppt", "pptx", "csv", "txt", "png", "jpg", "jpeg", "webp",
];

const AuditAttachmentsDrawer = ({
  auditId,
  title,
  open,
  onClose,
}: {
  auditId: string | null;
  title: string;
  open: boolean;
  onClose: () => void;
}) => {
  const { attachments, add, remove, openAttachment } = useQualityAuditAttachments(auditId);
  const [kind, setKind] = useState<AuditAttachment["kind"]>("evidence");
  const [notes, setNotes] = useState("");
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndUpload = (file: File) => {
    const ext = file.name.split(".").pop()?.toLowerCase() ?? "";
    if (!ALLOWED_EXT.includes(ext)) {
      toast({
        title: "Tipo de arquivo não suportado",
        description: `Envie um dos formatos: ${ALLOWED_EXT.join(", ").toUpperCase()}.`,
        variant: "destructive",
      });
      return;
    }
    if (file.size > MAX_SIZE) {
      toast({
        title: "Arquivo excede 25 MB",
        description: "Reduza o tamanho antes de enviar.",
        variant: "destructive",
      });
      return;
    }
    add.mutate(
      { file, kind, notes: notes || undefined },
      {
        onSuccess: () => {
          setNotes("");
          if (inputRef.current) inputRef.current.value = "";
        },
      },
    );
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file) validateAndUpload(file);
  };

  return (
    <Sheet open={open} onOpenChange={(v) => !v && onClose()}>
      <SheetContent className="w-full sm:max-w-xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle className="flex items-center gap-2">
            <Paperclip className="h-4 w-4" />
            Anexos — {title}
          </SheetTitle>
        </SheetHeader>

        <div className="space-y-3 mt-4 border rounded p-3">
          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label>Tipo</Label>
              <Select value={kind} onValueChange={(v: any) => setKind(v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(KIND_LABELS).map(([k, v]) => (
                    <SelectItem key={k} value={k}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Notas (opcional)</Label>
              <Input value={notes} onChange={(e) => setNotes(e.target.value)} />
            </div>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={onDrop}
            className={`relative border-2 border-dashed rounded-md p-6 text-center transition-colors ${
              dragOver ? "border-primary bg-primary/5" : "border-muted-foreground/30"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept={ACCEPT}
              disabled={add.isPending || !auditId}
              onChange={(e) => {
                const f = e.target.files?.[0];
                if (f) validateAndUpload(f);
              }}
              className="opacity-0 absolute inset-0 cursor-pointer disabled:cursor-not-allowed"
            />
            <div className="flex flex-col items-center gap-2 pointer-events-none">
              {add.isPending ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  <p className="text-sm text-muted-foreground">Enviando arquivo…</p>
                </>
              ) : (
                <>
                  <Upload className="h-6 w-6 text-muted-foreground" />
                  <p className="text-sm">
                    <span className="font-medium text-primary">Clique para enviar</span> ou arraste um arquivo
                  </p>
                  <p className="text-xs text-muted-foreground">
                    PDF, Word, Excel, PowerPoint, imagens · até 25 MB
                  </p>
                </>
              )}
            </div>
          </div>
        </div>

        <Table className="mt-4">
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Arquivo</TableHead>
              <TableHead>Data</TableHead>
              <TableHead></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {attachments.length === 0 && (
              <TableRow>
                <TableCell colSpan={4} className="text-center text-sm text-muted-foreground py-6">
                  Sem anexos.
                </TableCell>
              </TableRow>
            )}
            {attachments.map((a) => (
              <TableRow key={a.id}>
                <TableCell><Badge variant="outline">{KIND_LABELS[a.kind]}</Badge></TableCell>
                <TableCell>
                  <button
                    type="button"
                    onClick={() => openAttachment(a)}
                    className="text-primary hover:underline inline-flex items-center gap-1 text-left"
                  >
                    <FileText className="h-3.5 w-3.5" />
                    {a.file_name}
                  </button>
                  {a.notes && (
                    <div className="text-xs text-muted-foreground mt-0.5">{a.notes}</div>
                  )}
                </TableCell>
                <TableCell className="text-xs">
                  {format(parseISO(a.created_at), "dd/MM/yyyy")}
                </TableCell>
                <TableCell>
                  <Button
                    size="icon"
                    variant="ghost"
                    onClick={() => remove.mutate(a)}
                    disabled={remove.isPending}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </SheetContent>
    </Sheet>
  );
};

export default AuditAttachmentsDrawer;
