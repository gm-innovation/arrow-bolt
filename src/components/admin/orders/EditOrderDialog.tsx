import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { NewOrderForm } from "./NewOrderForm";

interface EditOrderDialogProps {
  orderId: string;
}

export const EditOrderDialog = ({ orderId }: EditOrderDialogProps) => {
  return (
    <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
      <DialogHeader>
        <DialogTitle>Editar Ordem de Serviço</DialogTitle>
        <DialogDescription>
          Editando OS #{orderId}
        </DialogDescription>
      </DialogHeader>
      <div className="flex-1 overflow-y-auto pr-2">
        <NewOrderForm isEditing orderId={orderId} />
      </div>
    </DialogContent>
  );
};