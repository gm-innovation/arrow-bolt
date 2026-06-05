import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQualityTrainingPlanActions, type TrainingPlan } from "@/hooks/useQualityTrainingPlans";
import { format, parseISO } from "date-fns";
import { CheckCircle2, XCircle, PlayCircle } from "lucide-react";

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

const TrainingPlanCard = ({ plan, competencyName, canManage }: Props) => {
  const { updateStatus } = useQualityTrainingPlanActions();
  return (
    <Card>
      <CardHeader className="pb-2 flex flex-row items-center justify-between gap-2">
        <CardTitle className="text-sm">
          {competencyName ?? "Competência"} · {plan.current_level} → {plan.target_level}
        </CardTitle>
        <Badge variant={statusVariant[plan.status]}>{plan.status}</Badge>
      </CardHeader>
      <CardContent className="text-sm space-y-2">
        <p className="text-xs text-muted-foreground">
          Gerado em {format(parseISO(plan.generated_at), "dd/MM/yyyy")}
          {plan.due_date && ` · prazo ${format(parseISO(plan.due_date), "dd/MM/yyyy")}`}
        </p>
        {plan.linked_course_id && (
          <p className="text-xs">Curso vinculado: <code>{plan.linked_course_id.slice(0, 8)}…</code></p>
        )}
        {plan.linked_trail_id && (
          <p className="text-xs">Trilha vinculada: <code>{plan.linked_trail_id.slice(0, 8)}…</code></p>
        )}
        {plan.notes && <p className="text-xs">{plan.notes}</p>}
        {canManage && plan.status !== "completed" && plan.status !== "cancelled" && (
          <div className="flex gap-2 pt-2">
            {plan.status === "proposed" && (
              <Button size="sm" variant="outline" onClick={() => updateStatus.mutate({ id: plan.id, status: "in_progress" })}>
                <PlayCircle className="h-4 w-4 mr-1" />Iniciar
              </Button>
            )}
            <Button size="sm" onClick={() => updateStatus.mutate({ id: plan.id, status: "completed" })}>
              <CheckCircle2 className="h-4 w-4 mr-1" />Concluir
            </Button>
            <Button size="sm" variant="ghost" onClick={() => updateStatus.mutate({ id: plan.id, status: "cancelled" })}>
              <XCircle className="h-4 w-4 mr-1" />Cancelar
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TrainingPlanCard;
