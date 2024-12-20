import { DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { NewOrderForm } from "./NewOrderForm";
import { UseFormReturn } from "react-hook-form";

type FormData = {
  orderNumber: string;
};

interface NewOrderDialogProps {
  form: UseFormReturn<FormData>;
}

export const NewOrderDialog = ({ form }: NewOrderDialogProps) => {
  return (
    <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
      <DialogHeader className="flex-none flex flex-row justify-between items-center border-b pb-4">
        <DialogTitle>Nova Ordem de Serviço</DialogTitle>
        <Form {...form}>
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
        </Form>
      </DialogHeader>
      <div className="flex-1 overflow-y-auto pr-2">
        <NewOrderForm />
      </div>
    </DialogContent>
  );
};