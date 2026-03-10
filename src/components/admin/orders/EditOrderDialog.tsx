import { useState, useEffect } from "react";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { NewOrderForm } from "./NewOrderForm";
import { supabase } from "@/integrations/supabase/client";

interface EditOrderDialogProps {
  orderId: string;
  onClose?: () => void;
}

export const EditOrderDialog = ({ orderId, onClose }: EditOrderDialogProps) => {
  const [orderNumber, setOrderNumber] = useState("");
  const [clientReference, setClientReference] = useState("");

  useEffect(() => {
    const loadData = async () => {
      const { data } = await supabase
        .from("service_orders")
        .select("order_number, client_reference")
        .eq("id", orderId)
        .single();
      if (data) {
        setOrderNumber(data.order_number || "");
        setClientReference(data.client_reference || "");
      }
    };
    loadData();
  }, [orderId]);

  return (
    <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
      <DialogHeader className="flex-none flex flex-row justify-between items-center border-b pb-4">
        <div>
          <DialogTitle>Editar Ordem de Serviço</DialogTitle>
          <DialogDescription>Editando OS</DialogDescription>
        </div>
        <div className="flex flex-row items-center gap-4">
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">Nº da OS</Label>
            <Input
              value={orderNumber}
              onChange={(e) => setOrderNumber(e.target.value)}
              maxLength={10}
              className="w-[120px]"
              placeholder="00000"
            />
          </div>
          <div className="flex items-center gap-2">
            <Label className="text-sm whitespace-nowrap">Ref. Cliente</Label>
            <Input
              value={clientReference}
              onChange={(e) => setClientReference(e.target.value)}
              maxLength={50}
              className="w-[140px]"
              placeholder="PC/PO/RFQ..."
            />
          </div>
        </div>
      </DialogHeader>
      <div className="flex-1 overflow-y-auto pr-2">
        <NewOrderForm isEditing orderId={orderId} orderNumber={orderNumber} clientReference={clientReference} onSuccess={onClose} />
      </div>
    </DialogContent>
  );
};