import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { CalendarIcon, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

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

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recurrence: Record<string, any> | null;
  clients: { id: string; name: string }[];
  products: { id: string; name: string; type?: string; active?: boolean }[];
  onSave: (data: Record<string, any>) => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
}

export const EditRecurrenceSheet = ({ open, onOpenChange, recurrence, clients, products, onSave, onDelete, isLoading }: Props) => {
  const [form, setForm] = useState<Record<string, any>>({});
  const [nextDate, setNextDate] = useState<Date | undefined>();

  useEffect(() => {
    if (open && recurrence) {
      setForm(recurrence);
      setNextDate(recurrence.next_date ? new Date(recurrence.next_date + "T12:00:00") : undefined);
    }
  }, [open, recurrence]);

  if (!recurrence) return null;

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const clientName = recurrence.clients?.name || "—";
  const productName = recurrence.crm_products?.name || "—";
  const clientInitial = clientName.charAt(0).toUpperCase();
  const productInitial = productName.charAt(0).toUpperCase();

  const handleSave = () => {
    if (!form.client_id || !nextDate) return;
    onSave({
      id: recurrence.id,
      client_id: form.client_id,
      product_id: form.product_id || null,
      recurrence_type: form.recurrence_type || null,
      periodicity: form.periodicity_months ? `${form.periodicity_months}_months` : form.periodicity || "monthly",
      next_date: format(nextDate, "yyyy-MM-dd"),
      estimated_value: form.estimated_value ? Number(form.estimated_value) : null,
      advance_notice_days: form.advance_notice_days != null ? Number(form.advance_notice_days) : 30,
      notes: form.notes || null,
      status: form.status || "active",
    });
  };

  const activeProducts = products.filter((p: any) => p.active !== false);

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Editar Recorrência</SheetTitle>
          <SheetDescription>Atualize os dados da recorrência.</SheetDescription>
        </SheetHeader>

        {/* Header info */}
        <div className="space-y-4 mt-4">
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-primary text-primary-foreground">{clientInitial}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{clientName}</p>
              <p className="text-sm text-muted-foreground">Cliente</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Avatar className="h-10 w-10">
              <AvatarFallback className="bg-secondary text-secondary-foreground">{productInitial}</AvatarFallback>
            </Avatar>
            <div className="flex-1 min-w-0">
              <p className="font-medium truncate">{productName}</p>
              <p className="text-sm text-muted-foreground">Produto/Serviço</p>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Badge variant={STATUS_MAP[recurrence.status]?.variant || "secondary"}>
              {STATUS_MAP[recurrence.status]?.label || recurrence.status}
            </Badge>
            {recurrence.estimated_value && (
              <Badge variant="outline">{formatCurrency(Number(recurrence.estimated_value))}</Badge>
            )}
            {recurrence.next_date && (
              <Badge variant="outline">
                <CalendarIcon className="h-3 w-3 mr-1" />
                {format(new Date(recurrence.next_date + "T12:00:00"), "dd/MM/yyyy")}
              </Badge>
            )}
          </div>
        </div>

        <Separator className="my-4" />

        {/* Form */}
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Cliente *</Label>
              <Select value={form.client_id || ""} onValueChange={v => set("client_id", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Produto/Serviço</Label>
              <Select value={form.product_id || ""} onValueChange={v => set("product_id", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {activeProducts.map((p: any) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
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
            <div className="space-y-2">
              <Label>Aviso antecipado</Label>
              <Input type="number" min={0} value={form.advance_notice_days ?? 30} onChange={e => set("advance_notice_days", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Próxima Data *</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button variant="outline" className={cn("w-full justify-start text-left", !nextDate && "text-muted-foreground")}>
                    <CalendarIcon className="mr-2 h-4 w-4" />
                    {nextDate ? format(nextDate, "dd/MM/yyyy") : "Selecionar"}
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
            <Label>Status</Label>
            <Select value={form.status || "active"} onValueChange={v => set("status", v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(STATUS_MAP).map(([k, v]) => <SelectItem key={k} value={k}>{v.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea value={form.notes || ""} onChange={e => set("notes", e.target.value)} rows={3} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t">
          <Button variant="destructive" size="sm" onClick={() => { onDelete(recurrence.id); onOpenChange(false); }}>
            <Trash2 className="h-4 w-4 mr-2" /> Excluir
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.client_id || !nextDate || isLoading}>
              {isLoading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
