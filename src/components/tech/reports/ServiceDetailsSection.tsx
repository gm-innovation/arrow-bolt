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
  const handleTextareaChange = (field: keyof TaskReport, value: string) => {
    // Limit length to 2000 characters per field
    const sanitizedValue = value.slice(0, 2000);
    onUpdateReport(taskId, field, sanitizedValue);
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`issue-${taskId}`}>Defeito Encontrado / Reportado</Label>
        <Textarea
          id={`issue-${taskId}`}
          value={report.reportedIssue}
          onChange={(e) => handleTextareaChange("reportedIssue", e.target.value)}
          maxLength={2000}
          rows={3}
        />
        <p className="text-xs text-muted-foreground text-right">
          {report.reportedIssue.length}/2000
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`work-${taskId}`}>Trabalhos Executados</Label>
        <Textarea
          id={`work-${taskId}`}
          value={report.executedWork}
          onChange={(e) => handleTextareaChange("executedWork", e.target.value)}
          maxLength={2000}
          rows={3}
        />
        <p className="text-xs text-muted-foreground text-right">
          {report.executedWork.length}/2000
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`result-${taskId}`}>Resultado</Label>
        <Textarea
          id={`result-${taskId}`}
          value={report.result}
          onChange={(e) => handleTextareaChange("result", e.target.value)}
          maxLength={2000}
          rows={3}
        />
        <p className="text-xs text-muted-foreground text-right">
          {report.result.length}/2000
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`next-${taskId}`}>Trabalho para o Próximo Atendimento</Label>
        <Textarea
          id={`next-${taskId}`}
          value={report.nextVisitWork}
          onChange={(e) => handleTextareaChange("nextVisitWork", e.target.value)}
          maxLength={2000}
          rows={3}
        />
        <p className="text-xs text-muted-foreground text-right">
          {report.nextVisitWork.length}/2000
        </p>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`material-${taskId}`}>Material Fornecido</Label>
        <Textarea
          id={`material-${taskId}`}
          value={report.suppliedMaterial}
          onChange={(e) => handleTextareaChange("suppliedMaterial", e.target.value)}
          maxLength={2000}
          rows={3}
        />
        <p className="text-xs text-muted-foreground text-right">
          {report.suppliedMaterial.length}/2000
        </p>
      </div>
    </div>
  );
};