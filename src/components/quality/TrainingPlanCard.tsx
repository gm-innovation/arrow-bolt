import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQualityTrainingPlanActions, type TrainingPlan } from "@/hooks/useQualityTrainingPlans";
import { useQualityTrainingEffectiveness } from "@/hooks/useQualityTrainingEffectiveness";
import { format, parseISO } from "date-fns";
import { CheckCircle2, XCircle, PlayCircle, Stethoscope, Pencil, FileBadge2 } from "lucide-react";
import EvaluateEffectivenessDialog from "@/components/quality/training/EvaluateEffectivenessDialog";
import TrainingPlanFormDialog, { trainingTypeLabel, originTypeLabel } from "@/components/quality/training/TrainingPlanFormDialog";

interface Props {
  plan: TrainingPlan;
  competencyName?: string;
  canManage?: boolean;
}

const statusVariant: Record<string, any> = {
  proposed: "outline",
  in_progress: "secondary",
  completed: "success",
  cancelled: "destructive",
};

const resultBadge = (r?: string | null) => {
  if (!r) return null;
  if (r === "eficaz") return <Badge variant="success">Eficácia: eficaz</Badge>;
  if (r === "parcial") return <Badge variant="warning">Eficácia: parcial</Badge>;
  return <Badge variant="destructive">Eficácia: não eficaz</Badge>;
};

const TrainingPlanCard = ({ plan, competencyName, canManage }: Props) => {
  const { updateStatus } = useQualityTrainingPlanActions();
  const { latest } = useQualityTrainingEffectiveness(plan.id);
  const [evalOpen, setEvalOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);

  const type = (plan as any).type || "internal";
  const isExternal = type !== "internal";

  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2 flex-wrap">
        <CardTitle className="text-sm">
          {competencyName ?? "Competência"} · {plan.current_level} → {plan.target_level}
        </CardTitle>
        <div className="flex items-center gap-1 flex-wrap">
          <Badge variant="outline">{trainingTypeLabel[type] || type}</Badge>
          {(plan as any).origin_type && (
            <Badge variant="outline" className="text-[10px]">{originTypeLabel[(plan as any).origin_type]}</Badge>
          )}
          <Badge variant={statusVariant[plan.status]}>{plan.status}</Badge>
          {resultBadge(latest?.result)}
        </div>
      </CardHeader>
      <CardContent className="text-sm space-y-2">
        <p className="text-xs text-muted-foreground">
          Gerado em {format(parseISO(plan.generated_at), "dd/MM/yyyy")}
          {plan.due_date && ` · prazo ${format(parseISO(plan.due_date), "dd/MM/yyyy")}`}
          {(plan as any).program_year && ` · programa ${(plan as any).program_year}`}
        </p>
        {isExternal && (
          <div className="text-xs space-y-0.5">
            {(plan as any).institution && <p><b>Instituição:</b> {(plan as any).institution}</p>}
            {(plan as any).instructor && <p><b>Instrutor:</b> {(plan as any).instructor}</p>}
            {(plan as any).certificate_url && (
              <a href={(plan as any).certificate_url} target="_blank" rel="noreferrer" className="text-primary inline-flex items-center gap-1">
                <FileBadge2 className="h-3 w-3" /> Ver certificado
              </a>
            )}
          </div>
        )}
        {plan.notes && <p className="text-xs">{plan.notes}</p>}
        {canManage && (
          <div className="flex gap-2 pt-2 flex-wrap">
            <Button size="sm" variant="ghost" onClick={() => setEditOpen(true)}>
              <Pencil className="h-4 w-4 mr-1" />Editar
            </Button>
            {plan.status === "proposed" && (
              <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: plan.id, status: "in_progress" })}>
                <PlayCircle className="h-4 w-4 mr-1" />Iniciar
              </Button>
            )}
            {plan.status !== "completed" && plan.status !== "cancelled" && (
              <>
                <Button size="sm" onClick={() => updateStatus.mutate({ id: plan.id, status: "completed" })}>
                  <CheckCircle2 className="h-4 w-4 mr-1" />Concluir
                </Button>
                <Button size="sm" variant="ghost" onClick={() => updateStatus.mutate({ id: plan.id, status: "cancelled" })}>
                  <XCircle className="h-4 w-4 mr-1" />Cancelar
                </Button>
              </>
            )}
            {plan.status === "completed" && (
              <Button size="sm" variant="outline" onClick={() => setEvalOpen(true)}>
                <Stethoscope className="h-4 w-4 mr-1" />Avaliar Eficácia
              </Button>
            )}
          </div>
        )}
      </CardContent>

      <EvaluateEffectivenessDialog
        open={evalOpen}
        onOpenChange={setEvalOpen}
        trainingId={plan.id}
        trainingTitle={competencyName}
      />
      <TrainingPlanFormDialog open={editOpen} onOpenChange={setEditOpen} plan={plan} />
    </Card>
  );
};

export default TrainingPlanCard;
