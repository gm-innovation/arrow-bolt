import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { NewOrderForm } from "./NewOrderForm";
import { OmieImportDialog } from "./OmieImportDialog";
import { UseFormReturn } from "react-hook-form";
import { useOmieIntegration } from "@/hooks/useOmieIntegration";

type FormData = {
  orderNumber: string;
  clientReference: string;
};

interface NewOrderDialogProps {
  form: UseFormReturn<FormData>;
  onSuccess?: () => void;
}

export const NewOrderDialog = ({ form, onSuccess }: NewOrderDialogProps) => {
  const orderNumber = form.watch("orderNumber");
  const clientReference = form.watch("clientReference");
  const { isOmieEnabled } = useOmieIntegration();

  const handleOmieImport = (order: {
    orderNumber: string;
    omieOsId: number;
    omieIntegrationCode: string;
    clientOmieId?: number;
    clientName?: string;
  }) => {
    form.setValue("orderNumber", order.orderNumber);
  };

  return (
    <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
      <DialogHeader className="flex-none flex flex-row justify-between items-center border-b pb-4">
        <DialogTitle>Nova Ordem de Serviço</DialogTitle>
        <Form {...form}>
          <div className="flex flex-row items-center gap-4">
            <FormField
              control={form.control}
              name="orderNumber"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2 mb-0">
                  <FormLabel className="mb-0">Nº da OS</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      maxLength={5} 
                      className="w-[100px]" 
                      placeholder="00000"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <FormField
              control={form.control}
              name="clientReference"
              render={({ field }) => (
                <FormItem className="flex flex-row items-center gap-2 mb-0">
                  <FormLabel className="mb-0">Ref. Cliente</FormLabel>
                  <FormControl>
                    <Input 
                      {...field} 
                      maxLength={50} 
                      className="w-[140px]" 
                      placeholder="PC/PO/RFQ..."
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            {isOmieEnabled && (
              <OmieImportDialog onSelectOrder={handleOmieImport} />
            )}
          </div>
        </Form>
      </DialogHeader>
      <div className="flex-1 overflow-y-auto pr-2">
        <NewOrderForm orderNumber={orderNumber} clientReference={clientReference} onSuccess={onSuccess} />
      </div>
    </DialogContent>
  );
};