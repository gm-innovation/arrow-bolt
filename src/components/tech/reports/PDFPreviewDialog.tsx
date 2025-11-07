
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ReportPDFViewer } from "./ReportPDF";
import { TaskReport } from "./types";

interface ServiceOrderData {
  id: string;
  date: Date;
  location: string;
  access: string;
  requester: {
    name: string;
    role: string;
  };
  supervisor: {
    name: string;
  };
  team: {
    leadTechnician: string;
    assistants: string[];
  };
  service: string;
}

interface PDFPreviewDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  report: TaskReport;
  taskId: string;
  serviceOrder?: ServiceOrderData;
}

export const PDFPreviewDialog = ({
  open,
  onOpenChange,
  report,
  taskId,
  serviceOrder,
}: PDFPreviewDialogProps) => {
  // Use provided service order data or fallback to mock
  const mockServiceOrder = {
    id: "OS-001",
    date: new Date(),
    location: "Local não especificado",
    access: "Acesso padrão",
    requester: {
      name: "N/A",
      role: "Solicitante",
    },
    supervisor: {
      name: "N/A",
    },
    team: {
      leadTechnician: "N/A",
      assistants: [],
    },
    service: "Serviço não especificado",
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-[90vw] h-[80vh]">
        <DialogHeader>
          <DialogTitle>Visualização do PDF</DialogTitle>
          <DialogDescription>
            Visualize, baixe ou salve o relatório no servidor
          </DialogDescription>
        </DialogHeader>
        <ReportPDFViewer 
          report={report} 
          taskId={taskId} 
          serviceOrder={serviceOrder || mockServiceOrder}
        />
      </DialogContent>
    </Dialog>
  );
};
