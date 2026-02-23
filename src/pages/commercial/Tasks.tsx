import { useState } from "react";
import { useCommercialTasks } from "@/hooks/useCommercialTasks";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Skeleton } from "@/components/ui/skeleton";
import { Plus, Search, Edit, Trash2, CalendarIcon, CheckSquare } from "lucide-react";
import { format, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const PRIORITY_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  low: { label: "Baixa", variant: "secondary" },
  medium: { label: "Média", variant: "outline" },
  high: { label: "Alta", variant: "default" },
  urgent: { label: "Urgente", variant: "destructive" },
};

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "Pendente", variant: "secondary" },
  in_progress: { label: "Em Andamento", variant: "default" },
  completed: { label: "Concluída", variant: "outline" },
  cancelled: { label: "Cancelada", variant: "destructive" },
};

const CommercialTasks = () => {
  const { profile } = useAuth();
  const { tasks, isLoading, createTask, updateTask, deleteTask } = useCommercialTasks();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [dueDate, setDueDate] = useState<Date | undefined>();

  const { data: clients = [] } = useQuery({
    queryKey: ["commercial-task-clients", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      const { data } = await supabase.from("clients").select("id, name").eq("company_id", profile.company_id).order("name");
      return data || [];
    },
    enabled: !!profile?.company_id,
  });

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const openNew = () => {
    setEditing(null);
    setForm({ priority: "medium", status: "pending" });
    setDueDate(undefined);
    setDialogOpen(true);
  };

  const openEdit = (t: any) => {
    setEditing(t);
    setForm(t);
    setDueDate(t.due_date ? new Date(t.due_date + "T12:00:00") : undefined);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.title) return;
    const payload = {
      title: form.title,
      description: form.description || null,
      client_id: form.client_id || null,
      priority: form.priority || "medium",
      status: form.status || "pending",
      due_date: dueDate ? format(dueDate, "yyyy-MM-dd") : null,
    };
    if (editing) {
      updateTask.mutate({ id: editing.id, ...payload });
    } else {
      createTask.mutate(payload);
    }
    setDialogOpen(false);
  };

  const filtered = tasks.filter((t: any) =>
    t.title?.toLowerCase().includes(search.toLowerCase()) ||
    t.clients?.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Tarefas Comerciais</h2>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Nova Tarefa</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por título ou cliente..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <CheckSquare className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma tarefa encontrada</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Prioridade</TableHead>
                  <TableHead className="hidden md:table-cell">Vencimento</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((t: any) => {
                  const overdue = t.due_date && t.status !== "completed" && t.status !== "cancelled" && new Date(t.due_date) < new Date();
                  return (
                    <TableRow key={t.id}>
                      <TableCell className="font-medium">{t.title}</TableCell>
                      <TableCell>{t.clients?.name || "-"}</TableCell>
                      <TableCell>
                        <Badge variant={PRIORITY_MAP[t.priority]?.variant || "secondary"}>
                          {PRIORITY_MAP[t.priority]?.label || t.priority}
                        </Badge>
                      </TableCell>
                      <TableCell className="hidden md:table-cell">
                        {t.due_date ? (
                          <span className={cn(overdue && "text-destructive font-medium")}>
                            {format(new Date(t.due_date + "T12:00:00"), "dd/MM/yyyy")}
                            {overdue && ` (${Math.abs(differenceInDays(new Date(), new Date(t.due_date)))}d atraso)`}
                          </span>
                        ) : "-"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_MAP[t.status]?.variant || "secondary"}>
                          {STATUS_MAP[t.status]?.label || t.status}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Edit className="h-4 w-4" /></Button>
                        <Button variant="ghost" size="icon" onClick={() => deleteTask.mutate(t.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Tarefa" : "Nova Tarefa"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Título *</Label>
              <Input value={form.title || ""} onChange={e => set("title", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Cliente</Label>
              <Select value={form.client_id || ""} onValueChange={v => set("client_id", v)}>
                <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent>
                  {clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Prioridade</Label>
                <Select value={form.priority || "medium"} onValueChange={v => set("priority", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(PRIORITY_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status || "pending"} onValueChange={v => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label>Data de Vencimento</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left", !dueDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {dueDate ? format(dueDate, "dd/MM/yyyy") : "Selecionar data"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0" align="start">
                  <Calendar mode="single" selected={dueDate} onSelect={setDueDate} locale={ptBR} className="p-3 pointer-events-auto" />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label>Descrição</Label>
              <Textarea value={form.description || ""} onChange={e => set("description", e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.title}>{editing ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default CommercialTasks;
