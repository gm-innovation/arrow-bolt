import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TaskReport } from "./types";

interface ServiceDetailsSectionProps {
  taskId: string;
  report: TaskReport;
  onUpdateReport: (taskId: string, field: keyof TaskReport, value: string) => void;
}

export const ServiceDetailsSection = ({
  taskId,
  report,
  onUpdateReport,
}: ServiceDetailsSectionProps) => {
  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`issue-${taskId}`}>Defeito Encontrado / Reportado</Label>
        <Textarea
          id={`issue-${taskId}`}
          value={report.reportedIssue}
          onChange={(e) => onUpdateReport(taskId, "reportedIssue", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`work-${taskId}`}>Trabalhos Executados</Label>
        <Textarea
          id={`work-${taskId}`}
          value={report.executedWork}
          onChange={(e) => onUpdateReport(taskId, "executedWork", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`result-${taskId}`}>Resultado</Label>
        <Textarea
          id={`result-${taskId}`}
          value={report.result}
          onChange={(e) => onUpdateReport(taskId, "result", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`next-${taskId}`}>Trabalho para o Próximo Atendimento</Label>
        <Textarea
          id={`next-${taskId}`}
          value={report.nextVisitWork}
          onChange={(e) => onUpdateReport(taskId, "nextVisitWork", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`material-${taskId}`}>Material Fornecido</Label>
        <Textarea
          id={`material-${taskId}`}
          value={report.suppliedMaterial}
          onChange={(e) => onUpdateReport(taskId, "suppliedMaterial", e.target.value)}
        />
      </div>
    </div>
  );
};