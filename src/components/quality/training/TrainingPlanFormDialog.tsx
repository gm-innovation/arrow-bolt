import { useEffect, useState } from "react";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import type { TrainingPlan } from "@/hooks/useQualityTrainingPlans";
import { useQueryClient } from "@tanstack/react-query";

interface Props {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  plan: TrainingPlan;
}

export const trainingTypeLabel: Record<string, string> = {
  internal: "Interno",
  external_mandatory: "Externo · Obrigatório",
  external_optional: "Externo · Opcional",
};

export const originTypeLabel: Record<string, string> = {
  competency_gap: "Gap de competência",
  audit: "Auditoria",
  ncr: "Não-conformidade",
  legal_requirement: "Requisito legal",
  customer_requirement: "Requisito do cliente",
  iso_requirement: "Requisito ISO",
};

const TrainingPlanFormDialog = ({ open, onOpenChange, plan }: Props) => {
  const qc = useQueryClient();
  const [type, setType] = useState((plan as any).type || "internal");
  const [originType, setOriginType] = useState((plan as any).origin_type || "competency_gap");
  const [institution, setInstitution] = useState((plan as any).institution || "");
  const [instructor, setInstructor] = useState((plan as any).instructor || "");
  const [certificateUrl, setCertificateUrl] = useState((plan as any).certificate_url || "");
  const [programYear, setProgramYear] = useState<string>(String((plan as any).program_year || new Date().getFullYear()));
  const [plannedDate, setPlannedDate] = useState((plan as any).planned_date || "");
  const [executedDate, setExecutedDate] = useState((plan as any).executed_date || "");
  const [notes, setNotes] = useState(plan.notes || "");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setType((plan as any).type || "internal");
    setOriginType((plan as any).origin_type || "competency_gap");
    setInstitution((plan as any).institution || "");
    setInstructor((plan as any).instructor || "");
    setCertificateUrl((plan as any).certificate_url || "");
    setProgramYear(String((plan as any).program_year || new Date().getFullYear()));
    setPlannedDate((plan as any).planned_date || "");
    setExecutedDate((plan as any).executed_date || "");
    setNotes(plan.notes || "");
  }, [open, plan.id]);

  const submit = async () => {
    setSaving(true);
    const patch: any = {
      type,
      origin_type: originType,
      institution: institution || null,
      instructor: instructor || null,
      certificate_url: certificateUrl || null,
      program_year: programYear ? Number(programYear) : null,
      planned_date: plannedDate || null,
      executed_date: executedDate || null,
      notes: notes || null,
    };
    const { error } = await supabase.from("quality_training_plans" as any).update(patch).eq("id", plan.id);
    setSaving(false);
    if (error) {
      toast({ title: "Erro", description: error.message, variant: "destructive" });
      return;
    }
    qc.invalidateQueries({ queryKey: ["quality_training_plans"] });
    toast({ title: "Plano atualizado" });
    onOpenChange(false);
  };

  const isExternal = type !== "internal";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar Plano de Treinamento</DialogTitle>
        </DialogHeader>
        <div className="grid gap-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1">
              <Label>Tipo</Label>
              <Select value={type} onValueChange={setType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(trainingTypeLabel).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1">
              <Label>Origem</Label>
              <Select value={originType} onValueChange={setOriginType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(originTypeLabel).map(([v, l]) => (
                    <SelectItem key={v} value={v}>{l}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <Label>Ano do programa</Label>
              <Input type="number" value={programYear} onChange={(e) => setProgramYear(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Data planejada</Label>
              <Input type="date" value={plannedDate} onChange={(e) => setPlannedDate(e.target.value)} />
            </div>
            <div className="space-y-1">
              <Label>Data executada</Label>
              <Input type="date" value={executedDate} onChange={(e) => setExecutedDate(e.target.value)} />
            </div>
          </div>

          {isExternal && (
            <div className="border rounded-md p-3 space-y-3 bg-muted/30">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <Label>Instituição</Label>
                  <Input value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="Ex.: SENAI, Bureau Veritas" />
                </div>
                <div className="space-y-1">
                  <Label>Instrutor</Label>
                  <Input value={instructor} onChange={(e) => setInstructor(e.target.value)} />
                </div>
              </div>
              <div className="space-y-1">
                <Label>URL do certificado</Label>
                <Input value={certificateUrl} onChange={(e) => setCertificateUrl(e.target.value)} placeholder="https://..." />
              </div>
            </div>
          )}

          <div className="space-y-1">
            <Label>Observações</Label>
            <Textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={saving}>Salvar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default TrainingPlanFormDialog;
