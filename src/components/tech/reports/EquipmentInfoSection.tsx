import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { TaskReport } from "./types";

interface EquipmentInfoSectionProps {
  taskId: string;
  report: TaskReport;
  onUpdateReport: (taskId: string, field: keyof TaskReport, value: string) => void;
}

export const EquipmentInfoSection = ({
  taskId,
  report,
  onUpdateReport,
}: EquipmentInfoSectionProps) => {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <div className="space-y-2">
        <Label htmlFor={`model-${taskId}`}>Modelo</Label>
        <Input
          id={`model-${taskId}`}
          value={report.modelInfo}
          onChange={(e) => onUpdateReport(taskId, "modelInfo", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`brand-${taskId}`}>Marca</Label>
        <Input
          id={`brand-${taskId}`}
          value={report.brandInfo}
          onChange={(e) => onUpdateReport(taskId, "brandInfo", e.target.value)}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor={`serial-${taskId}`}>Número de Série</Label>
        <Input
          id={`serial-${taskId}`}
          value={report.serialNumber}
          onChange={(e) => onUpdateReport(taskId, "serialNumber", e.target.value)}
        />
      </div>
    </div>
  );
};