import { useState, useMemo } from "react";
import { useRecurrences } from "@/hooks/useRecurrences";
import { useProducts } from "@/hooks/useProducts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
import { Plus, Search, Edit, Trash2, CalendarIcon, RefreshCw, DollarSign, Clock, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format, isBefore, addDays, differenceInDays } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import { EditRecurrenceSheet } from "@/components/commercial/recurrences/EditRecurrenceSheet";

const RECURRENCE_TYPES = [
  { value: "maintenance", label: "Manutenção" },
  { value: "renewal", label: "Renovação" },
  { value: "recurring_service", label: "Serviço Recorrente" },
];

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  active: { label: "Ativa", variant: "default" },
  paused: { label: "Pausada", variant: "secondary" },
  completed: { label: "Concluída", variant: "outline" },
  cancelled: { label: "Cancelada", variant: "destructive" },
};

const Recurrences = () => {
  const { profile } = useAuth();
  const { recurrences, isLoading, createRecurrence, updateRecurrence, deleteRecurrence } = useRecurrences();
  const { products } = useProducts();
  const [search, setSearch] = useState("");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Record<string, any> | null>(null);
  const [editSheetOpen, setEditSheetOpen] = useState(false);
  const [editingSheet, setEditingSheet] = useState<Record<string, any> | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [nextDate, setNextDate] = useState<Date | undefined>();

  const { data: clients = [] } = useQuery({
    queryKey: ["commercial-clients-list", profile?.company_id],
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
    setForm({ periodicity: "monthly", status: "active" });
    setNextDate(undefined);
    setDialogOpen(true);
  };

  const openEdit = (r: Record<string, any>) => {
    setEditingSheet(r);
    setEditSheetOpen(true);
  };

  const handleSheetSave = (data: Record<string, any>) => {
    const { id, ...payload } = data;
    updateRecurrence.mutate({ id, ...payload });
    setEditSheetOpen(false);
  };

  const handleSave = () => {
    if (!form.client_id || !nextDate) return;
    const payload = {
      client_id: form.client_id,
      product_id: form.product_id || null,
      recurrence_type: form.recurrence_type || null,
      periodicity: form.periodicity_months ? `${form.periodicity_months}_months` : form.periodicity || "monthly",
      next_date: format(nextDate, "yyyy-MM-dd"),
      estimated_value: form.estimated_value ? Number(form.estimated_value) : null,
      advance_notice_days: form.advance_notice_days != null ? Number(form.advance_notice_days) : 30,
      notes: form.notes || null,
      status: form.status || "active",
    };
    if (editing) {
      updateRecurrence.mutate({ id: editing.id, ...payload });
    } else {
      createRecurrence.mutate(payload);
    }
    setDialogOpen(false);
  };

  const filtered = recurrences.filter((r: any) =>
    r.clients?.name?.toLowerCase().includes(search.toLowerCase()) ||
    r.crm_products?.name?.toLowerCase().includes(search.toLowerCase())
  );

  const kpis = useMemo(() => {
    const now = new Date();
    const active = recurrences.filter((r: any) => r.status === "active");
    const mrr = active.reduce((s: number, r: any) => s + (Number(r.estimated_value) || 0), 0);
    const next30 = active.filter((r: any) => r.next_date && !isBefore(new Date(r.next_date), now) && isBefore(new Date(r.next_date), addDays(now, 30))).length;
    const next60 = active.filter((r: any) => r.next_date && !isBefore(new Date(r.next_date), addDays(now, 30)) && isBefore(new Date(r.next_date), addDays(now, 60))).length;
    const overdue = active.filter((r: any) => r.next_date && isBefore(new Date(r.next_date), now)).length;
    return { mrr, next30, next60, overdue };
  }, [recurrences]);

  const formatCurrency = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Recorrências e Agendamentos</h2>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Nova Recorrência</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Receita Recorrente</p>
                <p className="text-2xl font-bold">{formatCurrency(kpis.mrr)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-chart-2" />
              <div>
                <p className="text-sm text-muted-foreground">Próximos 30 dias</p>
                <p className="text-2xl font-bold">{kpis.next30}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <RefreshCw className="h-5 w-5 text-chart-3" />
              <div>
                <p className="text-sm text-muted-foreground">30–60 dias</p>
                <p className="text-2xl font-bold">{kpis.next60}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              <div>
                <p className="text-sm text-muted-foreground">Atrasadas</p>
                <p className="text-2xl font-bold text-destructive">{kpis.overdue}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por cliente ou produto..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <RefreshCw className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma recorrência encontrada</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Cliente</TableHead>
                  <TableHead className="hidden md:table-cell">Produto/Serviço</TableHead>
                  <TableHead>Periodicidade</TableHead>
                  <TableHead>Próxima Data</TableHead>
                  <TableHead className="hidden md:table-cell">Valor Est.</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((r: any) => (
                  <TableRow key={r.id}>
                    <TableCell className="font-medium">{r.clients?.name}</TableCell>
                    <TableCell className="hidden md:table-cell">{r.crm_products?.name || "-"}</TableCell>
                    <TableCell>{r.periodicity}</TableCell>
                    <TableCell>
                      {(() => {
                        const now = new Date();
                        const isOverdue = r.next_date && r.status === "active" && isBefore(new Date(r.next_date), now);
                        return r.next_date ? (
                          <span className={cn(isOverdue && "text-destructive font-medium")}>
                            {format(new Date(r.next_date + "T12:00:00"), "dd/MM/yyyy")}
                            {isOverdue && ` (${Math.abs(differenceInDays(now, new Date(r.next_date)))}d)`}
                          </span>
                        ) : "-";
                      })()}
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {r.estimated_value ? `R$ ${Number(r.estimated_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "-"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={STATUS_MAP[r.status]?.variant || "secondary"}>
                        {STATUS_MAP[r.status]?.label || r.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(r)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteRecurrence.mutate(r.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{editing ? "Editar Recorrência" : "Criar Nova Recorrência"}</DialogTitle>
            <p className="text-sm text-muted-foreground">Configure uma nova recorrência para manutenções ou renovações.</p>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Cliente *</Label>
                <Select value={form.client_id || ""} onValueChange={v => set("client_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Produto/Serviço *</Label>
                <Select value={form.product_id || ""} onValueChange={v => set("product_id", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {products.filter((p: any) => p.active).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo de Recorrência</Label>
                <Select value={form.recurrence_type || ""} onValueChange={v => set("recurrence_type", v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {RECURRENCE_TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Periodicidade (meses)</Label>
                <Input type="number" min={1} value={form.periodicity_months || ""} onChange={e => set("periodicity_months", e.target.value)} placeholder="Ex: 6" />
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Aviso antecipado (dias)</Label>
                <Input type="number" min={0} value={form.advance_notice_days ?? 30} onChange={e => set("advance_notice_days", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select value={form.status || "active"} onValueChange={v => set("status", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {Object.entries(STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Próxima Data *</Label>
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className={cn("w-full justify-start text-left", !nextDate && "text-muted-foreground")}>
                      <CalendarIcon className="mr-2 h-4 w-4" />
                      {nextDate ? format(nextDate, "dd/MM/yyyy") : "Selecionar data"}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="start">
                    <Calendar mode="single" selected={nextDate} onSelect={setNextDate} locale={ptBR} className="p-3 pointer-events-auto" />
                  </PopoverContent>
                </Popover>
              </div>
              <div className="space-y-2">
                <Label>Valor Estimado (R$)</Label>
                <Input type="number" value={form.estimated_value || ""} onChange={e => set("estimated_value", e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Notas</Label>
              <Textarea value={form.notes || ""} onChange={e => set("notes", e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.client_id || !nextDate}>{editing ? "Salvar" : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <EditRecurrenceSheet
        open={editSheetOpen}
        onOpenChange={setEditSheetOpen}
        recurrence={editingSheet}
        clients={clients}
        products={products}
        onSave={handleSheetSave}
        onDelete={(id) => { deleteRecurrence.mutate(id); setEditSheetOpen(false); }}
        isLoading={updateRecurrence.isPending}
      />
    </div>
  );
};

export default Recurrences;
