import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import { Card, CardContent } from "@/components/ui/card";
import { Ship, Calendar, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

interface Task {
  id: string;
  vesselName: string;
  description: string;
  scheduledDate: Date;
  status: "waiting" | "in_progress" | "completed";
}

interface TasksKanbanViewProps {
  tasks: Task[];
  onStatusChange: (taskId: string, newStatus: Task["status"]) => void;
}

const columns = [
  { id: "waiting", title: "Aguardando" },
  { id: "in_progress", title: "Em Andamento" },
  { id: "completed", title: "Finalizadas" },
];

export const TasksKanbanView = ({ tasks, onStatusChange }: TasksKanbanViewProps) => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleDragEnd = (result: any) => {
    if (!result.destination) return;

    const { draggableId, destination } = result;
    const newStatus = destination.droppableId as Task["status"];
    onStatusChange(draggableId, newStatus);
  };

  const handleViewDetails = (taskId: string) => {
    navigate(`/tech/tasks/${taskId}`);
  };

  const handleCreateReport = (taskId: string) => {
    navigate(`/tech/reports/new?taskId=${taskId}`);
  };

  return (
    <DragDropContext onDragEnd={handleDragEnd}>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {columns.map((column) => (
          <div key={column.id} className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-semibold mb-4">{column.title}</h3>
            <Droppable droppableId={column.id}>
              {(provided) => (
                <div
                  ref={provided.innerRef}
                  {...provided.droppableProps}
                  className="space-y-4"
                >
                  {tasks
                    .filter((task) => task.status === column.id)
                    .map((task, index) => (
                      <Draggable
                        key={task.id}
                        draggableId={task.id}
                        index={index}
                      >
                        {(provided) => (
                          <div
                            ref={provided.innerRef}
                            {...provided.draggableProps}
                            {...provided.dragHandleProps}
                          >
                            <Card>
                              <CardContent className="p-4">
                                <div className="space-y-2">
                                  <div className="flex items-center gap-2 font-semibold">
                                    <Ship className="h-4 w-4" />
                                    {task.vesselName}
                                  </div>
                                  <p className="text-sm">{task.description}</p>
                                  <div className="flex items-center gap-4 text-sm text-gray-600">
                                    <div className="flex items-center gap-1">
                                      <Calendar className="h-4 w-4" />
                                      {format(task.scheduledDate, "dd/MM/yyyy")}
                                    </div>
                                    <div className="flex items-center gap-1">
                                      <Clock className="h-4 w-4" />
                                      {format(task.scheduledDate, "HH:mm")}
                                    </div>
                                  </div>
                                  <div className="flex justify-end gap-2 mt-2">
                                    <Button
                                      variant="outline"
                                      size="sm"
                                      onClick={() => handleViewDetails(task.id)}
                                    >
                                      Detalhes
                                    </Button>
                                    {task.status === "completed" && (
                                      <Button
                                        variant="default"
                                        size="sm"
                                        onClick={() => handleCreateReport(task.id)}
                                      >
                                        Criar Relatório
                                      </Button>
                                    )}
                                  </div>
                                </div>
                              </CardContent>
                            </Card>
                          </div>
                        )}
                      </Draggable>
                    ))}
                  {provided.placeholder}
                </div>
              )}
            </Droppable>
          </div>
        ))}
      </div>
    </DragDropContext>
  );
};