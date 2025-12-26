import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { ViewToggle } from "@/components/tech/tasks/ViewToggle";
import { TasksKanbanView } from "@/components/tech/tasks/TasksKanbanView";
import { Ship, Calendar, Clock } from "lucide-react";
import { format } from "date-fns";
import { Task, TaskStatus, GroupedTask } from "@/types/task";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

const Tasks = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { user } = useAuth();
  const [dateFilter, setDateFilter] = useState("");
  const [vesselFilter, setVesselFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [existingReports, setExistingReports] = useState<Record<string, boolean>>({});
  const [loading, setLoading] = useState(true);
  const [view, setView] = useState<"list" | "kanban">("list");

  useEffect(() => {
    fetchTasks();
  }, []);

  const fetchTasks = async () => {
    try {
      setLoading(true);

      // Get technician ID for current user
      const { data: techData } = await supabase
        .from("technicians")
        .select("id")
        .eq("user_id", user?.id)
        .single();

      if (!techData) {
        setTasks([]);
        return;
      }

      const { data, error } = await supabase
        .from("tasks")
        .select(`
          id,
          title,
          description,
          status,
          due_date,
          service_order_id,
          service_orders:service_order_id (
            id,
            order_number,
            scheduled_date,
            service_date_time,
            single_report,
            vessels:vessel_id (
              name
            )
          ),
          task_types:task_type_id (
            name
          )
        `)
        .eq("assigned_to", techData.id)
        .order("created_at", { ascending: false });

      if (error) throw error;

      const formattedTasks: Task[] = data?.map((task: any) => ({
        id: task.id,
        serviceOrderId: task.service_order_id,
        orderNumber: task.service_orders?.order_number || "N/A",
        vesselName: task.service_orders?.vessels?.name || "N/A",
        description: task.task_types?.name || task.title || task.description,
        taskName: task.task_types?.name || task.title || task.description,
        scheduledDate: task.service_orders?.service_date_time 
          ? new Date(task.service_orders.service_date_time)
          : task.service_orders?.scheduled_date
          ? new Date(task.service_orders.scheduled_date)
          : task.due_date 
          ? new Date(task.due_date) 
          : new Date(),
        status: task.status as TaskStatus,
        singleReport: task.service_orders?.single_report || false,
      })) || [];

      setTasks(formattedTasks);

      // Fetch existing reports for each unique service order
      const uniqueServiceOrderIds = [...new Set(formattedTasks.map(t => t.serviceOrderId).filter(Boolean))];
      
      if (uniqueServiceOrderIds.length > 0) {
        const { data: reports } = await supabase
          .from('task_reports')
          .select('task_id')
          .in('task_id', uniqueServiceOrderIds);

        const reportsMap: Record<string, boolean> = {};
        reports?.forEach(report => {
          if (report.task_id) {
            reportsMap[report.task_id] = true;
          }
        });
        setExistingReports(reportsMap);
      }
    } catch (error: any) {
      toast({
        title: "Erro ao carregar tarefas",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: "in_progress" })
        .eq("id", taskId);

      if (error) throw error;

      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId ? { ...task, status: "in_progress" as TaskStatus } : task
        )
      );

      toast({
        title: "Tarefa iniciada",
        description: `A tarefa foi iniciada com sucesso.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao iniciar tarefa",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleFinishTask = async (taskId: string) => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ 
          status: "completed",
          completed_at: new Date().toISOString()
        })
        .eq("id", taskId);

      if (error) throw error;

      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId ? { ...task, status: "completed" as TaskStatus } : task
        )
      );

      toast({
        title: "Tarefa finalizada",
        description: "Agora você pode criar o relatório da tarefa.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao finalizar tarefa",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (taskId: string, newStatus: TaskStatus) => {
    try {
      const updateData: any = { status: newStatus };
      if (newStatus === "completed") {
        updateData.completed_at = new Date().toISOString();
      }

      const { error } = await supabase
        .from("tasks")
        .update(updateData)
        .eq("id", taskId);

      if (error) throw error;

      setTasks(prevTasks =>
        prevTasks.map(task =>
          task.id === taskId ? { ...task, status: newStatus } : task
        )
      );

      toast({
        title: "Status atualizado",
        description: `O status da tarefa foi atualizado com sucesso.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar status",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleCreateReport = (serviceOrderId: string) => {
    navigate(`/tech/reports/new?serviceOrderId=${serviceOrderId}`);
  };

  const handleViewDetails = (taskId: string) => {
    navigate(`/tech/tasks/${taskId}`);
  };

  const handleRefreshTasks = () => {
    fetchTasks();
  };

  const getStatusDisplay = (status: TaskStatus) => {
    if (status === "waiting" || status === "pending") {
      return {
        text: "Aguardando",
        variant: "secondary" as const
      };
    } else if (status === "in_progress") {
      return {
        text: "Em Andamento",
        variant: "default" as const
      };
    } else {
      return {
        text: "Finalizada",
        variant: "outline" as const
      };
    }
  };

  // Helper: Check if all tasks of an OS are completed
  const areAllTasksOfOSCompleted = (serviceOrderId: string | undefined) => {
    if (!serviceOrderId) return false;
    const osTasksStatuses = tasks.filter(t => t.serviceOrderId === serviceOrderId);
    return osTasksStatuses.length > 0 && osTasksStatuses.every(t => t.status === "completed");
  };

  // Helper: Check if at least one task is in_progress or completed (can start editing report)
  const canEditReport = (serviceOrderId: string | undefined) => {
    if (!serviceOrderId) return false;
    const osTasks = tasks.filter(t => t.serviceOrderId === serviceOrderId);
    return osTasks.some(t => t.status === "in_progress" || t.status === "completed");
  };

  // Group tasks by OS when single_report = true
  const groupedTasks: GroupedTask[] = useMemo(() => {
    const groups = new Map<string, GroupedTask>();
    
    tasks.forEach(task => {
      if (task.singleReport && task.serviceOrderId) {
        // Group tasks with same service order ID
        const key = task.serviceOrderId;
        if (!groups.has(key)) {
          groups.set(key, {
            ...task,
            tasksList: [task],
            taskCount: 1,
            groupedDescription: task.description || task.taskName || "",
          });
        } else {
          const group = groups.get(key)!;
          group.tasksList.push(task);
          group.taskCount++;
          // Update grouped description to show all task names
          const taskNames = group.tasksList.map(t => t.taskName || t.description).filter(Boolean);
          group.groupedDescription = taskNames.join(", ");
          
          // Update status: if any is in_progress, show in_progress; if all completed, show completed
          const allCompleted = group.tasksList.every(t => t.status === "completed");
          const anyInProgress = group.tasksList.some(t => t.status === "in_progress");
          if (allCompleted) {
            group.status = "completed";
          } else if (anyInProgress) {
            group.status = "in_progress";
          } else {
            group.status = "pending";
          }
        }
      } else {
        // Non-grouped tasks
        groups.set(task.id, {
          ...task,
          tasksList: [task],
          taskCount: 1,
          groupedDescription: task.description || "",
        });
      }
    });
    
    return Array.from(groups.values());
  }, [tasks]);

  // Helper: Check if report button should show for this grouped task
  const shouldShowReportButton = (groupedTask: GroupedTask) => {
    // Show report button if at least one task is in_progress or completed
    return canEditReport(groupedTask.serviceOrderId);
  };
  
  // Get button text based on all tasks completion status
  const getReportButtonText = (groupedTask: GroupedTask) => {
    const allCompleted = areAllTasksOfOSCompleted(groupedTask.serviceOrderId);
    if (existingReports[groupedTask.serviceOrderId!]) {
      return allCompleted ? "Enviar Relatório" : "Editar Relatório";
    }
    return allCompleted ? "Criar Relatório" : "Preencher Relatório";
  };

  // Mobile card view for grouped tasks
  const renderMobileTaskCard = (groupedTask: GroupedTask) => {
    const statusDisplay = getStatusDisplay(groupedTask.status);
    const isMultiTask = groupedTask.taskCount > 1;
    
    return (
      <div key={groupedTask.serviceOrderId || groupedTask.id} className="bg-card rounded-lg border shadow-sm p-4 mb-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="font-semibold">OS {groupedTask.orderNumber}</div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <Ship className="h-4 w-4" />
              {groupedTask.vesselName}
            </div>
          </div>
          <div className="flex flex-col items-end gap-1">
            <Badge variant={statusDisplay.variant}>{statusDisplay.text}</Badge>
            {isMultiTask && (
              <span className="text-xs text-muted-foreground">{groupedTask.taskCount} tarefas</span>
            )}
          </div>
        </div>
        
        <p className="text-sm text-foreground mb-3">
          {isMultiTask ? groupedTask.groupedDescription : groupedTask.description}
        </p>
        
        <div className="flex flex-wrap gap-3 mb-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {format(groupedTask.scheduledDate, "dd/MM/yyyy")}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {format(groupedTask.scheduledDate, "HH:mm")}
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          {!isMultiTask && (
            <Button
              variant="outline"
              size="sm"
              className="flex-1"
              onClick={() => handleViewDetails(groupedTask.id)}
            >
              Detalhes
            </Button>
          )}
          
          {/* Show task action buttons for individual tasks within the group */}
          {groupedTask.tasksList.map(task => (
            <div key={task.id} className={isMultiTask ? "w-full flex gap-2 items-center border-t pt-2 mt-2" : "contents"}>
              {isMultiTask && (
                <span className="text-xs text-muted-foreground flex-1 truncate">{task.taskName}</span>
              )}
              {(task.status === "waiting" || (task.status as string) === "pending") && (
                <Button
                  variant="default"
                  size="sm"
                  className={isMultiTask ? "" : "flex-1"}
                  onClick={() => handleStartTask(task.id)}
                >
                  Iniciar
                </Button>
              )}
              {task.status === "in_progress" && (
                <Button
                  variant="default"
                  size="sm"
                  className={isMultiTask ? "" : "flex-1"}
                  onClick={() => handleFinishTask(task.id)}
                >
                  Finalizar
                </Button>
              )}
            </div>
          ))}
          
          {shouldShowReportButton(groupedTask) && groupedTask.serviceOrderId && (
            <Button
              variant="default"
              size="sm"
              className="flex-1 w-full mt-2"
              onClick={() => handleCreateReport(groupedTask.serviceOrderId!)}
            >
              {getReportButtonText(groupedTask)}
            </Button>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight">Tarefas Atribuídas</h2>
        <div className="flex gap-2 sm:gap-4 w-full sm:w-auto">
          <ViewToggle view={view} onViewChange={setView} />
          <Button onClick={handleRefreshTasks} className="w-full sm:w-auto">Atualizar Lista</Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label>Data</label>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label>Embarcação</label>
              <Select value={vesselFilter} onValueChange={setVesselFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all-vessels">Todas</SelectItem>
                  {Array.from(new Set(tasks.map(t => t.vesselName))).map(v => (
                    <SelectItem key={v} value={v}>{v}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label>Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todos</SelectItem>
                  <SelectItem value="pending">Aguardando</SelectItem>
                  <SelectItem value="in_progress">Em Andamento</SelectItem>
                  <SelectItem value="completed">Finalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          {loading ? (
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start mb-3">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-5 w-32" />
                      <Skeleton className="h-4 w-48" />
                    </div>
                    <Skeleton className="h-6 w-24" />
                  </div>
                  <Skeleton className="h-4 w-full mb-3" />
                  <div className="flex gap-2">
                    <Skeleton className="h-9 flex-1" />
                    <Skeleton className="h-9 flex-1" />
                  </div>
                </div>
              ))}
            </div>
          ) : view === "list" ? (
            <>
              {/* Mobile card view */}
              <div className="md:hidden">
                {groupedTasks.map((groupedTask) => renderMobileTaskCard(groupedTask))}
                {groupedTasks.length === 0 && (
                  <div className="flex flex-col items-center justify-center p-12 text-center border rounded-lg border-dashed">
                    <Clock className="h-16 w-16 text-muted-foreground mb-4" />
                    <h3 className="text-lg font-medium">Nenhuma tarefa atribuída</h3>
                    <p className="text-sm text-muted-foreground mt-2 max-w-md">
                      Você não possui tarefas no momento. Novas tarefas aparecerão aqui quando forem atribuídas a você.
                    </p>
                  </div>
                )}
              </div>
              
              {/* Desktop table view */}
              <div className="hidden md:block table-responsive">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Número OS</TableHead>
                      <TableHead>Embarcação</TableHead>
                      <TableHead>Descrição</TableHead>
                      <TableHead>Data/Hora</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {groupedTasks.length === 0 ? (
                      <TableRow>
                        <TableCell colSpan={6} className="h-32">
                          <div className="flex flex-col items-center justify-center p-12 text-center">
                            <Clock className="h-16 w-16 text-muted-foreground mb-4" />
                            <h3 className="text-lg font-medium">Nenhuma tarefa atribuída</h3>
                            <p className="text-sm text-muted-foreground mt-2 max-w-md">
                              Você não possui tarefas no momento. Novas tarefas aparecerão aqui quando forem atribuídas a você.
                            </p>
                          </div>
                        </TableCell>
                      </TableRow>
                    ) : (
                      groupedTasks.map((groupedTask) => {
                        const statusDisplay = getStatusDisplay(groupedTask.status);
                        const isMultiTask = groupedTask.taskCount > 1;
                        
                        return (
                          <TableRow key={groupedTask.serviceOrderId || groupedTask.id}>
                            <TableCell className="font-medium">{groupedTask.orderNumber || groupedTask.id}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Ship className="h-4 w-4" />
                                {groupedTask.vesselName}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex flex-col gap-1">
                                <span>{isMultiTask ? groupedTask.groupedDescription : groupedTask.description}</span>
                                {isMultiTask && (
                                  <span className="text-xs text-muted-foreground">({groupedTask.taskCount} tarefas)</span>
                                )}
                              </div>
                            </TableCell>
                            <TableCell>
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  {format(groupedTask.scheduledDate, "dd/MM/yyyy")}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4" />
                                  {format(groupedTask.scheduledDate, "HH:mm")}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusDisplay.variant}>{statusDisplay.text}</Badge>
                            </TableCell>
                            <TableCell className="text-right">
                              <div className="flex flex-wrap gap-1 justify-end">
                                {!isMultiTask && (
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleViewDetails(groupedTask.id)}
                                  >
                                    Detalhes
                                  </Button>
                                )}
                                {groupedTask.tasksList.map(task => (
                                  <div key={task.id} className="inline-flex gap-1">
                                    {(task.status === "waiting" || (task.status as string) === "pending") && (
                                      <Button
                                        variant="default"
                                        size="sm"
                                        onClick={() => handleStartTask(task.id)}
                                        title={isMultiTask ? task.taskName : undefined}
                                      >
                                        {isMultiTask ? `Iniciar` : "Iniciar"}
                                      </Button>
                                    )}
                                    {task.status === "in_progress" && (
                                      <Button
                                        variant="default"
                                        size="sm"
                                        onClick={() => handleFinishTask(task.id)}
                                        title={isMultiTask ? task.taskName : undefined}
                                      >
                                        {isMultiTask ? `Finalizar` : "Finalizar"}
                                      </Button>
                                    )}
                                  </div>
                                ))}
                                {shouldShowReportButton(groupedTask) && groupedTask.serviceOrderId && (
                                  <Button
                                    variant="default"
                                    size="sm"
                                    onClick={() => handleCreateReport(groupedTask.serviceOrderId!)}
                                  >
                                    {getReportButtonText(groupedTask)}
                                  </Button>
                                )}
                              </div>
                            </TableCell>
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                </Table>
              </div>
            </>
          ) : (
            <TasksKanbanView tasks={tasks} onStatusChange={handleStatusChange} />
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default Tasks;
