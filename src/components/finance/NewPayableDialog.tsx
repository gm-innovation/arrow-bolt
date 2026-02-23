import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useFinancePayables } from "@/hooks/useFinance";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NewPayableDialog = ({ open, onOpenChange }: Props) => {
  const { createPayable } = useFinancePayables();
  const { register, handleSubmit, reset } = useForm({
    defaultValues: { supplier_name: "", description: "", amount: "", due_date: "", invoice_number: "", notes: "" },
  });

  const onSubmit = async (data: Record<string, string>) => {
    await createPayable.mutateAsync({
      supplier_name: data.supplier_name,
      description: data.description,
      amount: Number(data.amount),
      due_date: data.due_date,
      invoice_number: data.invoice_number,
      notes: data.notes,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Nova Conta a Pagar</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="supplier_name">Fornecedor *</Label>
            <Input id="supplier_name" {...register("supplier_name", { required: true })} placeholder="Nome do fornecedor" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">Valor (R$) *</Label>
              <Input id="amount" type="number" step="0.01" {...register("amount", { required: true })} />
            </div>
            <div>
              <Label htmlFor="due_date">Vencimento *</Label>
              <Input id="due_date" type="date" {...register("due_date", { required: true })} />
            </div>
          </div>
          <div>
            <Label htmlFor="invoice_number">Nº Nota Fiscal</Label>
            <Input id="invoice_number" {...register("invoice_number")} />
          </div>
          <div>
            <Label htmlFor="description">Descrição</Label>
            <Textarea id="description" {...register("description")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={createPayable.isPending}>
              {createPayable.isPending ? "Salvando..." : "Registrar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewPayableDialog;
