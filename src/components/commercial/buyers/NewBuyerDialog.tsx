import { useState, useEffect, useMemo } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { Search } from "lucide-react";

const INFLUENCE_LEVELS = [
  { value: 'high', label: 'Alto' },
  { value: 'medium', label: 'Médio' },
  { value: 'low', label: 'Baixo' },
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
  const [clientSearch, setClientSearch] = useState('');

  useEffect(() => {
    if (open) {
      setForm(initialData ? { ...initialData, is_active: initialData.is_active ?? true, is_primary: initialData.is_primary ?? false } : { is_active: true, is_primary: false });
      setClientSearch('');
    }
  }, [open, initialData]);

  const set = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));

  const filteredClients = useMemo(() => {
    if (!clientSearch) return clients;
    return clients.filter(c => c.name.toLowerCase().includes(clientSearch.toLowerCase()));
  }, [clients, clientSearch]);

  const selectedClientName = clients.find(c => c.id === form.client_id)?.name || '';

  const handleSubmit = () => {
    if (!form.name || !form.client_id) return;
    onSave(form);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Comprador' : 'Adicionar Novo Comprador'}</DialogTitle>
          <DialogDescription>Cadastre um novo contato comprador no sistema.</DialogDescription>
        </DialogHeader>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-4">
          <div className="space-y-2 md:col-span-2">
            <Label>Empresa *</Label>
            <Select value={form.client_id || ''} onValueChange={v => set('client_id', v)}>
              <SelectTrigger><SelectValue placeholder="Buscar empresa..." /></SelectTrigger>
              <SelectContent>
                <div className="px-2 pb-2">
                  <div className="relative">
                    <Search className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                    <Input
                      placeholder="Filtrar..."
                      value={clientSearch}
                      onChange={e => setClientSearch(e.target.value)}
                      className="pl-7 h-8 text-sm"
                    />
                  </div>
                </div>
                {filteredClients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
                {filteredClients.length === 0 && <p className="text-sm text-muted-foreground text-center py-2">Nenhuma empresa encontrada</p>}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Nome Completo *</Label>
            <Input value={form.name || ''} onChange={e => set('name', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Cargo *</Label>
            <Input value={form.role || ''} onChange={e => set('role', e.target.value)} placeholder="Ex: Gerente de Compras" />
          </div>
          <div className="space-y-2">
            <Label>E-mail *</Label>
            <Input type="email" value={form.email || ''} onChange={e => set('email', e.target.value)} />
          </div>
          <div className="space-y-2">
            <Label>Telefone</Label>
            <Input value={form.phone || ''} onChange={e => set('phone', e.target.value)} />
          </div>
          <div className="space-y-2 md:col-span-2">
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

          <div className="md:col-span-2 flex flex-col gap-3">
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_active"
                checked={form.is_active ?? true}
                onCheckedChange={v => set('is_active', v)}
              />
              <Label htmlFor="is_active" className="font-normal">Comprador ativo na empresa</Label>
            </div>
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_primary"
                checked={form.is_primary ?? false}
                onCheckedChange={v => set('is_primary', v)}
              />
              <Label htmlFor="is_primary" className="font-normal">Marcar como comprador principal</Label>
            </div>
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
