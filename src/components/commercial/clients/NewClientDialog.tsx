import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";

const SEGMENTS = ['Oil & Gas', 'Naval', 'Energia', 'Mineração', 'Industrial', 'Portuário', 'Outro'];

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Record<string, any>, buyer?: Record<string, any> | null) => void;
  initialData?: Record<string, any> | null;
  isLoading?: boolean;
}

export const NewClientDialog = ({ open, onOpenChange, onSave, initialData, isLoading }: Props) => {
  const isEditing = !!initialData;
  const [form, setForm] = useState<Record<string, any>>({});
  const [buyer, setBuyer] = useState<Record<string, any>>({});

  useEffect(() => {
    if (open) {
      setForm(initialData || {});
      setBuyer({});
    }
  }, [open, initialData]);

  const set = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));
  const setBuyerField = (key: string, value: any) => setBuyer(prev => ({ ...prev, [key]: value }));

  const handleSubmit = () => {
    if (!form.name) return;
    const hasBuyer = buyer.name?.trim();
    onSave(
      {
        ...form,
        annual_revenue: form.annual_revenue ? Number(form.annual_revenue) : null,
      },
      hasBuyer ? buyer : null
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? 'Editar Cliente' : 'Adicionar Novo Cliente'}</DialogTitle>
          <DialogDescription>
            {isEditing ? 'Atualize as informações do cliente.' : 'Preencha as informações para cadastrar um novo cliente no sistema.'}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Identificação */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Identificação</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Razão Social *</Label>
                <Input value={form.name || ''} onChange={e => set('name', e.target.value)} placeholder="Nome da empresa" />
              </div>
              <div className="space-y-2">
                <Label>CNPJ</Label>
                <Input value={form.cnpj || ''} onChange={e => set('cnpj', e.target.value)} placeholder="00.000.000/0000-00" />
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
            </div>
          </div>

          <Separator />

          {/* Endereço */}
          <div>
            <h3 className="text-sm font-semibold text-muted-foreground mb-3">Endereço</h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="space-y-2">
                <Label>CEP</Label>
                <Input value={form.cep || ''} onChange={e => set('cep', e.target.value)} placeholder="00000-000" />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Logradouro</Label>
                <Input value={form.street || ''} onChange={e => set('street', e.target.value)} placeholder="Rua, Av..." />
              </div>
              <div className="space-y-2">
                <Label>Nº</Label>
                <Input value={form.street_number || ''} onChange={e => set('street_number', e.target.value)} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label>Cidade</Label>
                <Input value={form.city || ''} onChange={e => set('city', e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>UF</Label>
                <Input value={form.state || ''} onChange={e => set('state', e.target.value)} maxLength={2} placeholder="UF" />
              </div>
            </div>
          </div>

          <Separator />

          {/* Observações */}
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} rows={3} />
          </div>

          {/* Comprador Principal - apenas na criação */}
          {!isEditing && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">Comprador Principal (Opcional)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Nome</Label>
                    <Input value={buyer.name || ''} onChange={e => setBuyerField('name', e.target.value)} placeholder="Nome do comprador" />
                  </div>
                  <div className="space-y-2">
                    <Label>Cargo</Label>
                    <Input value={buyer.role || ''} onChange={e => setBuyerField('role', e.target.value)} placeholder="Ex: Gerente de Compras" />
                  </div>
                  <div className="space-y-2">
                    <Label>E-mail</Label>
                    <Input type="email" value={buyer.email || ''} onChange={e => setBuyerField('email', e.target.value)} />
                  </div>
                  <div className="space-y-2">
                    <Label>Telefone</Label>
                    <Input value={buyer.phone || ''} onChange={e => setBuyerField('phone', e.target.value)} />
                  </div>
                </div>
              </div>
            </>
          )}
        </div>

        <DialogFooter className="gap-2">
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!form.name || isLoading}>
            {isLoading ? 'Salvando...' : isEditing ? 'Salvar' : 'Criar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
