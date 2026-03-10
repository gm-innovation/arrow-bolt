import { useState, useEffect, useMemo } from "react";
import { DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowRight, Loader2, Star, User, Wrench } from "lucide-react";
import { useWhatsAppNotification } from "@/hooks/useWhatsAppNotification";
import { useNotificationService } from "@/hooks/useNotificationService";

interface TransferTechniciansDialogProps {
  orderId: string;
  onClose: () => void;
}

interface TeamMember {
  technicianId: string;
  name: string;
  isLead: boolean;
  tasks: { id: string; title: string; taskType: string }[];
  phone?: string;
  profileId?: string;
}

export const TransferTechniciansDialog = ({ orderId, onClose }: TransferTechniciansDialogProps) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const { sendTaskAssignmentNotification } = useWhatsAppNotification();
  const { sendNotification } = useNotificationService();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [allTechnicians, setAllTechnicians] = useState<any[]>([]);
  const [techToReplace, setTechToReplace] = useState<string>("");
  const [newTechnicianId, setNewTechnicianId] = useState<string>("");
  const [reason, setReason] = useState<string>("");
  const [orderNumber, setOrderNumber] = useState<string>("");

  useEffect(() => {
    fetchData();
  }, [orderId]);

  const fetchData = async () => {
    try {
      setLoading(true);

      const { data: orderData } = await supabase
        .from("service_orders")
        .select("order_number")
        .eq("id", orderId)
        .single();

      if (orderData) setOrderNumber(orderData.order_number);

      // Fetch tasks with technician info
      const { data: tasksData, error: tasksError } = await supabase
        .from("tasks")
        .select(`
          id, title,
          task_types:task_type_id (name),
          assigned_to,
          technicians:assigned_to (
            id,
            profiles:user_id (id, full_name, phone)
          )
        `)
        .eq("service_order_id", orderId);

      if (tasksError) throw tasksError;

      // Fetch visit_technicians to get is_lead info
      const { data: visitData } = await supabase
        .from("service_visits")
        .select("id")
        .eq("service_order_id", orderId)
        .eq("visit_type", "initial")
        .maybeSingle();

      let leadTechIds = new Set<string>();
      if (visitData?.id) {
        const { data: vtData } = await supabase
          .from("visit_technicians")
          .select("technician_id, is_lead")
          .eq("visit_id", visitData.id);

        vtData?.forEach(vt => {
          if (vt.is_lead) leadTechIds.add(vt.technician_id);
        });
      }

      // Group tasks by technician
      const techMap = new Map<string, TeamMember>();
      tasksData?.forEach(task => {
        const tech = task.technicians as any;
        if (!tech?.id) return;
        if (!techMap.has(tech.id)) {
          techMap.set(tech.id, {
            technicianId: tech.id,
            name: tech.profiles?.full_name || "Sem nome",
            isLead: leadTechIds.has(tech.id),
            tasks: [],
            phone: tech.profiles?.phone,
            profileId: tech.profiles?.id,
          });
        }
        techMap.get(tech.id)!.tasks.push({
          id: task.id,
          title: task.title,
          taskType: (task.task_types as any)?.name || "",
        });
      });

      setTeamMembers(Array.from(techMap.values()).sort((a, b) => (b.isLead ? 1 : 0) - (a.isLead ? 1 : 0)));

      // Fetch all available technicians
      const { data: profileData } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user?.id)
        .single();

      if (profileData?.company_id) {
        const { data: techniciansData } = await supabase
          .from("technicians")
          .select(`id, profiles:user_id (id, full_name, phone)`)
          .eq("company_id", profileData.company_id)
          .eq("active", true);

        setAllTechnicians(techniciansData || []);
      }
    } catch (error: any) {
      toast({ title: "Erro ao carregar dados", description: error.message, variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  const selectedMember = useMemo(
    () => teamMembers.find(m => m.technicianId === techToReplace),
    [teamMembers, techToReplace]
  );

  const availableNewTechnicians = useMemo(
    () => allTechnicians.filter(t => t.id !== techToReplace),
    [allTechnicians, techToReplace]
  );

  const handleTransfer = async () => {
    if (!techToReplace || !newTechnicianId) {
      toast({ title: "Erro", description: "Selecione o técnico a substituir e o novo técnico.", variant: "destructive" });
      return;
    }

    const member = selectedMember;
    if (!member || member.tasks.length === 0) {
      toast({ title: "Erro", description: "Nenhuma tarefa encontrada para este técnico.", variant: "destructive" });
      return;
    }

    try {
      setSubmitting(true);
      const taskIds = member.tasks.map(t => t.id);

      // Update tasks
      const { error: updateError } = await supabase
        .from("tasks")
        .update({ assigned_to: newTechnicianId })
        .in("id", taskIds);

      if (updateError) throw updateError;

      // Sync visit_technicians
      const { data: visitData } = await supabase
        .from("service_visits")
        .select("id")
        .eq("service_order_id", orderId)
        .eq("visit_type", "initial")
        .maybeSingle();

      if (visitData?.id) {
        const { data: allOrderTasks } = await supabase
          .from("tasks")
          .select("assigned_to")
          .eq("service_order_id", orderId);

        const techIdsInTasks = new Set(allOrderTasks?.map(t => t.assigned_to).filter(Boolean) || []);

        const { data: currentVTs } = await supabase
          .from("visit_technicians")
          .select("id, technician_id, is_lead")
          .eq("visit_id", visitData.id);

        // Remove technicians no longer in tasks (non-lead only, unless being replaced)
        for (const vt of currentVTs || []) {
          if (!techIdsInTasks.has(vt.technician_id)) {
            await supabase.from("visit_technicians").delete().eq("id", vt.id);
          }
        }

        // Add new technician if not already present
        const currentTechIds = new Set(currentVTs?.map(vt => vt.technician_id) || []);
        if (!currentTechIds.has(newTechnicianId)) {
          // If replaced tech was lead, new tech becomes lead
          await supabase.from("visit_technicians").insert({
            visit_id: visitData.id,
            technician_id: newTechnicianId,
            is_lead: member.isLead,
            assigned_by: user?.id,
          });
        } else if (member.isLead) {
          // If replaced was lead and new tech already exists, update is_lead
          await supabase
            .from("visit_technicians")
            .update({ is_lead: true })
            .eq("visit_id", visitData.id)
            .eq("technician_id", newTechnicianId);
        }
      }

      // Service history
      const newTech = allTechnicians.find(t => t.id === newTechnicianId);
      const newTechName = newTech?.profiles?.full_name || "Desconhecido";

      const historyRecords = member.tasks.map(task => ({
        service_order_id: orderId,
        action: "technician_transfer",
        change_type: "update",
        description: `Tarefa "${task.title}" transferida de ${member.name} para ${newTechName}. ${reason ? `Motivo: ${reason}` : ""}`,
        old_values: { technician_id: techToReplace, technician_name: member.name },
        new_values: { technician_id: newTechnicianId, technician_name: newTechName, reason: reason || null },
        performed_by: user?.id,
      }));

      await supabase.from("service_history").insert(historyRecords);

      // Notifications
      if (newTech?.profiles?.id) {
        await supabase.from("notifications").insert({
          user_id: newTech.profiles.id,
          notification_type: "task_assignment",
          title: "Nova(s) Tarefa(s) Atribuída(s)",
          message: `Você recebeu ${taskIds.length} nova(s) tarefa(s) por transferência na OS ${orderNumber}.`,
          reference_id: orderId,
        });

        sendNotification({
          userId: newTech.profiles.id,
          title: "Nova(s) Tarefa(s) Atribuída(s)",
          message: `Você recebeu ${taskIds.length} nova(s) tarefa(s) por transferência na OS ${orderNumber}.`,
          type: "task_assignment",
          referenceId: orderId,
          sendPush: true,
        }).catch(console.error);

        if (newTech.profiles.phone && orderNumber) {
          sendTaskAssignmentNotification(
            newTech.profiles.phone,
            newTech.profiles.full_name || "Técnico",
            member.tasks.map(t => t.title).join(", "),
            orderNumber
          ).catch(console.error);
        }
      }

      toast({ title: "Transferência concluída", description: `${taskIds.length} tarefa(s) transferida(s) com sucesso!` });
      onClose();
    } catch (error: any) {
      toast({ title: "Erro na transferência", description: error.message, variant: "destructive" });
    } finally {
      setSubmitting(false);
    }
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
          Visualize a equipe atual e selecione o técnico a ser substituído
        </DialogDescription>
      </DialogHeader>

      <div className="flex-1 overflow-y-auto space-y-6 pr-2">
        {/* Section 1: Current Team */}
        <div className="space-y-3">
          <Label className="text-base font-semibold">Equipe Atual</Label>
          {teamMembers.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum técnico atribuído a esta OS.</p>
          ) : (
            <div className="space-y-3">
              {teamMembers.map((member) => (
                <div
                  key={member.technicianId}
                  className="border rounded-lg p-4 space-y-2 bg-muted/30"
                >
                  <div className="flex items-center gap-2">
                    {member.isLead ? (
                      <Star className="h-4 w-4 text-amber-500 fill-amber-500" />
                    ) : (
                      <User className="h-4 w-4 text-muted-foreground" />
                    )}
                    <span className="font-medium">{member.name}</span>
                    <Badge variant={member.isLead ? "default" : "secondary"} size="sm">
                      {member.isLead ? "Responsável" : "Auxiliar"}
                    </Badge>
                  </div>
                  <div className="pl-6 space-y-1">
                    {member.tasks.map((task) => (
                      <div key={task.id} className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Wrench className="h-3 w-3" />
                        <span>{task.title}</span>
                        {task.taskType && (
                          <Badge variant="outline" size="sm">{task.taskType}</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Section 2: Transfer */}
        <div className="space-y-4 border-t pt-4">
          <Label className="text-base font-semibold">Transferência</Label>

          <div className="grid grid-cols-1 sm:grid-cols-[1fr,auto,1fr] gap-3 items-end">
            <div className="space-y-2">
              <Label>Técnico a substituir</Label>
              <Select value={techToReplace} onValueChange={(v) => { setTechToReplace(v); setNewTechnicianId(""); }}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione" />
                </SelectTrigger>
                <SelectContent>
                  {teamMembers.map((m) => (
                    <SelectItem key={m.technicianId} value={m.technicianId}>
                      {m.name} {m.isLead ? "(Responsável)" : "(Auxiliar)"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <ArrowRight className="h-5 w-5 text-muted-foreground hidden sm:block mb-2" />

            <div className="space-y-2">
              <Label>Substituir por</Label>
              <Select value={newTechnicianId} onValueChange={setNewTechnicianId} disabled={!techToReplace}>
                <SelectTrigger>
                  <SelectValue placeholder={techToReplace ? "Selecione" : "Selecione o técnico primeiro"} />
                </SelectTrigger>
                <SelectContent>
                  {availableNewTechnicians.map((tech) => (
                    <SelectItem key={tech.id} value={tech.id}>
                      {tech.profiles?.full_name || "Nome não disponível"}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Affected tasks preview */}
          {selectedMember && (
            <div className="rounded-md border border-dashed p-3 bg-muted/20 space-y-1">
              <p className="text-sm font-medium">
                {selectedMember.tasks.length} tarefa(s) será(ão) transferida(s):
              </p>
              {selectedMember.tasks.map((task) => (
                <p key={task.id} className="text-sm text-muted-foreground pl-2">
                  • {task.title}
                </p>
              ))}
              {selectedMember.isLead && (
                <p className="text-xs text-amber-600 mt-2 font-medium">
                  ⚠ O novo técnico assumirá a função de Responsável (líder).
                </p>
              )}
            </div>
          )}

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
      </div>

      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button variant="outline" onClick={onClose} disabled={submitting}>
          Cancelar
        </Button>
        <Button onClick={handleTransfer} disabled={submitting || !techToReplace || !newTechnicianId}>
          {submitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Transferir
        </Button>
      </div>
    </DialogContent>
  );
};
