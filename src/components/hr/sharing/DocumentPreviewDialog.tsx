import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { PDFCanvasViewer } from "@/components/ui/PDFCanvasViewer";
import { downloadHrDoc, hrDocErrorMessage } from "@/hooks/useHRDocumentCompliance";
import { logHrDocAccess } from "@/hooks/useHRDocumentSharing";
import { Download, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";

export interface PreviewDoc {
  id?: string;
  file_name?: string | null;
  file_path: string;
  storage_bucket?: string | null;
  employee_id?: string | null;
}

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  doc: PreviewDoc | null;
  /** Registra a visualização no log de acessos (compartilhamento). */
  logAccess?: boolean;
}

const extOf = (name?: string | null) => (name ?? "").split(".").pop()?.toLowerCase() ?? "";
const isImage = (name?: string | null) => ["jpg", "jpeg", "png", "gif", "webp", "bmp"].includes(extOf(name));
const isPdf = (name?: string | null) => extOf(name) === "pdf";

export const DocumentPreviewDialog = ({ open, onOpenChange, doc, logAccess }: Props) => {
  const [blob, setBlob] = useState<Blob | null>(null);
  const [imageUrl, setImageUrl] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !doc) return;
    let cancelled = false;
    let objectUrl: string | null = null;

    (async () => {
      setLoading(true);
      setError(null);
      setBlob(null);
      setImageUrl(null);
      try {
        const data = await downloadHrDoc({ file_path: doc.file_path, storage_bucket: doc.storage_bucket });
        if (cancelled) return;
        setBlob(data);
        if (isImage(doc.file_name ?? doc.file_path)) {
          objectUrl = URL.createObjectURL(data);
          setImageUrl(objectUrl);
        }
        if (logAccess && doc.id) {
          void logHrDocAccess({ document_id: doc.id, employee_id: doc.employee_id ?? undefined, action: "view" });
        }
      } catch (e: any) {
        if (!cancelled) setError(hrDocErrorMessage(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();

    return () => {
      cancelled = true;
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [open, doc, logAccess]);

  const handleDownload = () => {
    if (!blob || !doc) return;
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.file_name || "documento";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
    if (logAccess && doc.id) {
      void logHrDocAccess({ document_id: doc.id, employee_id: doc.employee_id ?? undefined, action: "download" });
    }
    toast.success("Download iniciado");
  };

  const name = doc?.file_name ?? doc?.file_path ?? "";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl h-[88vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="truncate">{doc?.file_name || "Documento"}</DialogTitle>
          <DialogDescription className="flex items-center justify-between gap-3">
            <span className="text-xs">Pré-visualização do documento do colaborador.</span>
            <Button size="sm" onClick={handleDownload} disabled={!blob}>
              <Download className="h-4 w-4 mr-1" /> Baixar
            </Button>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 min-h-0">
          {loading && (
            <div className="h-full flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {!loading && error && (
            <div className="h-full flex items-center justify-center text-sm text-destructive px-6 text-center">
              {error}
            </div>
          )}

          {!loading && !error && blob && isPdf(name) && <PDFCanvasViewer blob={blob} className="h-full" />}

          {!loading && !error && imageUrl && (
            <div className="h-full overflow-auto bg-muted/30 p-2 flex items-start justify-center">
              <img src={imageUrl} alt={doc?.file_name || "Documento do colaborador"} className="max-w-full h-auto" />
            </div>
          )}

          {!loading && !error && blob && !isPdf(name) && !imageUrl && (
            <div className="h-full flex flex-col items-center justify-center gap-3 text-center px-6">
              <FileText className="h-10 w-10 text-muted-foreground" />
              <p className="text-sm text-muted-foreground">
                Este formato não permite pré-visualização. Baixe o arquivo para abrir no seu computador.
              </p>
              <Button onClick={handleDownload}>
                <Download className="h-4 w-4 mr-1" /> Baixar arquivo
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default DocumentPreviewDialog;
