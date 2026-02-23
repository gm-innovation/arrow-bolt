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
import { CalendarIcon, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";
import type { Opportunity } from "@/hooks/useOpportunities";

const STAGES = [
  { value: "identified", label: "Identificada" },
  { value: "qualified", label: "Qualificada" },
  { value: "proposal", label: "Proposta" },
  { value: "negotiation", label: "Negociação" },
  { value: "closed_won", label: "Fechada (Ganha)" },
  { value: "closed_lost", label: "Fechada (Perdida)" },
];

const TYPES = [
  { value: "new_business", label: "Novo Negócio" },
  { value: "renewal", label: "Renovação" },
  { value: "upsell", label: "Upsell" },
  { value: "cross_sell", label: "Cross-sell" },
];

const PRIORITIES = [
  { value: "low", label: "Baixa" },
  { value: "medium", label: "Média" },
  { value: "high", label: "Alta" },
  { value: "urgent", label: "Urgente" },
];

const priorityColors: Record<string, string> = {
  low: "bg-gray-100 text-gray-800",
  medium: "bg-blue-100 text-blue-800",
  high: "bg-orange-100 text-orange-800",
  urgent: "bg-red-100 text-red-800",
};

const typeLabels: Record<string, string> = {
  new_business: "Novo Negócio",
  renewal: "Renovação",
  upsell: "Upsell",
  cross_sell: "Cross-sell",
};

const formatCurrency = (v: number | null) =>
  v ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v) : "—";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunity: Opportunity | null;
  clients: { id: string; name: string }[];
  onSave: (data: Record<string, any>) => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
}

export const EditOpportunitySheet = ({ open, onOpenChange, opportunity, clients, onSave, onDelete, isLoading }: Props) => {
  const [form, setForm] = useState<Record<string, any>>({});
  const [closeDate, setCloseDate] = useState<Date | undefined>();

  useEffect(() => {
    if (open && opportunity) {
      setForm({ ...opportunity });
      setCloseDate(opportunity.expected_close_date ? new Date(opportunity.expected_close_date) : undefined);
    }
  }, [open, opportunity]);

  if (!opportunity) return null;

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = () => {
    if (!form.title || !form.client_id) return;
    onSave({
      id: opportunity.id,
      title: form.title,
      client_id: form.client_id,
      estimated_value: form.estimated_value ? Number(form.estimated_value) : null,
      stage: form.stage,
      probability: form.probability != null ? Number(form.probability) : null,
      opportunity_type: form.opportunity_type || null,
      priority: form.priority || null,
      expected_close_date: closeDate ? format(closeDate, "yyyy-MM-dd") : null,
      description: form.description || null,
      closed_at: ["closed_won", "closed_lost"].includes(form.stage) ? new Date().toISOString() : null,
      loss_reason: form.loss_reason || null,
    });
  };

  const priorityLabel = PRIORITIES.find(p => p.value === opportunity.priority)?.label || opportunity.priority;

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Editar Oportunidade</SheetTitle>
          <SheetDescription>Atualize os dados da oportunidade.</SheetDescription>
        </SheetHeader>

        {/* Header badges */}
        <div className="space-y-3 mt-4">
          <div className="flex flex-wrap gap-2">
            {opportunity.priority && (
              <Badge variant="secondary" className={priorityColors[opportunity.priority] || ""}>
                {priorityLabel}
              </Badge>
            )}
            {opportunity.opportunity_type && (
              <Badge variant="outline">
                {typeLabels[opportunity.opportunity_type] || opportunity.opportunity_type}
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground">
            <span>{formatCurrency(opportunity.estimated_value)}</span>
            <span>Criada em {format(new Date(opportunity.created_at), "dd/MM/yyyy")}</span>
          </div>
        </div>

        <Separator className="my-4" />

        {/* Form */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label>Título *</Label>
            <Input value={form.title || ""} onChange={e => set("title", e.target.value)} />
          </div>

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
              <Label>Valor (R$)</Label>
              <Input type="number" value={form.estimated_value || ""} onChange={e => set("estimated_value", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Estágio *</Label>
              <Select value={form.stage || "identified"} onValueChange={v => set("stage", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Probabilidade (%)</Label>
              <Input type="number" min={0} max={100} value={form.probability ?? ""} onChange={e => set("probability", e.target.value)} />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo</Label>
              <Select value={form.opportunity_type || ""} onValueChange={v => set("opportunity_type", v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Prioridade</Label>
              <Select value={form.priority || "medium"} onValueChange={v => set("priority", v)}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label>Previsão de Fechamento</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left", !closeDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {closeDate ? format(closeDate, "dd/MM/yyyy") : "Selecionar data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={closeDate} onSelect={setCloseDate} locale={ptBR} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>

          {form.stage === "closed_lost" && (
            <div className="space-y-2">
              <Label>Motivo da Perda</Label>
              <Textarea value={form.loss_reason || ""} onChange={e => set("loss_reason", e.target.value)} rows={2} />
            </div>
          )}

          <div className="space-y-2">
            <Label>Descrição</Label>
            <Textarea value={form.description || ""} onChange={e => set("description", e.target.value)} rows={3} />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t">
          <Button variant="destructive" size="sm" onClick={() => { onDelete(opportunity.id); onOpenChange(false); }}>
            <Trash2 className="h-4 w-4 mr-2" /> Excluir
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.title || !form.client_id || isLoading}>
              {isLoading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
