import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { FormLabel } from "@/components/ui/form";
import { X, Plus, Trash2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export interface DockingActivity {
  id: string;
  taskTypeIds: string[];
  scheduledDateTime: string;
  technicians: string[];
  leadTechId: string;
}

interface DockingTasksSectionProps {
  activities: DockingActivity[];
  onActivitiesChange: (activities: DockingActivity[]) => void;
  taskTypes: { id: string; name: string; category?: string }[];
  technicians: { id: string; profiles?: { full_name: string; phone?: string } }[];
}

export const DockingTasksSection = ({
  activities,
  onActivitiesChange,
  taskTypes,
  technicians,
}: DockingTasksSectionProps) => {
  const generateId = () => crypto.randomUUID();

  const addActivity = () => {
    onActivitiesChange([
      ...activities,
      {
        id: generateId(),
        taskTypeIds: [],
        scheduledDateTime: "",
        technicians: [],
        leadTechId: "",
      },
    ]);
  };

  const removeActivity = (id: string) => {
    onActivitiesChange(activities.filter((a) => a.id !== id));
  };

  const updateActivity = (id: string, updates: Partial<DockingActivity>) => {
    onActivitiesChange(
      activities.map((a) => (a.id === id ? { ...a, ...updates } : a))
    );
  };

  const addTaskType = (activityId: string, taskTypeId: string) => {
    const activity = activities.find((a) => a.id === activityId);
    if (!activity || activity.taskTypeIds.includes(taskTypeId)) return;
    updateActivity(activityId, {
      taskTypeIds: [...activity.taskTypeIds, taskTypeId],
    });
  };

  const removeTaskType = (activityId: string, taskTypeId: string) => {
    const activity = activities.find((a) => a.id === activityId);
    if (!activity) return;
    updateActivity(activityId, {
      taskTypeIds: activity.taskTypeIds.filter((id) => id !== taskTypeId),
    });
  };

  const addTechnician = (activityId: string, techId: string) => {
    const activity = activities.find((a) => a.id === activityId);
    if (!activity || activity.technicians.includes(techId)) return;
    const newTechs = [...activity.technicians, techId];
    updateActivity(activityId, {
      technicians: newTechs,
      leadTechId: activity.leadTechId || techId,
    });
  };

  const removeTechnician = (activityId: string, techId: string) => {
    const activity = activities.find((a) => a.id === activityId);
    if (!activity) return;
    const newTechs = activity.technicians.filter((id) => id !== techId);
    updateActivity(activityId, {
      technicians: newTechs,
      leadTechId:
        activity.leadTechId === techId
          ? newTechs[0] || ""
          : activity.leadTechId,
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <FormLabel className="text-base font-semibold">
          Atividades de Docagem
        </FormLabel>
        <Button type="button" variant="outline" size="sm" onClick={addActivity}>
          <Plus className="h-4 w-4 mr-1" />
          Adicionar Atividade
        </Button>
      </div>

      {activities.length === 0 && (
        <div className="text-sm text-muted-foreground border border-dashed rounded-lg p-6 text-center">
          Nenhuma atividade adicionada. Clique em "Adicionar Atividade" para começar.
        </div>
      )}

      {activities.map((activity, index) => (
        <Card key={activity.id} className="border">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm font-medium">
                Atividade #{index + 1}
              </CardTitle>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                className="h-8 w-8 text-destructive hover:text-destructive"
                onClick={() => removeActivity(activity.id)}
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Date/Time */}
            <div>
              <FormLabel className="text-sm">Data e Hora</FormLabel>
              <Input
                type="datetime-local"
                value={activity.scheduledDateTime}
                onChange={(e) =>
                  updateActivity(activity.id, {
                    scheduledDateTime: e.target.value,
                  })
                }
                className="mt-1"
              />
            </div>

            {/* Task Types */}
            <div className="space-y-2">
              <FormLabel className="text-sm">Tarefas</FormLabel>
              <Select
                onValueChange={(val) => addTaskType(activity.id, val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Adicionar tarefa" />
                </SelectTrigger>
                <SelectContent>
                  {taskTypes.map((type) => (
                    <SelectItem
                      key={type.id}
                      value={type.id}
                      disabled={activity.taskTypeIds.includes(type.id)}
                    >
                      {type.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="flex flex-wrap gap-2">
                {activity.taskTypeIds.map((typeId) => {
                  const taskType = taskTypes.find((t) => t.id === typeId);
                  return (
                    <Badge
                      key={typeId}
                      variant="secondary"
                      className="flex items-center gap-1"
                    >
                      {taskType?.name}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-4 w-4 p-0 hover:bg-transparent"
                        onClick={() => removeTaskType(activity.id, typeId)}
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </Badge>
                  );
                })}
              </div>
            </div>

            {/* Technicians */}
            <div className="space-y-2">
              <FormLabel className="text-sm">Equipe</FormLabel>
              <Select
                onValueChange={(val) => addTechnician(activity.id, val)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Adicionar técnico" />
                </SelectTrigger>
                <SelectContent>
                  {technicians.map((tech) => (
                    <SelectItem
                      key={tech.id}
                      value={tech.id}
                      disabled={activity.technicians.includes(tech.id)}
                    >
                      {tech.profiles?.full_name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              {activity.technicians.length > 0 && (
                <RadioGroup
                  value={activity.leadTechId}
                  onValueChange={(val) =>
                    updateActivity(activity.id, { leadTechId: val })
                  }
                  className="space-y-2"
                >
                  {activity.technicians.map((techId) => {
                    const tech = technicians.find((t) => t.id === techId);
                    const isLead = techId === activity.leadTechId;
                    return (
                      <div
                        key={techId}
                        className="flex items-center justify-between p-2 rounded-md border bg-muted/50"
                      >
                        <div className="flex items-center space-x-3 flex-1">
                          <RadioGroupItem value={techId} id={`${activity.id}-${techId}`} />
                          <Label
                            htmlFor={`${activity.id}-${techId}`}
                            className="flex-1 cursor-pointer font-normal"
                          >
                            {tech?.profiles?.full_name}
                          </Label>
                          <Badge
                            variant={isLead ? "default" : "secondary"}
                            className="text-xs"
                          >
                            {isLead ? "Responsável" : "Auxiliar"}
                          </Badge>
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="h-8 w-8 ml-2"
                          onClick={() =>
                            removeTechnician(activity.id, techId)
                          }
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    );
                  })}
                </RadioGroup>
              )}
            </div>
          </CardContent>
        </Card>
      ))}

      {activities.length > 0 && (
        <Button
          type="button"
          variant="outline"
          className="w-full"
          onClick={addActivity}
        >
          <Plus className="h-4 w-4 mr-1" />
          Adicionar Atividade
        </Button>
      )}
    </div>
  );
};
