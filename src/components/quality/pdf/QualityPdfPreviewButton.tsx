import { useState, type ReactElement } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from "@/components/ui/dialog";
import { Printer } from "lucide-react";
import { PDFViewer, PDFDownloadLink } from "@react-pdf/renderer";

interface QualityPdfPreviewButtonProps {
  /** Documento já renderizado, ex: <NcrFormalPdf ... /> */
  document: ReactElement;
  /** Nome do arquivo para download */
  fileName: string;
  /** Texto do botão (padrão: "PDF") */
  buttonLabel?: string;
  /** Título do dialog */
  dialogTitle?: string;
  /** Variante do botão */
  variant?: "default" | "outline" | "ghost" | "secondary";
  size?: "sm" | "default" | "icon";
  iconOnly?: boolean;
}

/** Botão genérico que abre dialog com PDFViewer + link de download. */
export const QualityPdfPreviewButton = ({
  document,
  fileName,
  buttonLabel = "PDF",
  dialogTitle = "Visualização do PDF",
  variant = "outline",
  size = "sm",
  iconOnly = false,
}: QualityPdfPreviewButtonProps) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button variant={variant} size={size} onClick={() => setOpen(true)} title={buttonLabel}>
        <Printer className={iconOnly ? "h-4 w-4" : "h-4 w-4 mr-1"} />
        {!iconOnly && buttonLabel}
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-w-[92vw] h-[88vh] flex flex-col">
          <DialogHeader>
            <DialogTitle>{dialogTitle}</DialogTitle>
            <DialogDescription className="flex items-center justify-between">
              <span>Pré-visualização do documento controlado.</span>
              <PDFDownloadLink document={document} fileName={fileName}>
                {({ loading }) => (
                  <Button size="sm" disabled={loading}>
                    {loading ? "Gerando…" : "Baixar PDF"}
                  </Button>
                )}
              </PDFDownloadLink>
            </DialogDescription>
          </DialogHeader>
          <div className="flex-1 min-h-0">
            <PDFViewer width="100%" height="100%" showToolbar>
              {document}
            </PDFViewer>
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default QualityPdfPreviewButton;
