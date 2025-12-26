import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TaskReport } from "./types";

interface EquipmentInfoSectionProps {
  taskId: string;
  report: TaskReport;
  onUpdateReport: (taskId: string, field: keyof TaskReport, value: string) => void;
  showValidation?: boolean;
}

export const EquipmentInfoSection = ({
  taskId,
  report,
  onUpdateReport,
  showValidation = false,
}: EquipmentInfoSectionProps) => {
  const handleInputChange = (field: keyof TaskReport, value: string) => {
    // Trim and limit length
    const sanitizedValue = value.slice(0, 200);
    onUpdateReport(taskId, field, sanitizedValue);
  };

  const isFieldEmpty = (value: string) => !value?.trim();

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="space-y-2">
        <Label htmlFor={`model-${taskId}`} className="flex items-center gap-1">
          Modelo <span className="text-destructive">*</span>
        </Label>
        <Input
          id={`model-${taskId}`}
          value={report.modelInfo}
          onChange={(e) => handleInputChange("modelInfo", e.target.value)}
          maxLength={200}
          className={showValidation && isFieldEmpty(report.modelInfo) ? "border-destructive" : ""}
          placeholder="Ex: Model XYZ-1000"
        />
        {showValidation && isFieldEmpty(report.modelInfo) && (
          <p className="text-xs text-destructive">Campo obrigatório</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor={`brand-${taskId}`} className="flex items-center gap-1">
          Marca <span className="text-destructive">*</span>
        </Label>
        <Input
          id={`brand-${taskId}`}
          value={report.brandInfo}
          onChange={(e) => handleInputChange("brandInfo", e.target.value)}
          maxLength={200}
          className={showValidation && isFieldEmpty(report.brandInfo) ? "border-destructive" : ""}
          placeholder="Ex: Samsung, LG, etc."
        />
        {showValidation && isFieldEmpty(report.brandInfo) && (
          <p className="text-xs text-destructive">Campo obrigatório</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor={`serial-${taskId}`} className="flex items-center gap-1">
          Número de Série <span className="text-destructive">*</span>
        </Label>
        <Input
          id={`serial-${taskId}`}
          value={report.serialNumber}
          onChange={(e) => handleInputChange("serialNumber", e.target.value)}
          maxLength={200}
          className={showValidation && isFieldEmpty(report.serialNumber) ? "border-destructive" : ""}
          placeholder="Ex: SN123456789"
        />
        {showValidation && isFieldEmpty(report.serialNumber) && (
          <p className="text-xs text-destructive">Campo obrigatório</p>
        )}
      </div>
    </div>
  );
};
