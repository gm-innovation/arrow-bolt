import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { TaskReport } from "./types";

interface ServiceDetailsSectionProps {
  taskId: string;
  report: TaskReport;
  onUpdateReport: (taskId: string, field: keyof TaskReport, value: string) => void;
  showValidation?: boolean;
}

export const ServiceDetailsSection = ({
  taskId,
  report,
  onUpdateReport,
  showValidation = false,
}: ServiceDetailsSectionProps) => {
  const handleTextareaChange = (field: keyof TaskReport, value: string) => {
    // Limit length to 2000 characters per field
    const sanitizedValue = value.slice(0, 2000);
    onUpdateReport(taskId, field, sanitizedValue);
  };

  const isFieldEmpty = (value: string) => !value?.trim();

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`issue-${taskId}`} className="flex items-center gap-1">
          Defeito Encontrado / Reportado <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id={`issue-${taskId}`}
          value={report.reportedIssue}
          onChange={(e) => handleTextareaChange("reportedIssue", e.target.value)}
          maxLength={2000}
          rows={3}
          className={showValidation && isFieldEmpty(report.reportedIssue) ? "border-destructive" : ""}
          placeholder="Descreva o defeito encontrado ou reportado pelo cliente..."
        />
        <div className="flex justify-between items-center">
          {showValidation && isFieldEmpty(report.reportedIssue) && (
            <p className="text-xs text-destructive">Campo obrigatório</p>
          )}
          <p className="text-xs text-muted-foreground text-right ml-auto">
            {report.reportedIssue.length}/2000
          </p>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`work-${taskId}`} className="flex items-center gap-1">
          Trabalhos Executados <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id={`work-${taskId}`}
          value={report.executedWork}
          onChange={(e) => handleTextareaChange("executedWork", e.target.value)}
          maxLength={2000}
          rows={3}
          className={showValidation && isFieldEmpty(report.executedWork) ? "border-destructive" : ""}
          placeholder="Descreva os trabalhos executados..."
        />
        <div className="flex justify-between items-center">
          {showValidation && isFieldEmpty(report.executedWork) && (
            <p className="text-xs text-destructive">Campo obrigatório</p>
          )}
          <p className="text-xs text-muted-foreground text-right ml-auto">
            {report.executedWork.length}/2000
          </p>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`result-${taskId}`} className="flex items-center gap-1">
          Resultado <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id={`result-${taskId}`}
          value={report.result}
          onChange={(e) => handleTextareaChange("result", e.target.value)}
          maxLength={2000}
          rows={3}
          className={showValidation && isFieldEmpty(report.result) ? "border-destructive" : ""}
          placeholder="Descreva o resultado do serviço..."
        />
        <div className="flex justify-between items-center">
          {showValidation && isFieldEmpty(report.result) && (
            <p className="text-xs text-destructive">Campo obrigatório</p>
          )}
          <p className="text-xs text-muted-foreground text-right ml-auto">
            {report.result.length}/2000
          </p>
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor={`next-${taskId}`}>Trabalho para o Próximo Atendimento</Label>
        <Textarea
          id={`next-${taskId}`}
          value={report.nextVisitWork}
          onChange={(e) => handleTextareaChange("nextVisitWork", e.target.value)}
          maxLength={2000}
          rows={3}
          placeholder="Se aplicável, descreva trabalhos pendentes para próximo atendimento..."
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
          placeholder="Se aplicável, liste os materiais fornecidos..."
        />
        <p className="text-xs text-muted-foreground text-right">
          {report.suppliedMaterial.length}/2000
        </p>
      </div>
    </div>
  );
};
