import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { MeasurementForm } from "./MeasurementForm";

interface MeasurementDialogProps {
  serviceOrderId: string;
  onClose?: () => void;
  readOnly?: boolean;
}

export const MeasurementDialog = ({ serviceOrderId, onClose, readOnly }: MeasurementDialogProps) => {
  return (
    <DialogContent className="max-w-6xl max-h-[90vh] flex flex-col">
      <DialogHeader>
        <DialogTitle>Medição Final{readOnly ? " (Somente leitura)" : ""}</DialogTitle>
        <DialogDescription>
          {readOnly
            ? "Visualização da medição técnica e orçamento da ordem de serviço"
            : "Gerenciar medição técnica e orçamento da ordem de serviço"}
        </DialogDescription>
      </DialogHeader>
      <div className="flex-1 overflow-y-auto pr-2">
        <MeasurementForm serviceOrderId={serviceOrderId} onClose={onClose} readOnly={readOnly} />
      </div>
    </DialogContent>
  );
};
