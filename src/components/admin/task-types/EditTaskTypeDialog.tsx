import { useState, useEffect } from "react";
import {
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Plus, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

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

interface EditTaskTypeDialogProps {
  taskType: TaskType | null;
  onSuccess: () => void;
  onCancel: () => void;
}

export const EditTaskTypeDialog = ({ taskType, onSuccess, onCancel }: EditTaskTypeDialogProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [name, setName] = useState("");
  const [category, setCategory] = useState("");
  const [description, setDescription] = useState("");
  const [tools, setTools] = useState<string[]>([]);
  const [steps, setSteps] = useState<string[]>([]);
  const [photoLabels, setPhotoLabels] = useState<string[]>([]);
  const [newTool, setNewTool] = useState("");
  const [newStep, setNewStep] = useState("");
  const [newPhotoLabel, setNewPhotoLabel] = useState("");
  const [isRecurrent, setIsRecurrent] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState("");
  const [pricingType, setPricingType] = useState("");
  const [defaultPeriodicity, setDefaultPeriodicity] = useState<number | undefined>();
  const [defaultEstimatedValue, setDefaultEstimatedValue] = useState<number | undefined>();

  useEffect(() => {
    if (taskType) {
      setName(taskType.name || "");
      setCategory(taskType.category || "");
      setDescription(taskType.description || "");
      setTools(taskType.tools || []);
      setSteps(taskType.steps || []);
      setPhotoLabels(taskType.photo_labels || []);
      setIsRecurrent(taskType.is_recurrent || false);
      setRecurrenceType(taskType.recurrence_type || "");
      setPricingType(taskType.pricing_type || "");
      setDefaultPeriodicity(taskType.default_periodicity);
      setDefaultEstimatedValue(taskType.default_estimated_value);
    }
  }, [taskType]);

  const handleAddTool = () => {
    if (newTool.trim()) {
      setTools([...tools, newTool.trim()]);
      setNewTool("");
    }
  };

  const handleAddStep = () => {
    if (newStep.trim()) {
      setSteps([...steps, newStep.trim()]);
      setNewStep("");
    }
  };

  const handleAddPhotoLabel = () => {
    if (newPhotoLabel.trim()) {
      setPhotoLabels([...photoLabels, newPhotoLabel.trim()]);
      setNewPhotoLabel("");
    }
  };

  const handleRemoveTool = (index: number) => {
    setTools(tools.filter((_, i) => i !== index));
  };

  const handleRemoveStep = (index: number) => {
    setSteps(steps.filter((_, i) => i !== index));
  };

  const handleRemovePhotoLabel = (index: number) => {
    setPhotoLabels(photoLabels.filter((_, i) => i !== index));
  };

  const handleSubmit = async () => {
    if (!taskType?.id || !name.trim()) {
      toast({
        title: "Erro",
        description: "Nome é obrigatório",
        variant: "destructive",
      });
      return;
    }

    setLoading(true);
    try {
      const { error } = await supabase
        .from("task_types")
        .update({
          name: name.trim(),
          category: category.trim() || null,
          description: description.trim() || null,
          tools,
          steps,
          photo_labels: photoLabels,
          is_recurrent: isRecurrent,
          recurrence_type: isRecurrent ? recurrenceType || null : null,
          pricing_type: isRecurrent ? pricingType || null : null,
          default_periodicity: isRecurrent ? defaultPeriodicity || null : null,
          default_estimated_value: isRecurrent ? defaultEstimatedValue || null : null,
        })
        .eq("id", taskType.id);

      if (error) throw error;

      toast({
        title: "Tipo de tarefa atualizado",
        description: "As alterações foram salvas com sucesso.",
      });
      onSuccess();
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  if (!taskType) return null;

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Editar Tipo de Tarefa</DialogTitle>
      </DialogHeader>

      <ScrollArea className="max-h-[60vh] pr-4">
        <div className="space-y-4">
          {/* Name */}
          <div className="space-y-2">
            <Label htmlFor="name">Nome *</Label>
            <Input
              id="name"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Nome do tipo de tarefa"
            />
          </div>

          {/* Category */}
          <div className="space-y-2">
            <Label htmlFor="category">Categoria</Label>
            <Input
              id="category"
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              placeholder="Categoria"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">Descrição</Label>
            <Textarea
              id="description"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Descrição do tipo de tarefa"
              rows={3}
            />
          </div>

          {/* Tools */}
          <div className="space-y-2">
            <Label>Ferramentas</Label>
            <div className="flex gap-2">
              <Input
                value={newTool}
                onChange={(e) => setNewTool(e.target.value)}
                placeholder="Adicionar ferramenta"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddTool())}
              />
              <Button type="button" variant="outline" size="icon" onClick={handleAddTool}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {tools.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {tools.map((tool, index) => (
                  <Badge key={index} variant="secondary" className="gap-1">
                    {tool}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => handleRemoveTool(index)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>

          {/* Steps */}
          <div className="space-y-2">
            <Label>Passos</Label>
            <div className="flex gap-2">
              <Input
                value={newStep}
                onChange={(e) => setNewStep(e.target.value)}
                placeholder="Adicionar passo"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddStep())}
              />
              <Button type="button" variant="outline" size="icon" onClick={handleAddStep}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {steps.length > 0 && (
              <ol className="list-decimal list-inside space-y-1 mt-2">
                {steps.map((step, index) => (
                  <li key={index} className="flex items-center justify-between text-sm">
                    <span>{step}</span>
                    <X
                      className="h-4 w-4 cursor-pointer text-muted-foreground hover:text-destructive"
                      onClick={() => handleRemoveStep(index)}
                    />
                  </li>
                ))}
              </ol>
            )}
          </div>

          {/* Photo Labels */}
          <div className="space-y-2">
            <Label>Legendas de Fotos</Label>
            <div className="flex gap-2">
              <Input
                value={newPhotoLabel}
                onChange={(e) => setNewPhotoLabel(e.target.value)}
                placeholder="Adicionar legenda"
                onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleAddPhotoLabel())}
              />
              <Button type="button" variant="outline" size="icon" onClick={handleAddPhotoLabel}>
                <Plus className="h-4 w-4" />
              </Button>
            </div>
            {photoLabels.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {photoLabels.map((label, index) => (
                  <Badge key={index} variant="outline" className="gap-1">
                    {label}
                    <X
                      className="h-3 w-3 cursor-pointer"
                      onClick={() => handleRemovePhotoLabel(index)}
                    />
                  </Badge>
                ))}
              </div>
            )}
          </div>
        </div>
      </ScrollArea>

      <DialogFooter>
        <Button variant="outline" onClick={onCancel} disabled={loading}>
          Cancelar
        </Button>
        <Button onClick={handleSubmit} disabled={loading}>
          {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Salvar
        </Button>
      </DialogFooter>
    </DialogContent>
  );
};
