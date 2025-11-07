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

const orderFormSchema = z.object({
  clientId: z.string().min(1, "Cliente é obrigatório"),
  vesselId: z.string().min(1, "Embarcação é obrigatória"),
  scheduledDate: z.string()
    .min(1, "Data agendada é obrigatória")
    .refine((date) => {
      const selectedDate = new Date(date);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return selectedDate >= today;
    }, "Data não pode ser no passado"),
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
  onSuccess?: () => void;
}

export const NewOrderForm = ({ isEditing, orderId, onSuccess }: NewOrderFormProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [clients, setClients] = useState<any[]>([]);
  const [vessels, setVessels] = useState<any[]>([]);
  const [supervisors, setSupervisors] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [selectedTechnicians, setSelectedTechnicians] = useState<string[]>([]);
  const [taskTypes, setTaskTypes] = useState<any[]>([]);
  const [selectedTaskTypes, setSelectedTaskTypes] = useState<string[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<OrderFormData>({
    resolver: zodResolver(orderFormSchema),
    defaultValues: {
      clientId: "",
      vesselId: "",
      scheduledDate: "",
      description: "",
      supervisorId: "",
    }
  });

  const selectedClient = form.watch("clientId");

  useEffect(() => {
    fetchInitialData();
  }, []);

  useEffect(() => {
    if (isEditing && orderId) {
      loadOrderData();
    }
  }, [isEditing, orderId]);

  useEffect(() => {
    if (selectedClient) {
      fetchVessels(selectedClient);
    } else {
      setVessels([]);
      form.setValue("vesselId", "");
    }
  }, [selectedClient]);

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

      // Fetch supervisors (users with admin role)
      const { data: supervisorsData } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("company_id", profileData.company_id)
        .order("full_name");

      setSupervisors(supervisorsData || []);

      // Fetch technicians
      const { data: techniciansData } = await supabase
        .from("technicians")
        .select(`
          id,
          profiles:user_id (
            full_name
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

      // Fetch associated tasks
      const { data: tasksData } = await supabase
        .from("tasks")
        .select("task_type_id, assigned_to")
        .eq("service_order_id", orderId);

      // Populate form
      form.reset({
        clientId: orderData.vessels?.client_id || "",
        vesselId: orderData.vessel_id || "",
        scheduledDate: orderData.scheduled_date || "",
        description: orderData.description || "",
        supervisorId: orderData.supervisor_id || "",
      });

      // Set selected task types and technicians
      if (tasksData) {
        const taskTypeIds = [...new Set(tasksData.map(t => t.task_type_id).filter(Boolean))];
        const techIds = [...new Set(tasksData.map(t => t.assigned_to).filter(Boolean))];
        setSelectedTaskTypes(taskTypeIds);
        setSelectedTechnicians(techIds);
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

      // Validações de negócio
      if (selectedTaskTypes.length === 0) {
        throw new Error("Selecione pelo menos um tipo de tarefa");
      }

      if (selectedTechnicians.length === 0) {
        throw new Error("Selecione pelo menos um técnico");
      }

      if (isEditing && orderId) {
        // UPDATE existing service order
        const { error: orderError } = await supabase
          .from("service_orders")
          .update({
            client_id: data.clientId,
            vessel_id: data.vesselId,
            supervisor_id: data.supervisorId || null,
            scheduled_date: data.scheduledDate,
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

        // Create new tasks
        if (selectedTaskTypes.length > 0) {
          const tasksToInsert = selectedTaskTypes.map(taskTypeId => ({
            service_order_id: orderId,
            task_type_id: taskTypeId,
            title: taskTypes.find(t => t.id === taskTypeId)?.name || "Task",
            status: "pending" as const,
            assigned_to: selectedTechnicians[0] || null,
          }));

          const { error: tasksError } = await supabase
            .from("tasks")
            .insert(tasksToInsert);

          if (tasksError) throw tasksError;
        }

        toast({
          title: "OS atualizada",
          description: "Ordem de serviço atualizada com sucesso!",
        });
      } else {
        // CREATE new service order
        const orderNumber = await generateOrderNumber(profileData.company_id);

        const { data: serviceOrder, error: orderError } = await supabase
          .from("service_orders")
          .insert({
            order_number: orderNumber,
            company_id: profileData.company_id,
            client_id: data.clientId,
            vessel_id: data.vesselId,
            supervisor_id: data.supervisorId || null,
            scheduled_date: data.scheduledDate,
            description: data.description?.trim() || null,
            status: "pending",
          })
          .select()
          .single();

        if (orderError) throw orderError;

        // Create tasks
        if (selectedTaskTypes.length > 0 && serviceOrder) {
          const tasksToInsert = selectedTaskTypes.map(taskTypeId => ({
            service_order_id: serviceOrder.id,
            task_type_id: taskTypeId,
            title: taskTypes.find(t => t.id === taskTypeId)?.name || "Task",
            status: "pending" as const,
            assigned_to: selectedTechnicians[0] || null,
          }));

          const { error: tasksError } = await supabase
            .from("tasks")
            .insert(tasksToInsert);

          if (tasksError) throw tasksError;
        }

        toast({
          title: "OS criada",
          description: `OS ${orderNumber} criada com sucesso!`,
        });
      }

      form.reset();
      setSelectedTechnicians([]);
      setSelectedTaskTypes([]);
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
            name="scheduledDate"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Data Agendada</FormLabel>
                <FormControl>
                  <Input type="date" {...field} />
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

        <div className="space-y-3">
          <FormLabel>Tipos de Tarefas</FormLabel>
          <div className="border rounded-md p-4 max-h-48 overflow-y-auto space-y-2">
            {taskTypes.map((taskType) => (
              <div key={taskType.id} className="flex items-center space-x-2">
                <Checkbox
                  id={taskType.id}
                  checked={selectedTaskTypes.includes(taskType.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedTaskTypes([...selectedTaskTypes, taskType.id]);
                    } else {
                      setSelectedTaskTypes(selectedTaskTypes.filter(id => id !== taskType.id));
                    }
                  }}
                />
                <label
                  htmlFor={taskType.id}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {taskType.name} <span className="text-muted-foreground">({taskType.category})</span>
                </label>
              </div>
            ))}
          </div>
        </div>

        <div className="space-y-3">
          <FormLabel>Técnicos</FormLabel>
          <div className="border rounded-md p-4 max-h-48 overflow-y-auto space-y-2">
            {technicians.map((tech) => (
              <div key={tech.id} className="flex items-center space-x-2">
                <Checkbox
                  id={tech.id}
                  checked={selectedTechnicians.includes(tech.id)}
                  onCheckedChange={(checked) => {
                    if (checked) {
                      setSelectedTechnicians([...selectedTechnicians, tech.id]);
                    } else {
                      setSelectedTechnicians(selectedTechnicians.filter(id => id !== tech.id));
                    }
                  }}
                />
                <label
                  htmlFor={tech.id}
                  className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70 cursor-pointer"
                >
                  {tech.profiles?.full_name}
                </label>
              </div>
            ))}
          </div>
        </div>

        <Button type="submit" className="w-full" disabled={isLoading}>
          {isLoading ? "Criando..." : isEditing ? "Atualizar" : "Criar"} Ordem de Serviço
        </Button>
      </form>
    </Form>
  );
};
