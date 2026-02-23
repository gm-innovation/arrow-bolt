import { useState } from "react";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from "lucide-react";
import { usePurchaseRequests } from "@/hooks/usePurchaseRequests";

interface NewPurchaseRequestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ItemForm {
  description: string;
  quantity: number;
  unit: string;
  estimated_unit_price: number;
  notes?: string;
}

const NewPurchaseRequestDialog = ({ open, onOpenChange }: NewPurchaseRequestDialogProps) => {
  const { createRequest } = usePurchaseRequests();
  const [items, setItems] = useState<ItemForm[]>([]);
  const [newItem, setNewItem] = useState<ItemForm>({
    description: "",
    quantity: 1,
    unit: "un",
    estimated_unit_price: 0,
  });

  const { register, handleSubmit, reset, setValue, watch } = useForm({
    defaultValues: {
      title: "",
      description: "",
      category: "material",
      priority: "media",
      justification: "",
    },
  });

  const addItem = () => {
    if (!newItem.description) return;
    setItems([...items, { ...newItem }]);
    setNewItem({ description: "", quantity: 1, unit: "un", estimated_unit_price: 0 });
  };

  const removeItem = (index: number) => {
    setItems(items.filter((_, i) => i !== index));
  };

  const onSubmit = async (data: { title: string; description: string; category: string; priority: string; justification: string }) => {
    await createRequest.mutateAsync({
      ...data,
      items,
    });
    reset();
    setItems([]);
    onOpenChange(false);
  };

  const estimatedTotal = items.reduce((sum, item) => sum + item.quantity * item.estimated_unit_price, 0);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Solicitação de Compra</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="title">Título *</Label>
              <Input id="title" {...register("title", { required: true })} placeholder="Ex: Compra de EPIs" />
            </div>

            <div>
              <Label>Categoria</Label>
              <Select defaultValue="material" onValueChange={(v) => setValue("category", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="material">Material</SelectItem>
                  <SelectItem value="servico">Serviço</SelectItem>
                  <SelectItem value="equipamento">Equipamento</SelectItem>
                  <SelectItem value="epi">EPI</SelectItem>
                  <SelectItem value="outros">Outros</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Prioridade</Label>
              <Select defaultValue="media" onValueChange={(v) => setValue("priority", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="baixa">Baixa</SelectItem>
                  <SelectItem value="media">Média</SelectItem>
                  <SelectItem value="alta">Alta</SelectItem>
                  <SelectItem value="urgente">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea id="description" {...register("description")} placeholder="Descreva a necessidade..." />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="justification">Justificativa</Label>
              <Textarea id="justification" {...register("justification")} placeholder="Por que essa compra é necessária?" />
            </div>
          </div>

          {/* Items Section */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Itens da Solicitação</Label>
            
            <div className="grid grid-cols-12 gap-2 items-end">
              <div className="col-span-4">
                <Label className="text-xs">Descrição</Label>
                <Input
                  value={newItem.description}
                  onChange={(e) => setNewItem({ ...newItem, description: e.target.value })}
                  placeholder="Item"
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Qtd</Label>
                <Input
                  type="number"
                  min="0.01"
                  step="0.01"
                  value={newItem.quantity}
                  onChange={(e) => setNewItem({ ...newItem, quantity: Number(e.target.value) })}
                />
              </div>
              <div className="col-span-2">
                <Label className="text-xs">Unidade</Label>
                <Input
                  value={newItem.unit}
                  onChange={(e) => setNewItem({ ...newItem, unit: e.target.value })}
                />
              </div>
              <div className="col-span-3">
                <Label className="text-xs">Preço Unit. (R$)</Label>
                <Input
                  type="number"
                  min="0"
                  step="0.01"
                  value={newItem.estimated_unit_price}
                  onChange={(e) => setNewItem({ ...newItem, estimated_unit_price: Number(e.target.value) })}
                />
              </div>
              <div className="col-span-1">
                <Button type="button" size="icon" variant="outline" onClick={addItem}>
                  <Plus className="h-4 w-4" />
                </Button>
              </div>
            </div>

            {items.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Item</TableHead>
                    <TableHead className="text-right">Qtd</TableHead>
                    <TableHead>Un</TableHead>
                    <TableHead className="text-right">Preço Unit.</TableHead>
                    <TableHead className="text-right">Total</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.description}</TableCell>
                      <TableCell className="text-right">{item.quantity}</TableCell>
                      <TableCell>{item.unit}</TableCell>
                      <TableCell className="text-right">
                        {item.estimated_unit_price.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </TableCell>
                      <TableCell className="text-right">
                        {(item.quantity * item.estimated_unit_price).toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
                      </TableCell>
                      <TableCell>
                        <Button type="button" size="icon" variant="ghost" onClick={() => removeItem(index)}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}

            {items.length > 0 && (
              <div className="text-right font-semibold text-foreground">
                Total Estimado: {estimatedTotal.toLocaleString("pt-BR", { style: "currency", currency: "BRL" })}
              </div>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={createRequest.isPending}>
              {createRequest.isPending ? "Criando..." : "Criar Solicitação"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewPurchaseRequestDialog;
