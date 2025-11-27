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

interface TransferTechniciansDialogProps {
  orderId: string;
  onClose: () => void;
}

export const TransferTechniciansDialog = ({ orderId, onClose }: TransferTechniciansDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [tasks, setTasks] = useState<any[]>([]);
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [selectedTasks, setSelectedTasks] = useState<string[]>([]);
  const [newTechnicianId, setNewTechnicianId] = useState<string>("");
  const [reason, setReason] = useState<string>("");

  useEffect(() => {
    fetchData();
  }, [orderId]);

  const fetchData = async () => {
    try {
      setLoading(true);

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
            full_name
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

      // Update visit_technicians table
      if (visitData?.id) {
        // Get all current non-lead technicians in the visit
        const { data: currentAuxTechnicians, error: fetchVTError } = await supabase
          .from("visit_technicians")
          .select("id, technician_id")
          .eq("visit_id", visitData.id)
          .eq("is_lead", false);

        if (fetchVTError) {
          console.error("Error fetching visit_technicians:", fetchVTError);
        }

        console.log("Current auxiliary technicians in visit:", currentAuxTechnicians);

        // For each selected task, update visit_technicians using the OLD technician ID (from map)
        for (const taskId of selectedTasks) {
          const oldTechId = oldTechnicianMap.get(taskId);
          
          if (!oldTechId) continue;

          // Find the visit_technicians record for this old technician
          const vtRecord = currentAuxTechnicians?.find(vt => vt.technician_id === oldTechId);
          
          if (vtRecord) {
            console.log(`Updating visit_technician ${vtRecord.id} from ${oldTechId} to ${newTechnicianId}`);
            
            // Update the existing record with the new technician
            const { error: vtUpdateError } = await supabase
              .from("visit_technicians")
              .update({ 
                technician_id: newTechnicianId,
                assigned_by: user?.id 
              })
              .eq("id", vtRecord.id);

            if (vtUpdateError) {
              console.error("Error updating visit_technicians:", vtUpdateError);
              throw vtUpdateError;
            }
          } else {
            console.warn(`No visit_technician record found for old technician ${oldTechId}`);
          }
        }

        // Check if new technician already exists in the visit (after updates)
        const { data: newTechExists } = await supabase
          .from("visit_technicians")
          .select("id")
          .eq("visit_id", visitData.id)
          .eq("technician_id", newTechnicianId)
          .maybeSingle();

        // If not, add them as non-lead
        if (!newTechExists) {
          const { error: vtInsertError } = await supabase
            .from("visit_technicians")
            .insert({
              visit_id: visitData.id,
              technician_id: newTechnicianId,
              is_lead: false,
              assigned_by: user?.id,
            });

          if (vtInsertError) {
            console.error("Error inserting visit_technician:", vtInsertError);
            throw vtInsertError;
          }
        }
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