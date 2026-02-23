import { useState } from "react";
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
import { Plus, Search, Edit, Trash2, CalendarIcon, RefreshCw } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";

const PERIODICITIES = [
  { value: "monthly", label: "Mensal" },
  { value: "quarterly", label: "Trimestral" },
  { value: "semiannual", label: "Semestral" },
  { value: "annual", label: "Anual" },
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
    setEditing(r);
    setForm(r);
    setNextDate(r.next_date ? new Date(r.next_date + "T12:00:00") : undefined);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.client_id || !nextDate) return;
    const payload = {
      client_id: form.client_id,
      product_id: form.product_id || null,
      recurrence_type: form.recurrence_type || null,
      periodicity: form.periodicity || "monthly",
      next_date: format(nextDate, "yyyy-MM-dd"),
      estimated_value: form.estimated_value ? Number(form.estimated_value) : null,
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

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Recorrências e Agendamentos</h2>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Nova Recorrência</Button>
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
                    <TableCell>{PERIODICITIES.find(p => p.value === r.periodicity)?.label || r.periodicity}</TableCell>
                    <TableCell>{r.next_date ? format(new Date(r.next_date + "T12:00:00"), "dd/MM/yyyy") : "-"}</TableCell>
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
            <DialogTitle>{editing ? "Editar Recorrência" : "Nova Recorrência"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-4">
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
              <Label>Produto/Serviço</Label>
              <Select value={form.product_id || ""} onValueChange={v => set("product_id", v)}>
                <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
                <SelectContent>
                  {products.filter((p: any) => p.active).map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Periodicidade</Label>
                <Select value={form.periodicity || "monthly"} onValueChange={v => set("periodicity", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {PERIODICITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                  </SelectContent>
                </Select>
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
            <div className="space-y-2">
              <Label>Tipo de Recorrência</Label>
              <Input value={form.recurrence_type || ""} onChange={e => set("recurrence_type", e.target.value)} placeholder="Ex: Manutenção preventiva" />
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
    </div>
  );
};

export default Recurrences;
