import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useQualityNCRs } from "@/hooks/useQualityNCRs";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NewNCRDialog = ({ open, onOpenChange }: Props) => {
  const { createNCR } = useQualityNCRs();
  const { register, handleSubmit, reset, setValue } = useForm({
    defaultValues: {
      title: "",
      description: "",
      ncr_type: "internal",
      severity: "minor",
      source: "",
      affected_area: "",
      immediate_action: "",
      deadline: "",
    },
  });

  const onSubmit = async (data: Record<string, string>) => {
    await createNCR.mutateAsync({
      title: data.title,
      description: data.description,
      ncr_type: data.ncr_type,
      severity: data.severity,
      source: data.source,
      affected_area: data.affected_area,
      immediate_action: data.immediate_action,
      deadline: data.deadline || undefined,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Não-Conformidade (RNC)</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <Label htmlFor="title">Título *</Label>
              <Input id="title" {...register("title", { required: true })} placeholder="Ex: Peça fora de especificação" />
            </div>

            <div>
              <Label>Tipo</Label>
              <Select defaultValue="internal" onValueChange={(v) => setValue("ncr_type", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="internal">Interna</SelectItem>
                  <SelectItem value="external">Externa</SelectItem>
                  <SelectItem value="supplier">Fornecedor</SelectItem>
                  <SelectItem value="process">Processo</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label>Severidade</Label>
              <Select defaultValue="minor" onValueChange={(v) => setValue("severity", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="minor">Menor</SelectItem>
                  <SelectItem value="major">Maior</SelectItem>
                  <SelectItem value="critical">Crítica</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label htmlFor="source">Origem</Label>
              <Input id="source" {...register("source")} placeholder="Ex: Auditoria interna, reclamação" />
            </div>

            <div>
              <Label htmlFor="affected_area">Área Afetada</Label>
              <Input id="affected_area" {...register("affected_area")} placeholder="Ex: Produção, Logística" />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="description">Descrição da NC</Label>
              <Textarea id="description" {...register("description")} placeholder="Descreva a não-conformidade detectada..." />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="immediate_action">Ação Imediata (Contenção)</Label>
              <Textarea id="immediate_action" {...register("immediate_action")} placeholder="Ação tomada para conter o problema..." />
            </div>

            <div>
              <Label htmlFor="deadline">Prazo</Label>
              <Input id="deadline" type="date" {...register("deadline")} />
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={createNCR.isPending}>
              {createNCR.isPending ? "Criando..." : "Registrar RNC"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewNCRDialog;
