import { useEffect, useState } from "react";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { VisitHistoryList } from "./VisitHistoryList";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ViewOrderDetailsDialogProps {
  orderId: string;
}

export const ViewOrderDetailsDialog = ({ orderId }: ViewOrderDetailsDialogProps) => {
  const { toast } = useToast();
  const [orderDetails, setOrderDetails] = useState<any>(null);
  const [loading, setLoading] = useState(true);

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
          vessels:vessel_id (name, vessel_type, flag),
          supervisor:supervisor_id (
            profiles:user_id (full_name)
          )
        `)
        .eq("id", orderId)
        .single();

      if (orderError) throw orderError;

      // Fetch tasks with technicians
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select(`
          *,
          task_types:task_type_id (name, category),
          technicians:assigned_to (
            profiles:user_id (full_name)
          )
        `)
        .eq("service_order_id", orderId);

      if (tasksError) throw tasksError;

      setOrderDetails({
        ...orderData,
        tasks: tasksData || [],
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

  const technicians = orderDetails.tasks
    ?.map((task: any) => task.technicians?.profiles?.full_name)
    .filter(Boolean) || [];

  const uniqueTechnicians = [...new Set(technicians)];

  return (
    <DialogContent className="max-w-2xl">
      <DialogHeader>
        <DialogTitle>Detalhes da Ordem de Serviço</DialogTitle>
        <DialogDescription>
          {orderDetails.order_number}
        </DialogDescription>
      </DialogHeader>
      
      <Tabs defaultValue="details" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="details">Detalhes</TabsTrigger>
          <TabsTrigger value="visits">Visitas</TabsTrigger>
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
            </dl>
          </div>

          <div>
            <h4 className="text-sm font-medium">Datas</h4>
            <Separator className="my-2" />
            <dl className="space-y-2">
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-muted-foreground">Criação:</dt>
                <dd className="text-sm">
                  {format(new Date(orderDetails.created_at), "dd/MM/yyyy HH:mm")}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-muted-foreground">Agendamento:</dt>
                <dd className="text-sm">
                  {orderDetails.scheduled_date 
                    ? format(new Date(orderDetails.scheduled_date), "dd/MM/yyyy")
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
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-muted-foreground">Supervisor:</dt>
                <dd className="text-sm">
                  {orderDetails.supervisor?.profiles?.full_name || "Não definido"}
                </dd>
              </div>
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-muted-foreground">Técnicos:</dt>
                <dd className="text-sm">
                  {uniqueTechnicians.length > 0 ? uniqueTechnicians.join(", ") : "Não atribuídos"}
                </dd>
              </div>
            </dl>
          </div>

          {orderDetails.tasks && orderDetails.tasks.length > 0 && (
            <div>
              <h4 className="text-sm font-medium">Tarefas</h4>
              <Separator className="my-2" />
              <div className="space-y-2">
                {orderDetails.tasks.map((task: any) => (
                  <div key={task.id} className="flex justify-between items-center p-2 border rounded">
                    <div className="flex-1">
                      <p className="text-sm font-medium">{task.title}</p>
                      {task.task_types && (
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
                  {orderDetails.clients?.address || orderDetails.vessels?.flag || "Não especificado"}
                </dd>
              </div>
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
      </Tabs>
    </DialogContent>
  );
};