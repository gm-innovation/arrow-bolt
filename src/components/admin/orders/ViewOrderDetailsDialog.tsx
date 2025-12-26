import { useEffect, useState } from "react";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { VisitHistoryList } from "./VisitHistoryList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { AuditTrailViewer } from "./AuditTrailViewer";
import { FileText, Plus } from "lucide-react";
import { useMeasurements } from "@/hooks/useMeasurements";
import { Dialog } from "@/components/ui/dialog";
import { MeasurementDialog } from "../measurements/MeasurementDialog";
import { formatLocalDate } from "@/lib/utils";

interface ViewOrderDetailsDialogProps {
  orderId: string;
}

export const ViewOrderDetailsDialog = ({ orderId }: ViewOrderDetailsDialogProps) => {
  const { toast } = useToast();
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [showMeasurementDialog, setShowMeasurementDialog] = useState(false);
  const { measurement, createMeasurement } = useMeasurements(orderId);

  useEffect(() => {
    fetchOrderDetails();
  }, [orderId]);

  const fetchOrderDetails = async () => {
    try {
      setLoading(true);

      // Fetch service order with related data
      const { data: orderData, error: orderError } = await supabase
        .from("service_orders")
        .select(`
          *,
          clients:client_id (name, contact_person, address),
          vessels:vessel_id (name, vessel_type, flag)
        `)
        .eq("id", orderId)
        .single();

      if (orderError) throw orderError;

      // Fetch supervisor if exists
      let supervisorData = null;
      if (orderData.supervisor_id) {
        const { data: supervisor } = await supabase
          .from("profiles")
          .select("full_name")
          .eq("id", orderData.supervisor_id)
          .single();
        supervisorData = supervisor;
      }

      // Fetch tasks with technicians and unique task types
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select(`
          *,
          task_types:task_type_id (name, category),
          technicians:assigned_to (
            id,
            profiles:user_id (full_name)
          )
        `)
        .eq("service_order_id", orderId);

      if (tasksError) throw tasksError;

      // Fetch initial visit first
      const { data: visitData, error: visitError } = await supabase
        .from("service_visits")
        .select("id")
        .eq("service_order_id", orderId)
        .eq("visit_type", "initial")
        .order("visit_number", { ascending: true })
        .limit(1)
        .maybeSingle();

      if (visitError) {
        console.error("Error fetching visit:", visitError);
      }

      // Then fetch visit technicians directly if visit exists
      let visitTechnicians = null;
      if (visitData?.id) {
        const { data: techData, error: techError } = await supabase
          .from("visit_technicians")
          .select(`
            technician_id,
            is_lead,
            technicians:technician_id (
              id,
              profiles:user_id (full_name)
            )
          `)
          .eq("visit_id", visitData.id);
        
        if (techError) {
          console.error("Error fetching visit technicians:", techError);
        } else {
          visitTechnicians = techData;
        }
      }

      setOrderDetails({
        ...orderData,
        supervisor: supervisorData,
        tasks: tasksData || [],
        visitTechnicians: visitTechnicians || [],
      });
    } catch (error: any) {
      toast({
        title: "Erro ao carregar detalhes",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCreateMeasurement = async () => {
    await createMeasurement.mutateAsync({
      service_order_id: orderId,
      category: 'EXTERNO',
    });
    setShowMeasurementDialog(true);
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
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalhes da Ordem de Serviço</DialogTitle>
        </DialogHeader>
        <div className="text-center py-8 text-muted-foreground">
          Carregando detalhes...
        </div>
      </DialogContent>
    );
  }

  if (!orderDetails) {
    return (
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Detalhes da Ordem de Serviço</DialogTitle>
        </DialogHeader>
        <div className="text-center py-8 text-muted-foreground">
          Ordem de serviço não encontrada
        </div>
      </DialogContent>
    );
  }

  const leadTechnician = orderDetails.visitTechnicians?.find((vt: any) => vt.is_lead);
  const auxiliaryTechnicians = orderDetails.visitTechnicians?.filter((vt: any) => !vt.is_lead) || [];

  // Get unique task types to avoid showing duplicates
  const uniqueTaskTypes = orderDetails.tasks?.reduce((acc: any[], task: any) => {
    if (!acc.find(t => t.task_type_id === task.task_type_id)) {
      acc.push(task);
    }
    return acc;
  }, []) || [];

  const isCompleted = orderDetails.status === 'completed';
  const hasMeasurement = !!measurement;

  return (
    <>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <div className="flex justify-between items-start">
            <div>
              <DialogTitle>Detalhes da Ordem de Serviço</DialogTitle>
              <DialogDescription>
                {orderDetails.order_number}
              </DialogDescription>
            </div>
            <div className="flex gap-2">
              {isCompleted && !hasMeasurement && (
                <Button
                  size="sm"
                  onClick={handleCreateMeasurement}
                  disabled={createMeasurement.isPending}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Criar Medição Final
                </Button>
              )}
              {hasMeasurement && (
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => setShowMeasurementDialog(true)}
                >
                  <FileText className="h-4 w-4 mr-2" />
                  Ver Medição
                </Button>
              )}
            </div>
          </div>
        </DialogHeader>
      
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="details">Detalhes</TabsTrigger>
          <TabsTrigger value="visits">Visitas</TabsTrigger>
          <TabsTrigger value="audit">Histórico</TabsTrigger>
        </TabsList>

        <TabsContent value="details">
          <ScrollArea className="h-[50vh] pr-4">
            <div className="space-y-6">
          <div>
            <h4 className="text-sm font-medium">Informações Básicas</h4>
            <Separator className="my-2" />
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-muted-foreground">Cliente:</dt>
                <dd className="text-sm">{orderDetails.clients?.name || "N/A"}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-muted-foreground">Embarcação:</dt>
                <dd className="text-sm">
                  {orderDetails.vessels?.name || "N/A"}
                  {orderDetails.vessels?.vessel_type && ` (${orderDetails.vessels.vessel_type})`}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-muted-foreground">Status:</dt>
                <dd className="text-sm">{getStatusBadge(orderDetails.status)}</dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-muted-foreground">Data do Serviço:</dt>
                <dd className="text-sm font-semibold">
                  {orderDetails.service_date_time 
                    ? format(new Date(orderDetails.service_date_time), "dd/MM/yyyy HH:mm")
                    : orderDetails.scheduled_date
                    ? formatLocalDate(orderDetails.scheduled_date)
                    : "-"}
                </dd>
              </div>
              {orderDetails.completed_date && (
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-muted-foreground">Conclusão:</dt>
                  <dd className="text-sm">
                    {format(new Date(orderDetails.completed_date), "dd/MM/yyyy HH:mm")}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          <div>
            <h4 className="text-sm font-medium">Equipe</h4>
            <Separator className="my-2" />
            <dl className="space-y-2">
              {orderDetails.supervisor && (
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-muted-foreground">Supervisor:</dt>
                  <dd className="text-sm">
                    {orderDetails.supervisor?.full_name || "Não definido"}
                  </dd>
                </div>
              )}
              {leadTechnician && (
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-muted-foreground">Técnico Responsável:</dt>
                  <dd className="text-sm font-medium">
                    {leadTechnician.technicians?.profiles?.full_name}
                  </dd>
                </div>
              )}
              {auxiliaryTechnicians.length > 0 && (
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-muted-foreground">Auxiliares:</dt>
                  <dd className="text-sm">
                    {auxiliaryTechnicians.map((vt: any) => 
                      vt.technicians?.profiles?.full_name
                    ).join(", ")}
                  </dd>
                </div>
              )}
            </dl>
          </div>

          {uniqueTaskTypes && uniqueTaskTypes.length > 0 && (
            <div>
              <h4 className="text-sm font-medium">Tarefas</h4>
              <Separator className="my-2" />
              <div className="space-y-2">
                {uniqueTaskTypes.map((task: any) => (
                  <div key={task.task_type_id} className="flex justify-between items-center p-2 border rounded">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{task.task_types?.name}</p>
                      {task.task_types?.category && (
                        <p className="text-xs text-muted-foreground">
                          {task.task_types.name} • {task.task_types.category}
                        </p>
                      )}
                    </div>
                    <Badge variant={task.status === "completed" ? "outline" : "secondary"}>
                      {task.status === "pending" && "Pendente"}
                      {task.status === "in_progress" && "Em Andamento"}
                      {task.status === "completed" && "Concluída"}
                    </Badge>
                  </div>
                ))}
              </div>
            </div>
          )}

          <div>
            <h4 className="text-sm font-medium">Detalhes do Serviço</h4>
            <Separator className="my-2" />
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-muted-foreground">Local:</dt>
                <dd className="text-sm">
                  {orderDetails.location || "Não especificado"}
                </dd>
              </div>
              {orderDetails.access && (
                <div className="flex justify-between">
                  <dt className="text-sm font-medium text-muted-foreground">Acesso:</dt>
                  <dd className="text-sm">{orderDetails.access}</dd>
                </div>
              )}
              {orderDetails.description && (
                <div className="space-y-1">
                  <dt className="text-sm font-medium text-muted-foreground">Descrição:</dt>
                  <dd className="text-sm">{orderDetails.description}</dd>
                </div>
              )}
            </dl>
          </div>
        </div>
      </ScrollArea>
        </TabsContent>

        <TabsContent value="visits">
          <ScrollArea className="h-[50vh] pr-4">
            <VisitHistoryList serviceOrderId={orderId} />
          </ScrollArea>
        </TabsContent>

        <TabsContent value="audit">
          <ScrollArea className="h-[50vh] pr-4">
            <div className="space-y-4 mb-4">
              <div className="bg-muted/50 p-3 rounded-lg">
                <div className="flex justify-between items-start mb-2">
                  <span className="text-sm font-medium">Criação da OS</span>
                  <span className="text-xs text-muted-foreground">
                    {format(new Date(orderDetails.created_at), "dd/MM/yyyy HH:mm")}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Ordem de serviço criada no sistema
                </p>
              </div>
              
              {orderDetails.scheduled_date && (
                <div className="bg-muted/50 p-3 rounded-lg">
                  <div className="flex justify-between items-start mb-2">
                    <span className="text-sm font-medium">Agendamento</span>
                    <span className="text-xs text-muted-foreground">
                      {formatLocalDate(orderDetails.scheduled_date)}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Data de agendamento do serviço
                  </p>
                </div>
              )}
            </div>
            <AuditTrailViewer serviceOrderId={orderId} />
          </ScrollArea>
        </TabsContent>
      </Tabs>
      </DialogContent>

      <Dialog open={showMeasurementDialog} onOpenChange={setShowMeasurementDialog}>
        <MeasurementDialog 
          serviceOrderId={orderId}
          onClose={() => setShowMeasurementDialog(false)}
        />
      </Dialog>
    </>
  );
};