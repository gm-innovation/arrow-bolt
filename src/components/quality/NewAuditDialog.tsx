import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { useQualityAudits } from "@/hooks/useQualityAudits";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const NewAuditDialog = ({ open, onOpenChange }: Props) => {
  const { createAudit } = useQualityAudits();
  const { register, handleSubmit, reset, setValue } = useForm({
    defaultValues: {
      title: "",
      scope: "",
      audit_type: "internal",
      planned_date: "",
      department: "",
      standard_reference: "",
    },
  });

  const onSubmit = async (data: Record<string, string>) => {
    await createAudit.mutateAsync({
      title: data.title,
      scope: data.scope,
      audit_type: data.audit_type,
      planned_date: data.planned_date,
      department: data.department,
      standard_reference: data.standard_reference,
    });
    reset();
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Auditoria Interna</DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="title">Título *</Label>
            <Input id="title" {...register("title", { required: true })} placeholder="Ex: Auditoria ISO 9001 - Produção" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo</Label>
              <Select defaultValue="internal" onValueChange={(v) => setValue("audit_type", v)}>
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
              <Label htmlFor="planned_date">Data Planejada *</Label>
              <Input id="planned_date" type="date" {...register("planned_date", { required: true })} />
            </div>
          </div>

          <div>
            <Label htmlFor="department">Departamento/Área</Label>
            <Input id="department" {...register("department")} placeholder="Ex: Produção" />
          </div>

          <div>
            <Label htmlFor="standard_reference">Referência da Norma</Label>
            <Input id="standard_reference" {...register("standard_reference")} placeholder="Ex: ISO 9001:2015 - Cláusula 7.1" />
          </div>

          <div>
            <Label htmlFor="scope">Escopo</Label>
            <Textarea id="scope" {...register("scope")} placeholder="Defina o escopo da auditoria..." />
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button type="submit" disabled={createAudit.isPending}>
              {createAudit.isPending ? "Agendando..." : "Agendar Auditoria"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default NewAuditDialog;
