import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { format } from "date-fns";
import { Calendar, Clock, Loader2, AlertCircle, MapPin, Users, Ship, Building, CheckCircle, Wrench, ListCheck, Camera } from "lucide-react";
import { NewContinuationVisitButton } from "@/components/tech/NewContinuationVisitButton";
import { VisitHistoryTimeline } from "@/components/tech/VisitHistoryTimeline";
import { supabase } from "@/integrations/supabase/client";
import { useState, useEffect } from "react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

// Helper functions for safe data handling
const safeValue = (value: any, fallback: string = 'N/A') => value || fallback;
const safeArray = (arr: any[] | null | undefined) => Array.isArray(arr) ? arr : [];

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
      if (!task) throw new Error("Tarefa não encontrada");

      // Fetch supervisor profile
      let supervisorProfile = null;
      if (task.service_orders?.supervisor_id) {
        const { data: supervisor } = await supabase
          .from("profiles")
          .select("full_name, phone, email")
          .eq("id", task.service_orders.supervisor_id)
          .maybeSingle();
        supervisorProfile = supervisor;
      }

      // Fetch all technicians from tasks
      const { data: allTasks } = await supabase
        .from("tasks")
        .select(`
          id,
          assigned_to,
          technicians:assigned_to (
            id,
            user_id,
            profiles:user_id (full_name)
          )
        `)
        .eq("service_order_id", task.service_orders?.id || '');

      // Fetch technicians from visit_technicians (assigned to the service order's visits)
      const { data: visitTechnicians } = await supabase
        .from("service_visits")
        .select(`
          id,
          visit_technicians (
            technician_id,
            is_lead,
            technicians (
              id,
              user_id,
              profiles:user_id (full_name)
            )
          )
        `)
        .eq("service_order_id", task.service_orders?.id || '');

      // Collect all unique technicians from both sources
      const techMap = new Map<string, { name: string; isLead: boolean }>();
      
      // Add technicians from tasks
      safeArray(allTasks).forEach((t: any) => {
        if (t?.technicians?.id && t?.technicians?.profiles?.full_name) {
          techMap.set(t.technicians.id, {
            name: t.technicians.profiles.full_name,
            isLead: t.assigned_to === task.assigned_to
          });
        }
      });

      // Add technicians from visits
      safeArray(visitTechnicians).forEach((visit: any) => {
        safeArray(visit.visit_technicians).forEach((vt: any) => {
          if (vt?.technicians?.id && vt?.technicians?.profiles?.full_name) {
            const existing = techMap.get(vt.technicians.id);
            techMap.set(vt.technicians.id, {
              name: vt.technicians.profiles.full_name,
              isLead: existing?.isLead || vt.is_lead || false
            });
          }
        });
      });

      // Determine lead technician and assistants
      const allTechniciansList = Array.from(techMap.values());
      const leadTech = allTechniciansList.find(t => t.isLead);
      const leadTechnician = leadTech?.name || task.assigned_technician?.profiles?.full_name || "Não atribuído";
      const assistants = allTechniciansList
        .filter(t => t.name !== leadTechnician)
        .map(t => t.name);

      setTaskData(task);
      setServiceOrderData({
        id: task.service_orders?.order_number || "N/A",
        orderNumber: task.service_orders?.order_number || "N/A",
        scheduledDate: task.service_orders?.service_date_time 
          ? new Date(task.service_orders.service_date_time)
          : task.service_orders?.scheduled_date
          ? new Date(task.service_orders.scheduled_date)
          : new Date(),
        location: task.service_orders?.location || 
                 task.service_orders?.vessels?.name || 
                 "Local não especificado",
        access: task.service_orders?.access || "Sem informações de acesso",
        client: {
          name: task.service_orders?.clients?.name || "N/A",
          contact: task.service_orders?.clients?.contact_person || "N/A",
          cnpj: task.service_orders?.clients?.cnpj || "N/A",
          phone: task.service_orders?.clients?.phone || "N/A",
          email: task.service_orders?.clients?.email || "N/A",
        },
        supervisor: {
          name: supervisorProfile?.full_name || "Não definido",
          phone: supervisorProfile?.phone || "N/A",
          email: supervisorProfile?.email || "N/A",
        },
        team: {
          leadTechnician,
          assistants: assistants || [],
        },
        vessel: {
          name: task.service_orders?.vessels?.name || "N/A",
          type: task.service_orders?.vessels?.vessel_type || "N/A",
          flag: task.service_orders?.vessels?.flag || "N/A",
          imo: task.service_orders?.vessels?.imo_number || "N/A",
        },
        status: task.status,
        serviceOrderId: task.service_orders?.id,
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

      fetchTaskDetails();
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

  // Extract task type data safely
  const taskTypeName = safeValue(taskData.task_types?.name || taskData.title, 'Tarefa');
  const taskDescription = safeValue(taskData.task_types?.description || taskData.description);
  const tools = safeArray(taskData.task_types?.tools);
  const steps = safeArray(taskData.task_types?.steps);
  const photoLabels = safeArray(taskData.task_types?.photo_labels);

  return (
    <div className="space-y-6">
      {/* Header */}
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
        <Button onClick={() => navigate("/tech/tasks")} variant="outline">
          Voltar
        </Button>
      </div>

      {/* Tabs */}
      <Tabs defaultValue="resumo" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="resumo">Resumo da OS</TabsTrigger>
          <TabsTrigger value="instrucoes">Instruções</TabsTrigger>
          <TabsTrigger value="historico">Histórico</TabsTrigger>
        </TabsList>

        {/* Resumo Tab */}
        <TabsContent value="resumo" className="space-y-4 mt-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Client Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Building className="h-5 w-5" />
                  Cliente
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Empresa</p>
                  <p className="text-sm">{serviceOrderData.client.name}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Contato</p>
                  <p className="text-sm">{serviceOrderData.client.contact}</p>
                  {serviceOrderData.client.phone !== 'N/A' && (
                    <p className="text-xs text-muted-foreground">{serviceOrderData.client.phone}</p>
                  )}
                  {serviceOrderData.client.email !== 'N/A' && (
                    <p className="text-xs text-muted-foreground">{serviceOrderData.client.email}</p>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Vessel Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Ship className="h-5 w-5" />
                  Embarcação
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Nome</p>
                  <p className="text-sm">{serviceOrderData.vessel.name}</p>
                </div>
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Tipo</p>
                  <p className="text-sm">{serviceOrderData.vessel.type}</p>
                </div>
                {serviceOrderData.vessel.imo !== 'N/A' && (
                  <div>
                    <p className="text-sm font-medium text-muted-foreground">IMO</p>
                    <p className="text-sm">{serviceOrderData.vessel.imo}</p>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Location Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <MapPin className="h-5 w-5" />
                  Local e Acesso
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Local</p>
                  <p className="text-sm">{serviceOrderData.location}</p>
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Instruções de Acesso</p>
                  <p className="text-sm">{serviceOrderData.access}</p>
                </div>
              </CardContent>
            </Card>

            {/* Team Card */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Users className="h-5 w-5" />
                  Equipe
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Supervisor</p>
                  <p className="text-sm">{serviceOrderData.supervisor.name}</p>
                  {serviceOrderData.supervisor.phone !== 'N/A' && (
                    <p className="text-xs text-muted-foreground">{serviceOrderData.supervisor.phone}</p>
                  )}
                  {serviceOrderData.supervisor.email !== 'N/A' && (
                    <p className="text-xs text-muted-foreground">{serviceOrderData.supervisor.email}</p>
                  )}
                </div>
                <Separator />
                <div>
                  <p className="text-sm font-medium text-muted-foreground">Técnico Responsável</p>
                  <p className="text-sm">{serviceOrderData.team.leadTechnician}</p>
                </div>
                {serviceOrderData.team.assistants.length > 0 && (
                  <>
                    <Separator />
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Auxiliares</p>
                      <ul className="text-sm list-disc list-inside space-y-1">
                        {serviceOrderData.team.assistants.map((assistant: string, index: number) => (
                          <li key={index}>{assistant}</li>
                        ))}
                      </ul>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Action Buttons */}
          <Card>
            <CardContent className="pt-6">
              <div className="flex flex-col items-center gap-4">
                {taskData.status === "pending" && (
                  <Button size="lg" onClick={handleStartTask} className="w-full md:w-auto">
                    <CheckCircle className="mr-2 h-5 w-5" />
                    Iniciar Tarefa
                  </Button>
                )}
                {taskData.status === "in_progress" && (
                  <div className="text-center space-y-3 w-full">
                    <Badge variant="default" className="text-lg px-4 py-2">
                      Tarefa em Andamento
                    </Badge>
                    <p className="text-sm text-muted-foreground">
                      Você pode criar o relatório quando finalizar a tarefa
                    </p>
                    <Button 
                      onClick={() => navigate(`/tech/reports/new?taskId=${taskId}`)}
                      className="w-full md:w-auto"
                    >
                      Criar Relatório
                    </Button>
                  </div>
                )}
                {taskData.status === "completed" && (
                  <div className="text-center space-y-3 w-full">
                    <Badge variant="outline" className="text-lg px-4 py-2">
                      Tarefa Concluída
                    </Badge>
                    <Button 
                      onClick={() => navigate(`/tech/reports/new?taskId=${taskId}`)}
                      className="w-full md:w-auto"
                    >
                      Criar Relatório
                    </Button>
                  </div>
                )}
                <NewContinuationVisitButton 
                  serviceOrderId={serviceOrderData.serviceOrderId}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        {/* Instruções Tab */}
        <TabsContent value="instrucoes" className="space-y-4 mt-6">
          {/* Task Name and Description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-xl">{taskTypeName}</CardTitle>
            </CardHeader>
            <CardContent>
              {taskDescription !== 'N/A' && (
                <p className="text-muted-foreground">{taskDescription}</p>
              )}
            </CardContent>
          </Card>

          {/* Tools - only show if has data */}
          {tools.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Wrench className="h-5 w-5" />
                  Ferramentas e Equipamentos Necessários
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {tools.map((tool: any, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-primary mt-1">•</span>
                      <span className="text-sm">
                        {typeof tool === 'string' ? tool : safeValue(tool.name)}
                        {tool.quantity && ` (${tool.quantity})`}
                      </span>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Steps - only show if has data */}
          {steps.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <ListCheck className="h-5 w-5" />
                  Passo a Passo
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ol className="space-y-3">
                  {steps.map((step: any, index: number) => (
                    <li key={index} className="flex gap-3">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary text-primary-foreground flex items-center justify-center text-sm font-medium">
                        {index + 1}
                      </span>
                      <span className="text-sm pt-0.5">
                        {typeof step === 'string' ? step : safeValue(step.description)}
                      </span>
                    </li>
                  ))}
                </ol>
              </CardContent>
            </Card>
          )}

          {/* Photos - only show if has data */}
          {photoLabels.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg">
                  <Camera className="h-5 w-5" />
                  Fotos Necessárias
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ul className="space-y-2">
                  {photoLabels.map((label: any, index: number) => (
                    <li key={index} className="flex items-start gap-2">
                      <span className="text-primary mt-1">📷</span>
                      <div className="text-sm">
                        <p className="font-medium">
                          {typeof label === 'string' ? label : safeValue(label.label || label.name)}
                        </p>
                        {label.description && (
                          <p className="text-muted-foreground text-xs mt-1">
                            {label.description}
                          </p>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          )}

          {/* Show message if no instructions */}
          {tools.length === 0 && steps.length === 0 && photoLabels.length === 0 && (
            <Card>
              <CardContent className="py-8">
                <p className="text-center text-muted-foreground">
                  Nenhuma instrução específica foi definida para esta tarefa.
                </p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        {/* Histórico Tab */}
        <TabsContent value="historico" className="space-y-4 mt-6">
          <Card>
            <CardContent className="pt-6">
              <VisitHistoryTimeline serviceOrderId={serviceOrderData.serviceOrderId} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default TaskDetails;
