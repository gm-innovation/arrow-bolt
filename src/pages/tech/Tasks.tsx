import { useState, useEffect } from "react";
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
import { Task, TaskStatus } from "@/types/task";
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
  const [statusFilter, setStatusFilter] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
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
          service_orders:service_order_id (
            order_number,
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
        vesselName: task.service_orders?.vessels?.name || "N/A",
        description: task.description || task.title,
        scheduledDate: task.due_date ? new Date(task.due_date) : new Date(),
        status: task.status as TaskStatus,
      })) || [];

      setTasks(formattedTasks);
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

  const handleCreateReport = (taskId: string) => {
    navigate(`/tech/reports/new?taskId=${taskId}`);
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

  // Mobile card view for tasks
  const renderMobileTaskCard = (task: Task) => {
    const statusDisplay = getStatusDisplay(task.status);
    
    return (
      <div key={task.id} className="bg-card rounded-lg border shadow-sm p-4 mb-4">
        <div className="flex justify-between items-start mb-3">
          <div>
            <div className="font-semibold">{task.id}</div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground mt-1">
              <Ship className="h-4 w-4" />
              {task.vesselName}
            </div>
          </div>
          <Badge variant={statusDisplay.variant}>{statusDisplay.text}</Badge>
        </div>
        
        <p className="text-sm text-foreground mb-3">{task.description}</p>
        
        <div className="flex flex-wrap gap-3 mb-4 text-sm text-muted-foreground">
          <div className="flex items-center gap-1">
            <Calendar className="h-4 w-4" />
            {format(task.scheduledDate, "dd/MM/yyyy")}
          </div>
          <div className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {format(task.scheduledDate, "HH:mm")}
          </div>
        </div>
        
        <div className="flex flex-wrap gap-2">
          <Button
            variant="outline"
            size="sm"
            className="flex-1"
            onClick={() => handleViewDetails(task.id)}
          >
            Detalhes
          </Button>
          
          {(task.status === "waiting" || (task.status as string) === "pending") && (
            <Button
              variant="default"
              size="sm"
              className="flex-1"
              onClick={() => handleStartTask(task.id)}
            >
              Iniciar
            </Button>
          )}
          
          {task.status === "in_progress" && (
            <Button
              variant="default"
              size="sm"
              className="flex-1"
              onClick={() => handleFinishTask(task.id)}
            >
              Finalizar
            </Button>
          )}
          
          {task.status === "completed" && (
            <Button
              variant="default"
              size="sm"
              className="flex-1"
              onClick={() => handleCreateReport(task.id)}
            >
              Criar Relatório
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
                  <SelectItem value="">Todas</SelectItem>
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
                  <SelectItem value="">Todos</SelectItem>
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
                {tasks.map(renderMobileTaskCard)}
                {tasks.length === 0 && (
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
                    {tasks.length === 0 ? (
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
                      tasks.map((task) => {
                        const statusDisplay = getStatusDisplay(task.status);
                        return (
                          <TableRow key={task.id}>
                            <TableCell>{task.id}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-2">
                                <Ship className="h-4 w-4" />
                                {task.vesselName}
                              </div>
                            </TableCell>
                            <TableCell>{task.description}</TableCell>
                            <TableCell>
                              <div className="flex items-center gap-4">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  {format(task.scheduledDate, "dd/MM/yyyy")}
                                </div>
                                <div className="flex items-center gap-2">
                                  <Clock className="h-4 w-4" />
                                  {format(task.scheduledDate, "HH:mm")}
                                </div>
                              </div>
                            </TableCell>
                            <TableCell>
                              <Badge variant={statusDisplay.variant}>{statusDisplay.text}</Badge>
                            </TableCell>
                            <TableCell className="text-right space-x-2">
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleViewDetails(task.id)}
                              >
                                Detalhes
                              </Button>
                              {(task.status === "waiting" || (task.status as string) === "pending") && (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleStartTask(task.id)}
                                >
                                  Iniciar
                                </Button>
                              )}
                              {task.status === "in_progress" && (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleFinishTask(task.id)}
                                >
                                  Finalizar
                                </Button>
                              )}
                              {task.status === "completed" && (
                                <Button
                                  variant="default"
                                  size="sm"
                                  onClick={() => handleCreateReport(task.id)}
                                >
                                  Criar Relatório
                                </Button>
                              )}
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
