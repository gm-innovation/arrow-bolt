
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

// Mock service order data
const mockServiceOrder = {
  id: "OS-001",
  date: new Date(),
  location: "Porto de Santos",
  access: "Acesso Principal",
  requester: {
    name: "João Silva",
    role: "Supervisor de Operações",
  },
  supervisor: {
    name: "Maria Santos",
  },
  team: {
    leadTechnician: "Pedro Oliveira",
    assistants: ["Carlos Souza", "Ana Lima"],
  },
  service: "Manutenção Preventiva",
};

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
        <ReportPDFViewer 
          report={report} 
          taskId={taskId} 
          serviceOrder={mockServiceOrder}
        />
      </DialogContent>
    </Dialog>
  );
};
