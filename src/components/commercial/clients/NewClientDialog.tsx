import { useState, useEffect } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Star, MapPin } from "lucide-react";

const SEGMENTS = ['Oil & Gas', 'Naval', 'Energia', 'Mineração', 'Industrial', 'Portuário', 'Outro'];

interface LegalEntity { legal_name: string; cnpj: string; is_primary: boolean; }
interface Address { label: string; cep: string; street: string; street_number: string; city: string; state: string; is_primary: boolean; }

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (data: Record<string, any>, buyer?: Record<string, any> | null, legalEntities?: LegalEntity[], addresses?: Address[]) => void;
  initialData?: Record<string, any> | null;
  isLoading?: boolean;
}

export const NewClientDialog = ({ open, onOpenChange, onSave, initialData, isLoading }: Props) => {
  const isEditing = !!initialData;
  const [form, setForm] = useState<Record<string, any>>({});
  const [buyer, setBuyer] = useState<Record<string, any>>({});
  const [legalEntities, setLegalEntities] = useState<LegalEntity[]>([]);
  const [addresses, setAddresses] = useState<Address[]>([]);

  useEffect(() => {
    if (open) {
      setForm(initialData || {});
      setBuyer({});
      setLegalEntities([]);
      setAddresses([]);
    }
  }, [open, initialData]);

  const set = (key: string, value: any) => setForm(prev => ({ ...prev, [key]: value }));
  const setBuyerField = (key: string, value: any) => setBuyer(prev => ({ ...prev, [key]: value }));

  const addLegalEntity = () => setLegalEntities(prev => [...prev, { legal_name: "", cnpj: "", is_primary: prev.length === 0 }]);
  const updateLE = (i: number, field: string, value: any) => setLegalEntities(prev => prev.map((le, idx) => idx === i ? { ...le, [field]: value } : le));
  const removeLE = (i: number) => setLegalEntities(prev => prev.filter((_, idx) => idx !== i));

  const addAddress = () => setAddresses(prev => [...prev, { label: "Sede", cep: "", street: "", street_number: "", city: "", state: "", is_primary: prev.length === 0 }]);
  const updateAddr = (i: number, field: string, value: any) => setAddresses(prev => prev.map((a, idx) => idx === i ? { ...a, [field]: value } : a));
  const removeAddr = (i: number) => setAddresses(prev => prev.filter((_, idx) => idx !== i));

  const handleSubmit = () => {
    if (!form.name) return;
    const hasBuyer = buyer.name?.trim();
    onSave(
      { ...form, annual_revenue: form.annual_revenue ? Number(form.annual_revenue) : null },
      hasBuyer ? buyer : null,
      legalEntities.filter(le => le.legal_name.trim()),
      addresses.filter(a => a.street?.trim() || a.city?.trim())
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
                <Label>Nome Fantasia *</Label>
                <Input value={form.name || ''} onChange={e => set('name', e.target.value)} placeholder="Nome fantasia da empresa" />
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

          {/* Razões Sociais */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Razões Sociais / CNPJs</h3>
              <Button variant="outline" size="sm" onClick={addLegalEntity}><Plus className="h-3 w-3 mr-1" /> Adicionar</Button>
            </div>
            {legalEntities.length === 0 && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Razão Social</Label>
                  <Input value={form.legal_name || ''} onChange={e => set('legal_name', e.target.value)} placeholder="Razão social (legado)" />
                </div>
                <div className="space-y-2">
                  <Label>CNPJ</Label>
                  <Input value={form.cnpj || ''} onChange={e => set('cnpj', e.target.value)} placeholder="00.000.000/0000-00" />
                </div>
              </div>
            )}
            <div className="space-y-2">
              {legalEntities.map((le, i) => (
                <Card key={i}>
                  <CardContent className="p-3">
                    <div className="flex items-start gap-2">
                      <div className="flex-1 grid grid-cols-2 gap-2">
                        <Input value={le.legal_name} onChange={e => updateLE(i, 'legal_name', e.target.value)} placeholder="Razão Social" />
                        <Input value={le.cnpj} onChange={e => updateLE(i, 'cnpj', e.target.value)} placeholder="CNPJ" />
                      </div>
                      <div className="flex gap-1">
                        {le.is_primary && <Badge variant="secondary" className="text-xs"><Star className="h-3 w-3 fill-current" /></Badge>}
                        <Button variant="ghost" size="icon" onClick={() => removeLE(i)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Separator />

          {/* Endereços */}
          <div>
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-muted-foreground">Endereços</h3>
              <Button variant="outline" size="sm" onClick={addAddress}><Plus className="h-3 w-3 mr-1" /> Adicionar</Button>
            </div>
            {addresses.length === 0 && (
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2"><Label>CEP</Label><Input value={form.cep || ''} onChange={e => set('cep', e.target.value)} placeholder="00000-000" /></div>
                <div className="space-y-2 md:col-span-2"><Label>Logradouro</Label><Input value={form.street || ''} onChange={e => set('street', e.target.value)} /></div>
                <div className="space-y-2"><Label>Nº</Label><Input value={form.street_number || ''} onChange={e => set('street_number', e.target.value)} /></div>
                <div className="space-y-2 md:col-span-2"><Label>Cidade</Label><Input value={form.city || ''} onChange={e => set('city', e.target.value)} /></div>
                <div className="space-y-2"><Label>UF</Label><Input value={form.state || ''} onChange={e => set('state', e.target.value)} maxLength={2} /></div>
              </div>
            )}
            <div className="space-y-2">
              {addresses.map((a, i) => (
                <Card key={i}>
                  <CardContent className="p-3 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <MapPin className="h-3 w-3 text-muted-foreground" />
                        <Input value={a.label} onChange={e => updateAddr(i, 'label', e.target.value)} placeholder="Rótulo" className="h-7 w-24 text-xs" />
                        {a.is_primary && <Badge variant="secondary" className="text-xs">Principal</Badge>}
                      </div>
                      <Button variant="ghost" size="icon" onClick={() => removeAddr(i)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
                    </div>
                    <div className="grid grid-cols-4 gap-2">
                      <Input value={a.cep} onChange={e => updateAddr(i, 'cep', e.target.value)} placeholder="CEP" className="text-sm" />
                      <Input value={a.street} onChange={e => updateAddr(i, 'street', e.target.value)} placeholder="Logradouro" className="col-span-2 text-sm" />
                      <Input value={a.street_number} onChange={e => updateAddr(i, 'street_number', e.target.value)} placeholder="Nº" className="text-sm" />
                    </div>
                    <div className="grid grid-cols-3 gap-2">
                      <Input value={a.city} onChange={e => updateAddr(i, 'city', e.target.value)} placeholder="Cidade" className="col-span-2 text-sm" />
                      <Input value={a.state} onChange={e => updateAddr(i, 'state', e.target.value)} placeholder="UF" maxLength={2} className="text-sm" />
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>

          <Separator />

          {/* Observações */}
          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea value={form.notes || ''} onChange={e => set('notes', e.target.value)} rows={3} />
          </div>

          {/* Comprador Principal */}
          {!isEditing && (
            <>
              <Separator />
              <div>
                <h3 className="text-sm font-semibold text-muted-foreground mb-3">Comprador Principal (Opcional)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-2"><Label>Nome</Label><Input value={buyer.name || ''} onChange={e => setBuyerField('name', e.target.value)} placeholder="Nome do comprador" /></div>
                  <div className="space-y-2"><Label>Cargo</Label><Input value={buyer.role || ''} onChange={e => setBuyerField('role', e.target.value)} placeholder="Ex: Gerente de Compras" /></div>
                  <div className="space-y-2"><Label>E-mail</Label><Input type="email" value={buyer.email || ''} onChange={e => setBuyerField('email', e.target.value)} /></div>
                  <div className="space-y-2"><Label>Telefone</Label><Input value={buyer.phone || ''} onChange={e => setBuyerField('phone', e.target.value)} /></div>
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
