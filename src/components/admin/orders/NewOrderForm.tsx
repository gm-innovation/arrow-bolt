import { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Checkbox } from "@/components/ui/checkbox";
import { ServiceDetails } from "./ServiceDetails";
import { TechniciansSelection } from "./TechniciansSelection";
import { LocationAccessSection } from "./LocationAccessSection";
import { useWhatsAppNotification } from "@/hooks/useWhatsAppNotification";

const orderFormSchema = z.object({
  clientId: z.string().min(1, "Cliente é obrigatório"),
  vesselId: z.string().min(1, "Embarcação é obrigatória"),
  requesterId: z.string().optional(),
  serviceDateTime: z.string()
    .min(1, "Data e hora do serviço é obrigatória")
    .refine((date) => {
      const selectedDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return selectedDate >= today;
    }, "Data não pode ser no passado"),
  plannedLocation: z.string()
    .max(200, "Local deve ter no máximo 200 caracteres")
    .optional(),
  accessPointId: z.string().optional(),
  accessInstructions: z.string()
    .max(500, "Instruções devem ter no máximo 500 caracteres")
    .optional(),
  expectedContext: z.string().optional(),
  boardingMethod: z.string().optional(),
  taskTypes: z.array(z.string())
    .min(1, "Selecione pelo menos um tipo de tarefa"),
  singleReport: z.boolean().optional(),
  description: z.string()
    .trim()
    .max(500, "Descrição deve ter no máximo 500 caracteres")
    .optional(),
  supervisorId: z.string().optional(),
});

type OrderFormData = z.infer<typeof orderFormSchema>;

interface NewOrderFormProps {
  isEditing?: boolean;
  orderId?: string;
  orderNumber?: string;
  onSuccess?: () => void;
}

export const NewOrderForm = ({ isEditing, orderId, orderNumber, onSuccess }: NewOrderFormProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { sendTaskAssignmentNotification, sendScheduleChangeNotification } = useWhatsAppNotification();
  const [clients, setClients] = useState<any[]>([]);
  const [vessels, setVessels] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [requesters, setRequesters] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [selectedTechnicians, setSelectedTechnicians] = useState<string[]>([]);
  const [leadTechId, setLeadTechId] = useState<string>("");
  const [taskTypes, setTaskTypes] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [originalScheduledDate, setOriginalScheduledDate] = useState<string>("");
  const [originalOrderNumber, setOriginalOrderNumber] = useState<string>("");
  const [taskOrderNumbers, setTaskOrderNumbers] = useState<Record<string, string>>({});

  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      clientId: "",
      vesselId: "",
      requesterId: "",
      serviceDateTime: "",
      plannedLocation: "",
      accessPointId: "",
      accessInstructions: "",
      expectedContext: "docked",
      boardingMethod: "gangway",
      taskTypes: [],
      singleReport: true,
      description: "",
      supervisorId: "",
    }
  });

  const handleTaskOrderNumberChange = (taskTypeId: string, orderNum: string) => {
    setTaskOrderNumbers(prev => ({
      ...prev,
      [taskTypeId]: orderNum
    }));
  };

  const selectedClient = form.watch("clientId");

  useEffect(() => {
    const initialize = async () => {
      await fetchInitialData();
      if (isEditing && orderId) {
        await loadOrderData();
      }
    };
    initialize();
  }, [isEditing, orderId]);

  useEffect(() => {
    if (selectedClient) {
      fetchVessels(selectedClient);
    } else if (!isEditing) {
      // Only clear vessel when creating new order, not when editing
      setVessels([]);
      form.setValue("vesselId", "");
    }
  }, [selectedClient, isEditing]);

  const fetchInitialData = async () => {
    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user?.id)
        .single();

      if (!profileData?.company_id) return;

      // Fetch clients
      const { data: clientsData } = await supabase
        .from("clients")
        .select("id, name")
        .eq("company_id", profileData.company_id)
        .order("name");

      setClients(clientsData || []);

      // Fetch all admin user IDs
      const { data: adminRoles } = await supabase
        .from("user_roles")
        .select("user_id")
        .eq("role", "admin");

      const adminUserIds = adminRoles?.map(r => r.user_id) || [];

      // Fetch profiles for those users in the company
      const { data: supervisorsData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .in("id", adminUserIds)
        .eq("company_id", profileData.company_id)
        .order("full_name");

      setSupervisors(supervisorsData || []);
      setRequesters(supervisorsData || []); // Same list as supervisors (coordinators)

      // Fetch technicians with phone numbers
      const { data: techniciansData } = await supabase
        .from("technicians")
        .select(`
          id,
          profiles:user_id (
            full_name,
            phone
          )
        `)
        .eq("company_id", profileData.company_id)
        .eq("active", true);

      setTechnicians(techniciansData || []);

      // Fetch task types
      const { data: taskTypesData } = await supabase
        .from("task_types")
        .select("id, name, category")
        .eq("company_id", profileData.company_id)
        .order("name");

      setTaskTypes(taskTypesData || []);
    } catch (error: any) {
      console.error("Error fetching data:", error);
    }
  };

  const fetchVessels = async (clientId: string) => {
    try {
      const { data, error } = await supabase
        .from("vessels")
        .select("id, name")
        .eq("client_id", clientId)
        .order("name");

      if (error) throw error;
      setVessels(data || []);
    } catch (error: any) {
      console.error("Error fetching vessels:", error);
    }
  };

  const loadOrderData = async () => {
    if (!orderId) return;

    try {
      setIsLoading(true);

      // Fetch service order data
      const { data: orderData, error: orderError } = await supabase
        .from("service_orders")
        .select(`
          *,
          vessels:vessel_id (client_id)
        `)
        .eq("id", orderId)
        .single();

      if (orderError) throw orderError;

      // Fetch vessels for the client BEFORE populating form
      if (orderData.vessels?.client_id) {
        await fetchVessels(orderData.vessels.client_id);
      }

      // Fetch associated tasks with task_order_number
      const { data: tasksData } = await supabase
        .from("tasks")
        .select("task_type_id, assigned_to, task_order_number")
        .eq("service_order_id", orderId);

      // Build taskOrderNumbers map from existing tasks
      if (tasksData) {
        const orderNumsMap: Record<string, string> = {};
        tasksData.forEach((task: any) => {
          if (task.task_type_id && task.task_order_number) {
            orderNumsMap[task.task_type_id] = task.task_order_number;
          }
        });
        setTaskOrderNumbers(orderNumsMap);
      }

      // Convert serviceDateTime to correct format for datetime-local input
      let formattedServiceDateTime = "";
      if (orderData.service_date_time) {
        const date = new Date(orderData.service_date_time);
        // Format: YYYY-MM-DDTHH:MM (required by datetime-local input)
        formattedServiceDateTime = date.toISOString().slice(0, 16);
      }

      // Save original values for change detection
      setOriginalScheduledDate(orderData.scheduled_date || formattedServiceDateTime.split('T')[0] || "");
      setOriginalOrderNumber(orderData.order_number || "");

      // Populate form with ALL fields
      form.reset({
        clientId: orderData.vessels?.client_id || "",
        vesselId: orderData.vessel_id || "",
        requesterId: orderData.created_by || "",
        serviceDateTime: formattedServiceDateTime || orderData.scheduled_date + "T08:00",
        plannedLocation: orderData.planned_location || orderData.location || "",
        accessPointId: orderData.access_point_id || "",
        accessInstructions: orderData.access_instructions || orderData.access || "",
        expectedContext: orderData.expected_context || "docked",
        boardingMethod: orderData.boarding_method || "gangway",
        singleReport: orderData.single_report !== false,
        description: orderData.description || "",
        supervisorId: orderData.supervisor_id || "",
        taskTypes: tasksData ? [...new Set(tasksData.map(t => t.task_type_id).filter(Boolean))] : [],
      });

      // Fetch visit data to determine lead technician
      const { data: visitData } = await supabase
        .from("service_visits")
        .select(`
          id,
          visit_technicians (
            technician_id,
            is_lead
          )
        `)
        .eq("service_order_id", orderId)
        .eq("visit_type", "initial")
        .order("visit_number", { ascending: true })
        .limit(1)
        .single();

      // Set selected technicians from visit_technicians if available, otherwise from tasks
      if (visitData?.visit_technicians && visitData.visit_technicians.length > 0) {
        const techIds = visitData.visit_technicians.map((vt: any) => vt.technician_id);
        setSelectedTechnicians(techIds);
        
        // Find the lead technician
        const leadTech = visitData.visit_technicians.find((vt: any) => vt.is_lead);
        if (leadTech) {
          setLeadTechId(leadTech.technician_id);
        } else if (techIds.length > 0) {
          setLeadTechId(techIds[0]);
        }
      } else if (tasksData && tasksData.length > 0) {
        // Fallback to tasks if no visit data
        const techIds = [...new Set(tasksData.map(t => t.assigned_to).filter(Boolean))];
        setSelectedTechnicians(techIds);
        if (techIds.length > 0) {
          setLeadTechId(techIds[0]);
        }
      }
    } catch (error: any) {
      toast({
        title: "Erro ao carregar OS",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const generateOrderNumber = async (companyId: string): Promise<string> => {
    const year = new Date().getFullYear();
    const { count } = await supabase
      .from("service_orders")
      .select("*", { count: "exact", head: true })
      .eq("company_id", companyId);

    const orderNum = (count || 0) + 1;
    return `OS-${year}-${String(orderNum).padStart(4, "0")}`;
  };

  const onSubmit = async (data: OrderFormData) => {
    try {
      setIsLoading(true);

      const { data: profileData } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user?.id)
        .single();

      if (!profileData?.company_id) throw new Error("Company not found");

      // Get taskTypes from form
      const formTaskTypes = data.taskTypes || [];

      // Validações de negócio
      if (formTaskTypes.length === 0) {
        throw new Error("Selecione pelo menos um tipo de tarefa");
      }

      // Técnico agora é opcional - permite criar OS de serviço fechado sem técnico

      if (isEditing && orderId) {
        // UPDATE existing service order
        const { error: orderError } = await supabase
          .from("service_orders")
          .update({
            client_id: data.clientId,
            vessel_id: data.vesselId,
            supervisor_id: data.supervisorId || null,
            scheduled_date: data.serviceDateTime ? data.serviceDateTime.split('T')[0] : null,
            service_date_time: data.serviceDateTime || null,
            planned_location: data.plannedLocation?.trim() || null,
            access_point_id: data.accessPointId && data.accessPointId !== 'none' ? data.accessPointId : null,
            access_instructions: data.accessInstructions?.trim() || null,
            expected_context: data.expectedContext || null,
            boarding_method: data.boardingMethod || null,
            single_report: data.singleReport !== false,
            description: data.description?.trim() || null,
          })
          .eq("id", orderId);

        if (orderError) throw orderError;

        // Delete existing tasks
        const { error: deleteError } = await supabase
          .from("tasks")
          .delete()
          .eq("service_order_id", orderId);

        if (deleteError) throw deleteError;

        // Get the initial visit
        const { data: visitData } = await supabase
          .from("service_visits")
          .select("id")
          .eq("service_order_id", orderId)
          .eq("visit_type", "initial")
          .order("visit_number", { ascending: true })
          .limit(1)
          .single();

        if (visitData) {
          // Delete existing visit technicians
          await supabase
            .from("visit_technicians")
            .delete()
            .eq("visit_id", visitData.id);

          // Insert new visit technicians
          if (selectedTechnicians.length > 0) {
            const visitTechniciansToInsert = selectedTechnicians.map(techId => ({
              visit_id: visitData.id,
              technician_id: techId,
              is_lead: techId === leadTechId,
              assigned_by: user?.id,
            }));

            const { error: vtError } = await supabase
              .from("visit_technicians")
              .insert(visitTechniciansToInsert);

            if (vtError) throw vtError;
          }
        }

        // Create new tasks - one task per technician per task type
        if (formTaskTypes.length > 0 && selectedTechnicians.length > 0) {
          const tasksToInsert = selectedTechnicians.flatMap(techId => 
            formTaskTypes.map(taskTypeId => ({
              service_order_id: orderId,
              task_type_id: taskTypeId,
              title: taskTypes.find(t => t.id === taskTypeId)?.name || "Task",
              status: "pending" as const,
              assigned_to: techId,
              // Only set task_order_number if singleReport is false
              task_order_number: !data.singleReport && taskOrderNumbers[taskTypeId] 
                ? taskOrderNumbers[taskTypeId] 
                : null,
            }))
          );

          const { error: tasksError } = await supabase
            .from("tasks")
            .insert(tasksToInsert);

          if (tasksError) throw tasksError;
        }

        // Send WhatsApp notification if schedule changed
        const currentDate = data.serviceDateTime ? data.serviceDateTime.split('T')[0] : null;
        if (originalScheduledDate && currentDate && currentDate !== originalScheduledDate) {
          const formattedDate = new Date(data.serviceDateTime!).toLocaleDateString('pt-BR');
          
          for (const techId of selectedTechnicians) {
            const tech = technicians.find(t => t.id === techId);
            const phoneNumber = tech?.profiles?.phone;
            const techName = tech?.profiles?.full_name || "Técnico";

            if (phoneNumber) {
              sendScheduleChangeNotification(
                phoneNumber,
                techName,
                originalOrderNumber || orderNumber || "",
                formattedDate
              ).catch(err => console.error("WhatsApp schedule notification failed:", err));
            }
          }
        }

        toast({
          title: "OS atualizada",
          description: "Ordem de serviço atualizada com sucesso!",
        });
      } else {
        // CREATE new service order
        // Validate orderNumber is provided
        if (!orderNumber || orderNumber.trim() === "") {
          throw new Error("Número da OS é obrigatório");
        }

        const { data: serviceOrder, error: orderError } = await supabase
          .from("service_orders")
          .insert({
            order_number: orderNumber.trim(),
            company_id: profileData.company_id,
            created_by: user?.id,
            client_id: data.clientId,
            vessel_id: data.vesselId,
            supervisor_id: data.supervisorId || null,
            scheduled_date: data.serviceDateTime ? data.serviceDateTime.split('T')[0] : null,
            service_date_time: data.serviceDateTime || null,
            planned_location: data.plannedLocation?.trim() || null,
            access_point_id: data.accessPointId && data.accessPointId !== 'none' ? data.accessPointId : null,
            access_instructions: data.accessInstructions?.trim() || null,
            expected_context: data.expectedContext || null,
            boarding_method: data.boardingMethod || null,
            single_report: data.singleReport !== false,
            description: data.description?.trim() || null,
            status: "pending",
          })
          .select()
          .single();

        if (orderError) throw orderError;

        // Get the automatically created initial visit
        const { data: visitData, error: visitError } = await supabase
          .from("service_visits")
          .select("id")
          .eq("service_order_id", serviceOrder.id)
          .eq("visit_type", "initial")
          .single();

        if (visitError) {
          console.error("Error fetching visit for technicians:", visitError);
          throw new Error("Erro ao buscar visita para atribuir técnicos");
        }

        if (visitData && selectedTechnicians.length > 0) {
          // Insert visit technicians
          const visitTechniciansToInsert = selectedTechnicians.map(techId => ({
            visit_id: visitData.id,
            technician_id: techId,
            is_lead: techId === leadTechId,
            assigned_by: user?.id,
          }));

          const { error: vtError } = await supabase
            .from("visit_technicians")
            .insert(visitTechniciansToInsert);

          if (vtError) throw vtError;
        }

        // Create tasks - one task per technician per task type
        if (formTaskTypes.length > 0 && serviceOrder && selectedTechnicians.length > 0) {
          const tasksToInsert = selectedTechnicians.flatMap(techId => 
            formTaskTypes.map(taskTypeId => ({
              service_order_id: serviceOrder.id,
              task_type_id: taskTypeId,
              title: taskTypes.find(t => t.id === taskTypeId)?.name || "Task",
              status: "pending" as const,
              assigned_to: techId,
              // Only set task_order_number if singleReport is false
              task_order_number: !data.singleReport && taskOrderNumbers[taskTypeId] 
                ? taskOrderNumbers[taskTypeId] 
                : null,
            }))
          );

          const { error: tasksError } = await supabase
            .from("tasks")
            .insert(tasksToInsert);

          if (tasksError) throw tasksError;

          // Send WhatsApp notifications to assigned technicians
          const taskTitles = formTaskTypes
            .map(taskTypeId => taskTypes.find(t => t.id === taskTypeId)?.name)
            .filter(Boolean)
            .join(", ");

          for (const techId of selectedTechnicians) {
            const tech = technicians.find(t => t.id === techId);
            const phoneNumber = tech?.profiles?.phone;
            const techName = tech?.profiles?.full_name || "Técnico";

            if (phoneNumber) {
              // Send WhatsApp notification (fire and forget - don't block the main flow)
              sendTaskAssignmentNotification(
                phoneNumber,
                techName,
                taskTitles,
                orderNumber!
              ).catch(err => console.error("WhatsApp notification failed:", err));
            }
          }
        }

        toast({
          title: "OS criada",
          description: `OS ${orderNumber} criada com sucesso!`,
        });
      }

      form.reset({
        clientId: "",
        vesselId: "",
        requesterId: "",
        serviceDateTime: "",
        plannedLocation: "",
        accessPointId: "",
        accessInstructions: "",
        expectedContext: "docked",
        boardingMethod: "gangway",
        taskTypes: [],
        singleReport: true,
        description: "",
        supervisorId: "",
      });
      setSelectedTechnicians([]);
      setLeadTechId("");
      setTaskOrderNumbers({});
      onSuccess?.();
    } catch (error: any) {
      toast({
        title: isEditing ? "Erro ao atualizar OS" : "Erro ao criar OS",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <FormField
            control={form.control}
            name="clientId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Cliente</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o cliente" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {clients.map((client) => (
                      <SelectItem key={client.id} value={client.id}>
                        {client.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="vesselId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Embarcação</FormLabel>
                <Select 
                  onValueChange={field.onChange} 
                  value={field.value}
                  disabled={!selectedClient}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione a embarcação" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {vessels.map((vessel) => (
                      <SelectItem key={vessel.id} value={vessel.id}>
                        {vessel.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="requesterId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Solicitante (Opcional)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o solicitante" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {requesters.map((requester) => (
                      <SelectItem key={requester.id} value={requester.id}>
                        {requester.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />

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
            name="supervisorId"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Supervisor (Opcional)</FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Selecione o supervisor" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {supervisors.map((supervisor) => (
                      <SelectItem key={supervisor.id} value={supervisor.id}>
                        {supervisor.full_name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="description"
          render={({ field }) => (
            <FormItem>
              <FormLabel>Descrição (Opcional)</FormLabel>
              <FormControl>
                <Textarea
                  placeholder="Descreva os detalhes da ordem de serviço..."
                  {...field}
                  rows={3}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <LocationAccessSection form={form} />

        <ServiceDetails 
          form={form} 
          taskTypes={taskTypes} 
          taskOrderNumbers={taskOrderNumbers}
          onTaskOrderNumberChange={handleTaskOrderNumberChange}
        />

        <TechniciansSelection
          technicians={technicians}
          selectedTechnicians={selectedTechnicians}
          onTechnicianToggle={(techId) => {
            setSelectedTechnicians([...selectedTechnicians, techId]);
          }}
          leadTechId={leadTechId}
          onLeadTechChange={setLeadTechId}
          onRemoveTechnician={(techId) => {
            setSelectedTechnicians(selectedTechnicians.filter(id => id !== techId));
          }}
          scheduledDate={(() => {
            const serviceDateTime = form.watch("serviceDateTime");
            if (serviceDateTime) return new Date(serviceDateTime);
            return undefined;
          })()}
        />

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Criando..." : isEditing ? "Atualizar" : "Criar"} Ordem de Serviço
        </Button>
      </form>
    </Form>
  );
};
