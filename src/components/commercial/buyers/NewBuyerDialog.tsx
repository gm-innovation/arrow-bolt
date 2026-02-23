import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const INFLUENCE_LEVELS = [
  { value: 'decisor', label: 'Decisor' },
  { value: 'influenciador', label: 'Influenciador' },
  { value: 'usuario', label: 'Usuário' },
];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Record<string, any>) => void;
  clients: { id: string; name: string }[];
  initialData?: Record<string, any> | null;
  isLoading?: boolean;
}

export const NewBuyerDialog = ({ open, onOpenChange, onSave, clients, initialData, isLoading }: Props) => {
  const isEditing = !!initialData;
  const [form, setForm] = useState<Record<string, any>>({});

  useEffect(() => {
    if (open) setForm(initialData || {});
  }, [open, initialData]);

  const set = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const handleSubmit = () => {
    if (!form.name || !form.client_id) return;
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Comprador' : 'Novo Comprador'}</DialogTitle>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <div className="space-y-2 md:col-span-2">
            <Label>Nome *</Label>
            <Input value={form.name || ''} onChange={e => set('name', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Cargo</Label>
            <Input value={form.role || ''} onChange={e => set('role', e.target.value)} placeholder="Ex: Gerente de Compras" />
          </div>
          <div className="space-y-2">
            <Label>Cliente *</Label>
            <Select value={form.client_id || ''} onValueChange={v => set('client_id', v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
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
            <Label>Nível de Influência</Label>
            <Select value={form.influence_level || ''} onValueChange={v => set('influence_level', v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {INFLUENCE_LEVELS.map(l => <SelectItem key={l.value} value={l.value}>{l.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2 md:col-span-2">
            <Label>Notas</Label>
            <Textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} rows={3} />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!form.name || !form.client_id || isLoading}>
            {isLoading ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
