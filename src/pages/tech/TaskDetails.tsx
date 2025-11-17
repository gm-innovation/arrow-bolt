import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ServiceOrderInfo } from "@/components/tech/tasks/ServiceOrderInfo";
import { AdminInfo } from "@/components/tech/tasks/AdminInfo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { Calendar, Clock, History, Loader2, AlertCircle } from "lucide-react";
import { NewContinuationVisitButton } from "@/components/tech/NewContinuationVisitButton";
import { VisitHistoryTimeline } from "@/components/tech/VisitHistoryTimeline";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";

const TaskDetails = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();
  
  const [loading, setLoading] = useState(true);
  const [taskData, setTaskData] = useState<any>(null);
  const [serviceOrderData, setServiceOrderData] = useState<any>(null);

  useEffect(() => {
    if (taskId) {
      fetchTaskDetails();
    }
  }, [taskId]);

  const fetchTaskDetails = async () => {
    try {
      setLoading(true);

      // Fetch task with all related data
      const { data: task, error: taskError } = await supabase
        .from("tasks")
        .select(`
          *,
          service_orders:service_order_id (
            id,
            order_number,
            scheduled_date,
            service_date_time,
            location,
            access,
            description,
            status,
            created_at,
            supervisor_id,
            clients:client_id (
              name,
              contact_person,
              cnpj,
              address,
              phone,
              email
            ),
            vessels:vessel_id (
              name,
              vessel_type,
              flag,
              imo_number
            ),
            created_by_profile:created_by (
              full_name,
              phone,
              email
            )
          ),
          task_types:task_type_id (
            name,
            description,
            category,
            steps,
            tools,
            photo_labels
          ),
          assigned_technician:assigned_to (
            user_id,
            profiles:user_id (full_name)
          )
        `)
        .eq("id", taskId)
        .single();

      if (taskError) throw taskError;

      if (!task) {
        throw new Error("Tarefa não encontrada");
      }

      // Fetch supervisor profile if exists
      let supervisorProfile = null;
      if (task.service_orders.supervisor_id) {
        const { data: supervisor } = await supabase
          .from("profiles")
          .select("full_name, phone, email")
          .eq("id", task.service_orders.supervisor_id)
          .single();
        supervisorProfile = supervisor;
      }

      // Fetch all technicians assigned to this service order
      const { data: allTasks } = await supabase
        .from("tasks")
        .select(`
          id,
          assigned_to,
          technicians:assigned_to (
            user_id,
            profiles:user_id (full_name)
          )
        `)
        .eq("service_order_id", task.service_orders.id);

      // Get unique technicians
      const techniciansList = allTasks
        ?.map((t: any) => t.technicians?.profiles?.full_name)
        .filter(Boolean) || [];

      const uniqueTechnicians = [...new Set(techniciansList)];

      // Determine lead technician (first assigned or current user's task)
      const leadTechnician = task.assigned_technician?.profiles?.full_name || uniqueTechnicians[0] || "Não atribuído";
      const assistants = uniqueTechnicians.filter(name => name !== leadTechnician);

      setTaskData(task);
      setServiceOrderData({
        id: task.service_orders.order_number,
        orderNumber: task.service_orders.order_number,
        scheduledDate: task.service_orders.service_date_time 
          ? new Date(task.service_orders.service_date_time)
          : task.service_orders.scheduled_date
          ? new Date(task.service_orders.scheduled_date)
          : new Date(),
        location: task.service_orders.location || 
                 task.service_orders.vessels?.name || 
                 "Local não especificado",
        access: task.service_orders.access || "Sem informações de acesso",
        requester: {
          name: task.service_orders.clients?.contact_person || 
                task.service_orders.clients?.name || 
                "Não especificado",
          role: "Solicitante",
          company: task.service_orders.clients?.name || "N/A",
          cnpj: task.service_orders.clients?.cnpj || "N/A",
          phone: task.service_orders.clients?.phone || "N/A",
          email: task.service_orders.clients?.email || "N/A",
        },
        supervisor: {
          name: supervisorProfile?.full_name || "Não definido",
          phone: supervisorProfile?.phone || "N/A",
          email: supervisorProfile?.email || "N/A",
        },
        team: {
          leadTechnician,
          assistants,
        },
        vessel: {
          name: task.service_orders.vessels?.name || "N/A",
          type: task.service_orders.vessels?.vessel_type || "N/A",
          flag: task.service_orders.vessels?.flag || "N/A",
          imo: task.service_orders.vessels?.imo_number || "N/A",
        },
        service: task.task_types?.name || task.title || "Serviço",
        description: task.description || task.service_orders.description || "",
        status: task.status,
        serviceOrderId: task.service_orders.id,
      });

    } catch (error: any) {
      console.error("Error fetching task details:", error);
      toast({
        title: "Erro ao carregar tarefa",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleStartTask = async () => {
    try {
      const { error } = await supabase
        .from("tasks")
        .update({ status: "in_progress" })
        .eq("id", taskId);

      if (error) throw error;

      toast({
        title: "Tarefa iniciada",
        description: `A tarefa foi iniciada com sucesso.`,
      });

      fetchTaskDetails(); // Refresh data
    } catch (error: any) {
      toast({
        title: "Erro ao iniciar tarefa",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: any }> = {
      pending: { label: "Pendente", variant: "secondary" },
      in_progress: { label: "Em Andamento", variant: "default" },
      completed: { label: "Concluído", variant: "outline" },
    };
    const config = statusConfig[status] || { label: status, variant: "secondary" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!taskData || !serviceOrderData) {
    return (
      <div className="space-y-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Não foi possível carregar os detalhes da tarefa. A tarefa pode não existir ou você pode não ter permissão para visualizá-la.
          </AlertDescription>
        </Alert>
        <Button onClick={() => navigate("/tech/tasks")}>Voltar para Tarefas</Button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div className="flex-1">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl md:text-3xl font-bold tracking-tight">
              OS {serviceOrderData.orderNumber}
            </h2>
            {getStatusBadge(serviceOrderData.status)}
          </div>
          <div className="flex flex-wrap items-center gap-4 mt-2 text-sm text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {format(serviceOrderData.scheduledDate, "dd/MM/yyyy")}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {format(serviceOrderData.scheduledDate, "HH:mm")}
            </div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 w-full md:w-auto">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline" className="flex-1 md:flex-none">
                <History className="mr-2 h-4 w-4" />
                Histórico
              </Button>
            </SheetTrigger>
            <SheetContent className="w-full sm:max-w-lg">
              <SheetHeader>
                <SheetTitle>Histórico de Visitas</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <VisitHistoryTimeline serviceOrderId={serviceOrderData.serviceOrderId} />
              </div>
            </SheetContent>
          </Sheet>
          <NewContinuationVisitButton serviceOrderId={serviceOrderData.serviceOrderId} />
          <Button onClick={() => navigate("/tech/tasks")} variant="outline" className="flex-1 md:flex-none">
            Voltar
          </Button>
        </div>
      </div>

      <ServiceOrderInfo
        location={serviceOrderData.location}
        access={serviceOrderData.access}
        requester={serviceOrderData.requester}
        supervisor={serviceOrderData.supervisor}
        team={serviceOrderData.team}
        vessel={serviceOrderData.vessel}
      />

      <Card>
        <CardContent className="pt-6">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold mb-2">{taskData.title}</h3>
              {taskData.description && (
                <p className="text-muted-foreground">{taskData.description}</p>
              )}
            </div>

            {taskData.task_types && <AdminInfo taskType={taskData.task_types} />}

            <div className="flex justify-center pt-4">
              {taskData.status === "pending" && (
                <Button size="lg" onClick={handleStartTask}>
                  Iniciar Tarefa
                </Button>
              )}
              {taskData.status === "in_progress" && (
                <div className="text-center space-y-3">
                  <Badge variant="default" className="text-lg px-4 py-2">
                    Tarefa em Andamento
                  </Badge>
                  <p className="text-sm text-muted-foreground">
                    Você pode criar o relatório quando finalizar a tarefa
                  </p>
                </div>
              )}
              {taskData.status === "completed" && (
                <div className="text-center space-y-3">
                  <Badge variant="outline" className="text-lg px-4 py-2">
                    Tarefa Concluída
                  </Badge>
                  <Button onClick={() => navigate(`/tech/reports/new?taskId=${taskId}`)}>
                    Criar Relatório
                  </Button>
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TaskDetails;