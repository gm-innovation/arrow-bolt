import { useState } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Card } from "@/components/ui/card";
import { Trash2, Plus } from "lucide-react";
import { useMeasurementExpenses } from "@/hooks/useMeasurementExpenses";
import { useMeasurementSettings } from "@/hooks/useMeasurementSettings";

const expenseSchema = z.object({
  expense_type: z.enum(['hospedagem', 'alimentacao']),
  base_value: z.number().min(0, "Valor deve ser maior ou igual a 0"),
  description: z.string().max(500).optional(),
});

interface ExpensesTabProps {
  measurementId: string;
  expenses: any[];
  disabled?: boolean;
}

export const ExpensesTab = ({ measurementId, expenses, disabled }: ExpensesTabProps) => {
  const [isAdding, setIsAdding] = useState(false);
  const { addExpense, removeExpense } = useMeasurementExpenses();
  const { settings } = useMeasurementSettings();

  const form = useForm({
    resolver: zodResolver(expenseSchema),
    defaultValues: {
      expense_type: 'hospedagem' as const,
      base_value: 0,
      description: '',
    },
  });

  const onSubmit = (data: z.infer<typeof expenseSchema>) => {
    const adminFeePercentage = settings?.expense_admin_fee || 20;
    const adminFeeAmount = data.base_value * (adminFeePercentage / 100);
    const totalValue = data.base_value + adminFeeAmount;

    addExpense.mutate({
      measurement_id: measurementId,
      expense_type: data.expense_type,
      base_value: data.base_value,
      admin_fee_percentage: adminFeePercentage,
      admin_fee_amount: adminFeeAmount,
      total_value: totalValue,
      description: data.description?.trim(),
    });

    form.reset();
    setIsAdding(false);
  };

  const expenseTypeLabels = {
    hospedagem: 'Hospedagem',
    alimentacao: 'Alimentação',
  };

  return (
    <div className="space-y-4">
      {!disabled && !isAdding && (
        <Button onClick={() => setIsAdding(true)} size="sm">
          <Plus className="h-4 w-4 mr-2" />
          Adicionar Despesa
        </Button>
      )}

      {isAdding && (
        <Card className="p-4">
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <div className="space-y-2">
              <Label>Tipo de Despesa</Label>
              <Select onValueChange={(v) => form.setValue('expense_type', v as any)}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="hospedagem">Hospedagem</SelectItem>
                  <SelectItem value="alimentacao">Alimentação</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Valor Base (R$)</Label>
              <Input
                type="number"
                step="0.01"
                {...form.register('base_value', { valueAsNumber: true })}
              />
              <p className="text-xs text-muted-foreground">
                Taxa administrativa de {settings?.expense_admin_fee || 20}% será aplicada
              </p>
            </div>

            <div className="space-y-2">
              <Label>Descrição (Opcional)</Label>
              <Input
                {...form.register('description')}
                placeholder="Ex: Hotel 3 diárias"
              />
            </div>

            <div className="flex gap-2">
              <Button type="submit" size="sm">Adicionar</Button>
              <Button type="button" variant="outline" size="sm" onClick={() => setIsAdding(false)}>
                Cancelar
              </Button>
            </div>
          </form>
        </Card>
      )}

      {expenses.length > 0 ? (
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tipo</TableHead>
              <TableHead>Descrição</TableHead>
              <TableHead className="text-right">Valor Base</TableHead>
              <TableHead className="text-right">Taxa Admin.</TableHead>
              <TableHead className="text-right">Total</TableHead>
              {!disabled && <TableHead></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {expenses.map((item) => (
              <TableRow key={item.id}>
                <TableCell className="font-medium">
                  {expenseTypeLabels[item.expense_type as keyof typeof expenseTypeLabels]}
                </TableCell>
                <TableCell className="text-muted-foreground">
                  {item.description || '-'}
                </TableCell>
                <TableCell className="text-right">
                  R$ {Number(item.base_value).toFixed(2)}
                </TableCell>
                <TableCell className="text-right">
                  {item.admin_fee_percentage}%
                  <br />
                  <span className="text-xs text-muted-foreground">
                    R$ {Number(item.admin_fee_amount).toFixed(2)}
                  </span>
                </TableCell>
                <TableCell className="text-right font-medium">
                  R$ {Number(item.total_value).toFixed(2)}
                </TableCell>
                {!disabled && (
                  <TableCell>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => removeExpense.mutate(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </TableCell>
                )}
              </TableRow>
            ))}
          </TableBody>
        </Table>
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          Nenhuma despesa adicionada
        </div>
      )}
    </div>
  );
};
