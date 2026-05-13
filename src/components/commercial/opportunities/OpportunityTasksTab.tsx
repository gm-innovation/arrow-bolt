import { useState, useMemo } from "react";
import { useCommercialTasks } from "@/hooks/useCommercialTasks";
import { useCompanyUsers } from "@/hooks/useCompanyUsers";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2 } from "lucide-react";
import { format, isBefore, parseISO } from "date-fns";
import { cn } from "@/lib/utils";

const PRIORITY_LABELS: Record<string, string> = { low: "Baixa", medium: "Média", high: "Alta", urgent: "Urgente" };
const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-gray-100 text-gray-800",
  medium: "bg-blue-100 text-blue-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800",
};

interface Props {
  opportunityId: string;
  clientId: string | null;
}

export const OpportunityTasksTab = ({ opportunityId, clientId }: Props) => {
  const { tasks, isLoading, createTask, updateTask, deleteTask } = useCommercialTasks();
  const { data: users = [] } = useCompanyUsers(["commercial", "admin", "director", "manager"]);

  const oppTasks = useMemo(
    () => tasks.filter((t) => t.opportunity_id === opportunityId),
    [tasks, opportunityId]
  );

  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ title: "", priority: "medium", assigned_to: "", due_date: "" });

  const handleCreate = () => {
    if (!form.title.trim()) return;
    createTask.mutate(
      {
        title: form.title,
        priority: form.priority,
        assigned_to: form.assigned_to || null,
        due_date: form.due_date || null,
        opportunity_id: opportunityId,
        client_id: clientId,
        status: "pending",
      },
      {
        onSuccess: () => {
          setForm({ title: "", priority: "medium", assigned_to: "", due_date: "" });
          setOpen(false);
        },
      }
    );
  };

  return (
    <div className="space-y-4">
      {!open ? (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nova tarefa
        </Button>
      ) : (
        <div className="space-y-3 rounded-md border p-3 bg-muted/30">
          <div className="space-y-1.5">
            <Label className="text-xs">Título *</Label>
            <Input value={form.title} onChange={(e) => setForm((f: any) => ({ ...f, title: e.target.value }))} placeholder="Ex: Enviar proposta revisada" />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Responsável</Label>
              <Select value={form.assigned_to || "none"} onValueChange={(v) => setForm((f: any) => ({ ...f, assigned_to: v === "none" ? "" : v }))}>
                <SelectTrigger><SelectValue placeholder="—" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {users.map((u) => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Prioridade</Label>
              <Select value={form.priority} onValueChange={(v) => setForm((f: any) => ({ ...f, priority: v }))}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {Object.entries(PRIORITY_LABELS).map(([k, l]) => <SelectItem key={k} value={k}>{l}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Vencimento</Label>
              <Input type="date" value={form.due_date} onChange={(e) => setForm((f: any) => ({ ...f, due_date: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleCreate} disabled={!form.title.trim() || createTask.isPending}>
              {createTask.isPending ? "Salvando..." : "Criar tarefa"}
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="h-32 bg-muted animate-pulse rounded" />
      ) : oppTasks.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Nenhuma tarefa vinculada</p>
      ) : (
        <div className="space-y-2">
          {oppTasks.map((t) => {
            const overdue = t.due_date && t.status !== "completed" && isBefore(parseISO(t.due_date), new Date());
            return (
              <div key={t.id} className="flex items-start gap-3 p-3 rounded-md border bg-card">
                <Checkbox
                  checked={t.status === "completed"}
                  onCheckedChange={(checked) =>
                    updateTask.mutate({ id: t.id, status: checked ? "completed" : "pending" })
                  }
                  className="mt-1"
                />
                <div className="flex-1 min-w-0">
                  <p className={cn("text-sm font-medium", t.status === "completed" && "line-through text-muted-foreground")}>{t.title}</p>
                  <div className="flex flex-wrap items-center gap-2 mt-1 text-xs text-muted-foreground">
                    <Badge variant="secondary" className={PRIORITY_COLORS[t.priority]}>{PRIORITY_LABELS[t.priority]}</Badge>
                    {t.profiles?.full_name && <span>👤 {t.profiles.full_name}</span>}
                    {t.due_date && (
                      <span className={cn(overdue && "text-destructive font-medium")}>
                        📅 {format(parseISO(t.due_date), "dd/MM/yyyy")}{overdue && " (atrasada)"}
                      </span>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => deleteTask.mutate(t.id)}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
