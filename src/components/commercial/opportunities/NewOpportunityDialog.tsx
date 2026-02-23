import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const STAGES = [
  { value: 'identified', label: 'Identificada' },
  { value: 'qualified', label: 'Qualificada' },
  { value: 'proposal', label: 'Proposta' },
  { value: 'negotiation', label: 'Negociação' },
  { value: 'closed_won', label: 'Fechada (Ganha)' },
  { value: 'closed_lost', label: 'Fechada (Perdida)' },
];

const TYPES = [
  { value: 'new_business', label: 'Novo Negócio' },
  { value: 'renewal', label: 'Renovação' },
  { value: 'upsell', label: 'Upsell' },
  { value: 'cross_sell', label: 'Cross-sell' },
];

const PRIORITIES = [
  { value: 'low', label: 'Baixa' },
  { value: 'medium', label: 'Média' },
  { value: 'high', label: 'Alta' },
  { value: 'urgent', label: 'Urgente' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Record<string, any>) => void;
  clients: { id: string; name: string }[];
  buyers: { id: string; name: string; client_id: string }[];
  initialData?: Record<string, any> | null;
  isLoading?: boolean;
}

export const NewOpportunityDialog = ({ open, onOpenChange, onSave, clients, buyers, initialData, isLoading }: Props) => {
  const isEditing = !!initialData;
  const [form, setForm] = useState<Record<string, any>>({});
  const [probability, setProbability] = useState([50]);
  const [closeDate, setCloseDate] = useState<Date | undefined>();

  useEffect(() => {
    if (open) {
      const data = initialData || { stage: 'identified', priority: 'medium' };
      setForm(data);
      setProbability([data.probability || 50]);
      setCloseDate(data.expected_close_date ? new Date(data.expected_close_date) : undefined);
    }
  }, [open, initialData]);

  const set = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const filteredBuyers = buyers.filter(b => b.client_id === form.client_id);

  const handleSubmit = () => {
    if (!form.title || !form.client_id || !form.stage) return;
    onSave({
      ...form,
      probability: probability[0],
      estimated_value: form.estimated_value ? Number(form.estimated_value) : null,
      expected_close_date: closeDate ? format(closeDate, 'yyyy-MM-dd') : null,
      closed_at: ['closed_won', 'closed_lost'].includes(form.stage) ? new Date().toISOString() : null,
    });
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Oportunidade' : 'Nova Oportunidade'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <div className="space-y-2 md:col-span-2">
            <Label>Título *</Label>
            <Input value={form.title || ''} onChange={e => set('title', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Cliente *</Label>
            <Select value={form.client_id || ''} onValueChange={v => { set('client_id', v); set('buyer_id', null); }}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Comprador</Label>
            <Select value={form.buyer_id || ''} onValueChange={v => set('buyer_id', v)} disabled={!form.client_id}>
              <SelectTrigger><SelectValue placeholder={filteredBuyers.length ? "Selecione" : "Selecione cliente primeiro"} /></SelectTrigger>
              <SelectContent>
                {filteredBuyers.map(b => <SelectItem key={b.id} value={b.id}>{b.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tipo</Label>
            <Select value={form.opportunity_type || ''} onValueChange={v => set('opportunity_type', v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {TYPES.map(t => <SelectItem key={t.value} value={t.value}>{t.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Estágio *</Label>
            <Select value={form.stage || 'identified'} onValueChange={v => set('stage', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STAGES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Prioridade</Label>
            <Select value={form.priority || 'medium'} onValueChange={v => set('priority', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {PRIORITIES.map(p => <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Valor Estimado (R$)</Label>
            <Input type="number" value={form.estimated_value || ''} onChange={e => set('estimated_value', e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Probabilidade: {probability[0]}%</Label>
            <Slider value={probability} onValueChange={setProbability} max={100} step={5} />
          </div>
          <div className="space-y-2">
            <Label>Data Prevista de Fechamento</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !closeDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {closeDate ? format(closeDate, "dd/MM/yyyy") : "Selecionar data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={closeDate} onSelect={setCloseDate} locale={ptBR} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>

          {form.stage === 'closed_lost' && (
            <div className="space-y-2 md:col-span-2">
              <Label>Motivo da Perda</Label>
              <Textarea value={form.loss_reason || ''} onChange={e => set('loss_reason', e.target.value)} rows={2} />
            </div>
          )}

          <div className="space-y-2 md:col-span-2">
            <Label>Descrição</Label>
            <Textarea value={form.description || ''} onChange={e => set('description', e.target.value)} rows={2} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Notas</Label>
            <Textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} rows={2} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!form.title || !form.client_id || isLoading}>
            {isLoading ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
