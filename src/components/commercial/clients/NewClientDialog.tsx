import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { CalendarIcon } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { cn } from "@/lib/utils";

const SEGMENTS = ['Oil & Gas', 'Naval', 'Energia', 'Mineração', 'Industrial', 'Portuário', 'Outro'];
const STATUSES = [
  { value: 'prospect', label: 'Prospect' },
  { value: 'active', label: 'Ativo' },
  { value: 'inactive', label: 'Inativo' },
  { value: 'churned', label: 'Perdido' },
];
const SOURCES = ['Indicação', 'Site', 'Evento', 'LinkedIn', 'Prospecção Ativa', 'Outro'];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Record<string, any>) => void;
  initialData?: Record<string, any> | null;
  isLoading?: boolean;
}

export const NewClientDialog = ({ open, onOpenChange, onSave, initialData, isLoading }: Props) => {
  const isEditing = !!initialData;
  const [form, setForm] = useState<Record<string, any>>(initialData || {});
  const [lastContactDate, setLastContactDate] = useState<Date | undefined>(
    initialData?.last_contact_date ? new Date(initialData.last_contact_date) : undefined
  );

  const handleOpen = (o: boolean) => {
    if (o && initialData) {
      setForm(initialData);
      setLastContactDate(initialData.last_contact_date ? new Date(initialData.last_contact_date) : undefined);
    } else if (o) {
      setForm({});
      setLastContactDate(undefined);
    }
    onOpenChange(o);
  };

  const handleSubmit = () => {
    if (!form.name) return;
    onSave({
      ...form,
      last_contact_date: lastContactDate ? format(lastContactDate, 'yyyy-MM-dd') : null,
      annual_revenue: form.annual_revenue ? Number(form.annual_revenue) : null,
    });
  };

  const set = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  return (
    <Dialog open={open} onOpenChange={handleOpen}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Cliente' : 'Novo Cliente'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <div className="space-y-2">
            <Label>Nome *</Label>
            <Input value={form.name || ''} onChange={e => set('name', e.target.value)} placeholder="Nome da empresa" />
          </div>
          <div className="space-y-2">
            <Label>CNPJ</Label>
            <Input value={form.cnpj || ''} onChange={e => set('cnpj', e.target.value)} placeholder="00.000.000/0000-00" />
          </div>
          <div className="space-y-2">
            <Label>Email</Label>
            <Input type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input value={form.phone || ''} onChange={e => set('phone', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Pessoa de Contato</Label>
            <Input value={form.contact_person || ''} onChange={e => set('contact_person', e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Endereço</Label>
            <Input value={form.address || ''} onChange={e => set('address', e.target.value)} />
          </div>

          {/* Commercial fields */}
          <div className="md:col-span-2 border-t pt-4 mt-2">
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Dados Comerciais</h3>
          </div>
          <div className="space-y-2">
            <Label>Segmento</Label>
            <Select value={form.segment || ''} onValueChange={v => set('segment', v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {SEGMENTS.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Status Comercial</Label>
            <Select value={form.commercial_status || 'prospect'} onValueChange={v => set('commercial_status', v)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {STATUSES.map(s => <SelectItem key={s.value} value={s.value}>{s.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Receita Anual (R$)</Label>
            <Input type="number" value={form.annual_revenue || ''} onChange={e => set('annual_revenue', e.target.value)} placeholder="0,00" />
          </div>
          <div className="space-y-2">
            <Label>Origem</Label>
            <Select value={form.source || ''} onValueChange={v => set('source', v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {SOURCES.map(s => <SelectItem key={s} value={s}>{s}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Último Contato</Label>
            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" className={cn("w-full justify-start text-left font-normal", !lastContactDate && "text-muted-foreground")}>
                  <CalendarIcon className="mr-2 h-4 w-4" />
                  {lastContactDate ? format(lastContactDate, "dd/MM/yyyy") : "Selecionar data"}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={lastContactDate} onSelect={setLastContactDate} locale={ptBR} className="p-3 pointer-events-auto" />
              </PopoverContent>
            </Popover>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Notas</Label>
            <Textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!form.name || isLoading}>
            {isLoading ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
