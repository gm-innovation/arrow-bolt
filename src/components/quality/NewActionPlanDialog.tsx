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
import { useQualityActionPlans } from "@/hooks/useQualityActionPlans";
import { useQualityNCRs } from "@/hooks/useQualityNCRs";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

interface ActionItemForm {
  what: string;
  why: string;
  where_location: string;
  how: string;
  when_date: string;
}

const NewActionPlanDialog = ({ open, onOpenChange }: Props) => {
  const { createPlan } = useQualityActionPlans();
  const { ncrs } = useQualityNCRs();
  const [items, setItems] = useState<ActionItemForm[]>([]);
  const [newItem, setNewItem] = useState<ActionItemForm>({ what: "", why: "", where_location: "", how: "", when_date: "" });

  const { register, handleSubmit, reset, setValue } = useForm({
    defaultValues: { title: "", description: "", plan_type: "corrective", ncr_id: "", start_date: "", target_date: "" },
  });

  const addItem = () => {
    if (!newItem.what) return;
    setItems([...items, { ...newItem }]);
    setNewItem({ what: "", why: "", where_location: "", how: "", when_date: "" });
  };

  const onSubmit = async (data: Record<string, string>) => {
    await createPlan.mutateAsync({
      title: data.title,
      description: data.description,
      plan_type: data.plan_type,
      ncr_id: data.ncr_id || undefined,
      start_date: data.start_date || undefined,
      target_date: data.target_date || undefined,
      items: items.map((i) => ({
        what: i.what,
        why: i.why || undefined,
        where_location: i.where_location || undefined,
        how: i.how || undefined,
        when_date: i.when_date || undefined,
      })),
    });
    reset();
    setItems([]);
    onOpenChange(false);
  };

  const openNCRs = ncrs.filter((n) => n.status !== "closed" && n.status !== "cancelled");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Novo Plano de Ação (5W2H)</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="title">Título *</Label>
              <Input id="title" {...register("title", { required: true })} placeholder="Ex: Corrigir processo de solda" />
            </div>

            <div>
              <Label>Tipo</Label>
              <Select defaultValue="corrective" onValueChange={(v) => setValue("plan_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="corrective">Corretivo</SelectItem>
                  <SelectItem value="preventive">Preventivo</SelectItem>
                  <SelectItem value="improvement">Melhoria</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>RNC Vinculada</Label>
              <Select onValueChange={(v) => setValue("ncr_id", v)}>
                <SelectTrigger><SelectValue placeholder="Nenhuma (independente)" /></SelectTrigger>
                <SelectContent>
                  {openNCRs.map((ncr) => (
                    <SelectItem key={ncr.id} value={ncr.id}>RNC #{ncr.ncr_number} - {ncr.title}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="start_date">Data Início</Label>
              <Input id="start_date" type="date" {...register("start_date")} />
            </div>
            <div>
              <Label htmlFor="target_date">Data Alvo</Label>
              <Input id="target_date" type="date" {...register("target_date")} />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="description">Descrição</Label>
              <Textarea id="description" {...register("description")} placeholder="Descreva o objetivo do plano..." />
            </div>
          </div>

          {/* 5W2H Items */}
          <div className="space-y-3">
            <Label className="text-base font-semibold">Ações (5W2H)</Label>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-2 items-end">
              <div>
                <Label className="text-xs">O que *</Label>
                <Input value={newItem.what} onChange={(e) => setNewItem({ ...newItem, what: e.target.value })} placeholder="Ação" />
              </div>
              <div>
                <Label className="text-xs">Por que</Label>
                <Input value={newItem.why} onChange={(e) => setNewItem({ ...newItem, why: e.target.value })} placeholder="Motivo" />
              </div>
              <div>
                <Label className="text-xs">Onde</Label>
                <Input value={newItem.where_location} onChange={(e) => setNewItem({ ...newItem, where_location: e.target.value })} placeholder="Local" />
              </div>
              <div>
                <Label className="text-xs">Como</Label>
                <Input value={newItem.how} onChange={(e) => setNewItem({ ...newItem, how: e.target.value })} placeholder="Método" />
              </div>
              <Button type="button" size="icon" variant="outline" onClick={addItem}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>

            {items.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>O que</TableHead>
                    <TableHead>Por que</TableHead>
                    <TableHead>Onde</TableHead>
                    <TableHead>Como</TableHead>
                    <TableHead />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {items.map((item, index) => (
                    <TableRow key={index}>
                      <TableCell>{item.what}</TableCell>
                      <TableCell>{item.why}</TableCell>
                      <TableCell>{item.where_location}</TableCell>
                      <TableCell>{item.how}</TableCell>
                      <TableCell>
                        <Button type="button" size="icon" variant="ghost" onClick={() => setItems(items.filter((_, i) => i !== index))}>
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={createPlan.isPending}>
              {createPlan.isPending ? "Criando..." : "Criar Plano"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewActionPlanDialog;
