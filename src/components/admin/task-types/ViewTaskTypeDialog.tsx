import {
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Wrench, ListOrdered, Camera, FileText, RefreshCw, DollarSign } from "lucide-react";

interface TaskType {
  id: string;
  name: string;
  category?: string;
  description?: string;
  tools?: string[];
  steps?: string[];
  photo_labels?: string[];
  is_recurrent?: boolean;
  recurrence_type?: string;
  pricing_type?: string;
  default_periodicity?: number;
  default_estimated_value?: number;
}

interface ViewTaskTypeDialogProps {
  taskType: TaskType | null;
}

export const ViewTaskTypeDialog = ({ taskType }: ViewTaskTypeDialogProps) => {
  if (!taskType) return null;

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" />
          {taskType.name}
        </DialogTitle>
      </DialogHeader>

      <ScrollArea className="max-h-[60vh] pr-4">
        <div className="space-y-6">
          {/* Basic Info */}
          <div className="space-y-2">
            {taskType.category && (
              <div>
                <span className="text-sm text-muted-foreground">Categoria:</span>
                <Badge variant="secondary" className="ml-2">
                  {taskType.category}
                </Badge>
              </div>
            )}
            {taskType.description && (
              <div>
                <span className="text-sm text-muted-foreground">Descrição:</span>
                <p className="mt-1">{taskType.description}</p>
              </div>
            )}
          </div>

          {/* Recurrence */}
          {taskType.is_recurrent && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <RefreshCw className="h-4 w-4" />
                Recorrência
              </div>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-muted-foreground">Tipo:</span>{" "}
                  {taskType.recurrence_type === "maintenance" ? "Manutenção" :
                   taskType.recurrence_type === "renewal" ? "Renovação" :
                   taskType.recurrence_type === "recurring_service" ? "Serviço Recorrente" : "-"}
                </div>
                <div>
                  <span className="text-muted-foreground">Valor:</span>{" "}
                  {taskType.pricing_type === "fixed" ? "Valor Fechado" :
                   taskType.pricing_type === "hourly" ? "Homem-Hora (HH)" : "-"}
                </div>
                {taskType.default_periodicity && (
                  <div>
                    <span className="text-muted-foreground">Periodicidade:</span>{" "}
                    {taskType.default_periodicity} meses
                  </div>
                )}
                {taskType.default_estimated_value != null && (
                  <div>
                    <span className="text-muted-foreground">Valor estimado:</span>{" "}
                    R$ {taskType.default_estimated_value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Tools */}
          {taskType.tools && taskType.tools.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Wrench className="h-4 w-4" />
                Ferramentas ({taskType.tools.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {taskType.tools.map((tool, index) => (
                  <Badge key={index} variant="outline">
                    {tool}
                  </Badge>
                ))}
              </div>
            </div>
          )}

          {/* Steps */}
          {taskType.steps && taskType.steps.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <ListOrdered className="h-4 w-4" />
                Passos ({taskType.steps.length})
              </div>
              <ol className="list-decimal list-inside space-y-1 text-sm">
                {taskType.steps.map((step, index) => (
                  <li key={index} className="text-muted-foreground">
                    {step}
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Photo Labels */}
          {taskType.photo_labels && taskType.photo_labels.length > 0 && (
            <div className="space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Camera className="h-4 w-4" />
                Legendas de Fotos ({taskType.photo_labels.length})
              </div>
              <div className="flex flex-wrap gap-2">
                {taskType.photo_labels.map((label, index) => (
                  <Badge key={index} variant="secondary">
                    {label}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>
      </ScrollArea>
    </DialogContent>
  );
};
