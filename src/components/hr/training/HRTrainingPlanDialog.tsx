import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useHRTrainingActions, trainingPlanStatusLabel } from "@/hooks/useHRTraining";
import type { TrainingPlan, TrainingPlanStatus } from "@/hooks/useQualityTrainingPlans";

interface Props {
  plan: TrainingPlan | null;
  competencyName?: string;
  employeeName?: string;
  onClose: () => void;
}

const HRTrainingPlanDialog = ({ plan, competencyName, employeeName, onClose }: Props) => {
  const { updatePlan } = useHRTrainingActions();
  const [form, setForm] = useState(() => ({
    status: (plan?.status ?? "proposed") as TrainingPlanStatus,
    planned_date: plan?.planned_date ?? "",
    executed_date: plan?.executed_date ?? "",
    due_date: plan?.due_date ?? "",
    institution: plan?.institution ?? "",
    instructor: plan?.instructor ?? "",
    notes: plan?.notes ?? "",
  }));

  if (!plan) return null;

  const save = async () => {
    await updatePlan.mutateAsync({
      id: plan.id,
      status: form.status,
      planned_date: form.planned_date || null,
      executed_date: form.executed_date || null,
      due_date: form.due_date || null,
      institution: form.institution || null,
      instructor: form.instructor || null,
      notes: form.notes || null,
    });
    onClose();
  };

  return (
    <Dialog open={!!plan} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Plano de capacitação</DialogTitle>
          <p className="text-sm text-muted-foreground">
            {employeeName} — {competencyName}
          </p>
        </DialogHeader>

        <div className="grid gap-3">
          <div>
            <Label>Situação</Label>
            <Select
              value={form.status}
              onValueChange={(v) => setForm((f) => ({ ...f, status: v as TrainingPlanStatus }))}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(trainingPlanStatusLabel).map(([v, label]) => (
                  <SelectItem key={v} value={v}>
                    {label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="grid grid-cols-3 gap-3">
            <div>
              <Label>Previsto para</Label>
              <Input
                type="date"
                value={form.planned_date}
                onChange={(e) => setForm((f) => ({ ...f, planned_date: e.target.value }))}
              />
            </div>
            <div>
              <Label>Prazo</Label>
              <Input
                type="date"
                value={form.due_date}
                onChange={(e) => setForm((f) => ({ ...f, due_date: e.target.value }))}
              />
            </div>
            <div>
              <Label>Realizado em</Label>
              <Input
                type="date"
                value={form.executed_date}
                onChange={(e) => setForm((f) => ({ ...f, executed_date: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <Label>Instituição</Label>
              <Input
                value={form.institution}
                onChange={(e) => setForm((f) => ({ ...f, institution: e.target.value }))}
                placeholder="Ex.: SENAI"
              />
            </div>
            <div>
              <Label>Instrutor</Label>
              <Input
                value={form.instructor}
                onChange={(e) => setForm((f) => ({ ...f, instructor: e.target.value }))}
              />
            </div>
          </div>

          <div>
            <Label>Observações</Label>
            <Textarea
              rows={3}
              value={form.notes}
              onChange={(e) => setForm((f) => ({ ...f, notes: e.target.value }))}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancelar
          </Button>
          <Button onClick={save} disabled={updatePlan.isPending}>
            Salvar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default HRTrainingPlanDialog;
