import { FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";

interface ServiceDetailsProps {
  form: any;
  taskTypes: { id: string; name: string; category?: string }[];
  taskOrderNumbers?: Record<string, string>;
  onTaskOrderNumberChange?: (taskTypeId: string, orderNumber: string) => void;
}

export const ServiceDetails = ({ 
  form, 
  taskTypes, 
  taskOrderNumbers = {},
  onTaskOrderNumberChange 
}: ServiceDetailsProps) => {
  const selectedTaskTypes = form.watch("taskTypes") || [];
  const singleReport = form.watch("singleReport");

  const handleAddTaskType = (value: string) => {
    const currentTypes = form.getValues("taskTypes") || [];
    if (!currentTypes.includes(value)) {
      form.setValue("taskTypes", [...currentTypes, value]);
    }
  };

  const handleRemoveTaskType = (typeToRemove: string) => {
    const currentTypes = form.getValues("taskTypes") || [];
    form.setValue("taskTypes", currentTypes.filter((type: string) => type !== typeToRemove));
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <FormField
          control={form.control}
          name="serviceDateTime"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Data e Hora do Serviço</FormLabel>
              <FormControl>
                <Input type="datetime-local" {...field} />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="location"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Local</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Localização da embarcação" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="access"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Acesso</FormLabel>
              <FormControl>
                <Input {...field} placeholder="Informações de acesso" />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <div className="space-y-2">
          <FormLabel>Tipos de Tarefa</FormLabel>
          <Select onValueChange={handleAddTaskType}>
            <FormControl>
              <SelectTrigger>
                <SelectValue placeholder="Adicionar tipo de tarefa" />
              </SelectTrigger>
            </FormControl>
            <SelectContent>
              {taskTypes.map((type) => (
                <SelectItem 
                  key={type.id} 
                  value={type.id}
                  disabled={selectedTaskTypes.includes(type.id)}
                >
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedTaskTypes.map((typeId: string) => {
              const taskType = taskTypes.find(t => t.id === typeId);
              return (
                <Badge key={typeId} variant="secondary" className="flex items-center gap-1">
                  {taskType?.name}
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-4 w-4 p-0 hover:bg-transparent"
                    onClick={() => handleRemoveTaskType(typeId)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </Badge>
              );
            })}
          </div>
          <FormMessage />
        </div>
      </div>

      <FormField
        control={form.control}
        name="singleReport"
        render={({ field }) => (
          <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
            <div className="space-y-0.5">
              <FormLabel className="text-base">Relatório Único</FormLabel>
              <FormMessage />
              <div className="text-sm text-muted-foreground">
                Gerar um único relatório para todos os serviços desta OS
              </div>
            </div>
            <FormControl>
              <Switch
                checked={field.value}
                onCheckedChange={field.onChange}
              />
            </FormControl>
          </FormItem>
        )}
      />

      {/* Task-specific OS numbers when singleReport is false */}
      {!singleReport && selectedTaskTypes.length > 0 && (
        <div className="space-y-3 p-4 border rounded-lg bg-muted/30">
          <FormLabel className="text-base">Número de OS por Tarefa</FormLabel>
          <div className="text-sm text-muted-foreground mb-3">
            Defina um número de OS individual para cada tarefa (opcional)
          </div>
          <div className="space-y-3">
            {selectedTaskTypes.map((typeId: string) => {
              const taskType = taskTypes.find(t => t.id === typeId);
              return (
                <div key={typeId} className="flex items-center gap-3">
                  <span className="text-sm font-medium min-w-[150px]">
                    {taskType?.name}
                  </span>
                  <Input
                    placeholder="Nº OS (ex: OS-2024-0001)"
                    value={taskOrderNumbers[typeId] || ""}
                    onChange={(e) => onTaskOrderNumberChange?.(typeId, e.target.value)}
                    className="max-w-[200px]"
                  />
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};
