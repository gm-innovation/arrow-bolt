import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReportPDFViewer } from "./ReportPDF";
import { TaskReport } from "./types";

interface PDFPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: TaskReport;
  taskId: string;
}

export const PDFPreviewDialog = ({
  open,
  onOpenChange,
  report,
  taskId,
}: PDFPreviewDialogProps) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] h-[80vh]">
        <DialogHeader>
          <DialogTitle>Visualização do PDF</DialogTitle>
        </DialogHeader>
        <ReportPDFViewer report={report} taskId={taskId} />
      </DialogContent>
    </Dialog>
  );
};