import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useFinanceReimbursements } from "@/hooks/useFinance";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NewReimbursementDialog = ({ open, onOpenChange }: Props) => {
  const { createReimbursement } = useFinanceReimbursements();
  const { register, handleSubmit, reset } = useForm({
    defaultValues: { description: "", amount: "", expense_date: "", notes: "" },
  });

  const onSubmit = async (data: Record<string, string>) => {
    await createReimbursement.mutateAsync({
      description: data.description,
      amount: Number(data.amount),
      expense_date: data.expense_date,
      notes: data.notes,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader><DialogTitle>Solicitar Reembolso</DialogTitle></DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="description">Descrição *</Label>
            <Input id="description" {...register("description", { required: true })} placeholder="Ex: Almoço com cliente" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="amount">Valor (R$) *</Label>
              <Input id="amount" type="number" step="0.01" {...register("amount", { required: true })} />
            </div>
            <div>
              <Label htmlFor="expense_date">Data da Despesa *</Label>
              <Input id="expense_date" type="date" {...register("expense_date", { required: true })} />
            </div>
          </div>
          <div>
            <Label htmlFor="notes">Observações</Label>
            <Textarea id="notes" {...register("notes")} />
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={createReimbursement.isPending}>
              {createReimbursement.isPending ? "Enviando..." : "Solicitar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewReimbursementDialog;
