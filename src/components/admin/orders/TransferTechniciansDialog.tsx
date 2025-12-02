import { useState, useEffect } from "react";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Loader2 } from "lucide-react";
import { useWhatsAppNotification } from "@/hooks/useWhatsAppNotification";

interface TransferTechniciansDialogProps {
  orderId: string;
  onClose: () => void;
}

export const TransferTechniciansDialog = ({ orderId, onClose }: TransferTechniciansDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { sendTaskAssignmentNotification } = useWhatsAppNotification();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [newTechnicianId, setNewTechnicianId] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [orderNumber, setOrderNumber] = useState<string>("");

  useEffect(() => {
    fetchData();
  }, [orderId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      // Fetch order number
      const { data: orderData } = await supabase
        .from("service_orders")
        .select("order_number")
        .eq("id", orderId)
        .single();

      if (orderData) {
        setOrderNumber(orderData.order_number);
      }

      // Fetch tasks for this service order
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select(`
          *,
          task_types:task_type_id (name),
          technicians:assigned_to (
            id,
            profiles:user_id (full_name)
          )
        `)
        .eq("service_order_id", orderId);

      if (tasksError) throw tasksError;
      setTasks(tasksData || []);

      // Fetch available technicians
      const { data: profileData } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user?.id)
        .single();

      if (!profileData?.company_id) return;

      const { data: techniciansData, error: techError } = await supabase
        .from("technicians")
        .select(`
          id,
          profiles:user_id (
            id,
            full_name,
            phone
          )
        `)
        .eq("company_id", profileData.company_id)
        .eq("active", true);

      if (techError) throw techError;
      setTechnicians(techniciansData || []);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar dados",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleTransfer = async () => {
    if (selectedTasks.length === 0) {
      toast({
        title: "Erro",
        description: "Selecione ao menos uma tarefa para transferir.",
        variant: "destructive",
      });
      return;
    }

    if (!newTechnicianId) {
      toast({
        title: "Erro",
        description: "Selecione o técnico destino.",
        variant: "destructive",
      });
      return;
    }

    try {
      setSubmitting(true);

      // CRITICAL: Capture old technician IDs BEFORE updating tasks
      const oldTechnicianMap = new Map<string, string>();
      for (const taskId of selectedTasks) {
        const task = tasks.find(t => t.id === taskId);
        if (task?.assigned_to) {
          oldTechnicianMap.set(taskId, task.assigned_to);
        }
      }

      console.log("Old technician map before update:", Array.from(oldTechnicianMap.entries()));

      // Update tasks with new technician
      const { error: updateError } = await supabase
        .from("tasks")
        .update({ assigned_to: newTechnicianId })
        .in("id", selectedTasks);

      if (updateError) throw updateError;

      // Fetch the initial visit for this service order
      const { data: visitData } = await supabase
        .from("service_visits")
        .select("id")
        .eq("service_order_id", orderId)
        .eq("visit_type", "initial")
        .maybeSingle();

      // Update visit_technicians table - sync with current task assignments
      if (visitData?.id) {
        console.log("Syncing visit_technicians with task assignments...");
        
        // Get all tasks for this service order (after update)
        const { data: allOrderTasks, error: tasksError } = await supabase
          .from("tasks")
          .select("id, assigned_to")
          .eq("service_order_id", orderId);

        if (tasksError) {
          console.error("Error fetching tasks:", tasksError);
          throw tasksError;
        }

        // Get unique technician IDs from all tasks
        const technicianIdsInTasks = new Set(
          allOrderTasks
            ?.map(t => t.assigned_to)
            .filter(Boolean) || []
        );

        console.log("Technicians in tasks:", Array.from(technicianIdsInTasks));

        // Get current visit_technicians (non-lead only)
        const { data: currentAuxTechnicians, error: fetchVTError } = await supabase
          .from("visit_technicians")
          .select("id, technician_id")
          .eq("visit_id", visitData.id)
          .eq("is_lead", false);

        if (fetchVTError) {
          console.error("Error fetching visit_technicians:", fetchVTError);
          throw fetchVTError;
        }

        console.log("Current auxiliary technicians in visit:", currentAuxTechnicians);

        // Remove technicians that are no longer in any task
        const techniciansToRemove = currentAuxTechnicians?.filter(
          vt => !technicianIdsInTasks.has(vt.technician_id)
        ) || [];

        for (const vt of techniciansToRemove) {
          console.log(`Removing technician ${vt.technician_id} from visit`);
          const { error: deleteError } = await supabase
            .from("visit_technicians")
            .delete()
            .eq("id", vt.id);

          if (deleteError) {
            console.error("Error removing visit_technician:", deleteError);
            throw deleteError;
          }
        }

        // Add technicians that are in tasks but not in visit_technicians
        const currentTechIds = new Set(currentAuxTechnicians?.map(vt => vt.technician_id) || []);
        const techniciansToAdd = Array.from(technicianIdsInTasks).filter(
          techId => !currentTechIds.has(techId)
        );

        for (const techId of techniciansToAdd) {
          console.log(`Adding technician ${techId} to visit`);
          const { error: insertError } = await supabase
            .from("visit_technicians")
            .insert({
              visit_id: visitData.id,
              technician_id: techId,
              is_lead: false,
              assigned_by: user?.id,
            });

          if (insertError) {
            console.error("Error adding visit_technician:", insertError);
            throw insertError;
          }
        }

        console.log("Visit technicians synchronized successfully");
      }

      // Create service history records with detailed old/new values
      const historyRecords = selectedTasks.map(taskId => {
        const task = tasks.find(t => t.id === taskId);
        const oldTechId = oldTechnicianMap.get(taskId);
        const oldTech = oldTechId 
          ? technicians.find(t => t.id === oldTechId)?.profiles?.full_name || "Não atribuído"
          : "Não atribuído";
        const newTech = technicians.find(t => t.id === newTechnicianId)?.profiles?.full_name || "Desconhecido";
        
        return {
          service_order_id: orderId,
          action: "technician_transfer",
          change_type: "update",
          description: `Tarefa "${task?.title}" transferida de ${oldTech} para ${newTech}. ${reason ? `Motivo: ${reason}` : ""}`,
          old_values: { 
            technician_id: oldTechId, 
            technician_name: oldTech 
          },
          new_values: { 
            technician_id: newTechnicianId, 
            technician_name: newTech,
            reason: reason || null
          },
          performed_by: user?.id,
        };
      });

      const { error: historyError } = await supabase
        .from("service_history")
        .insert(historyRecords);

      if (historyError) throw historyError;

      // Send notifications to the new technician
      const newTechProfile = technicians.find(t => t.id === newTechnicianId);
      if (newTechProfile?.profiles?.id) {
        const { error: notifError } = await supabase
          .from("notifications")
          .insert({
            user_id: newTechProfile.profiles.id,
            notification_type: "task_assignment",
            title: "Nova(s) Tarefa(s) Atribuída(s)",
            message: `Você recebeu ${selectedTasks.length} nova(s) tarefa(s) por transferência.`,
            reference_id: orderId,
          });

        if (notifError) console.error("Error creating notification:", notifError);

        // Send WhatsApp notification
        const phoneNumber = newTechProfile.profiles?.phone;
        const techName = newTechProfile.profiles?.full_name || "Técnico";
        const taskTitles = selectedTasks
          .map(taskId => tasks.find(t => t.id === taskId)?.title)
          .filter(Boolean)
          .join(", ");

        if (phoneNumber && orderNumber) {
          sendTaskAssignmentNotification(
            phoneNumber,
            techName,
            taskTitles,
            orderNumber
          ).catch(err => console.error("WhatsApp notification failed:", err));
        }
      }

      toast({
        title: "Transferência concluída",
        description: `${selectedTasks.length} tarefa(s) transferida(s) com sucesso!`,
      });

      onClose();
    } catch (error: any) {
      toast({
        title: "Erro na transferência",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setSubmitting(false);
    }
  };

  const toggleTask = (taskId: string) => {
    setSelectedTasks(prev =>
      prev.includes(taskId)
        ? prev.filter(id => id !== taskId)
        : [...prev, taskId]
    );
  };

  if (loading) {
    return (
      <DialogContent className="max-w-2xl">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 animate-spin" />
        </div>
      </DialogContent>
    );
  }

  return (
    <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col">
      <DialogHeader>
        <DialogTitle>Transferir Técnicos</DialogTitle>
        <DialogDescription>
          Selecione as tarefas e o novo técnico responsável
        </DialogDescription>
      </DialogHeader>

      <div className="flex-1 overflow-y-auto space-y-6 pr-2">
        <div className="space-y-3">
          <Label>Tarefas da OS</Label>
          {tasks.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma tarefa encontrada para esta OS.</p>
          ) : (
            <div className="border rounded-md p-4 space-y-3 max-h-60 overflow-y-auto">
              {tasks.map((task) => (
                <div key={task.id} className="flex items-start space-x-3">
                  <Checkbox
                    id={task.id}
                    checked={selectedTasks.includes(task.id)}
                    onCheckedChange={() => toggleTask(task.id)}
                  />
                  <div className="flex-1">
                    <label
                      htmlFor={task.id}
                      className="text-sm font-medium leading-none cursor-pointer"
                    >
                      {task.title}
                    </label>
                    <p className="text-xs text-muted-foreground mt-1">
                      {task.task_types?.name} • Técnico atual: {task.technicians?.profiles?.full_name || "Não atribuído"}
                    </p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="space-y-2">
          <Label>Novo Técnico Responsável</Label>
          <Select value={newTechnicianId} onValueChange={setNewTechnicianId}>
            <SelectTrigger>
              <SelectValue placeholder="Selecione o técnico" />
            </SelectTrigger>
            <SelectContent>
              {technicians.map((tech) => (
                <SelectItem key={tech.id} value={tech.id}>
                  {tech.profiles?.full_name || "Nome não disponível"}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="reason">Motivo da Transferência (Opcional)</Label>
          <Textarea
            id="reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Descreva o motivo da transferência..."
            rows={3}
          />
        </div>
      </div>

      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button variant="outline" onClick={onClose} disabled={submitting}>
          Cancelar
        </Button>
        <Button onClick={handleTransfer} disabled={submitting}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Transferir
        </Button>
      </div>
    </DialogContent>
  );
};