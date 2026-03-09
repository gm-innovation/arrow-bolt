import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Star, MapPin } from "lucide-react";
import { useClientAddresses } from "@/hooks/useClientAddresses";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  clientId: string | null;
}

interface FormData {
  label: string;
  cep: string;
  street: string;
  street_number: string;
  city: string;
  state: string;
  complement: string;
}

const emptyForm: FormData = { label: "Sede", cep: "", street: "", street_number: "", city: "", state: "", complement: "" };

export const AddressesSection = ({ clientId }: Props) => {
  const { addresses, isLoading, create, update, remove } = useClientAddresses(clientId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);

  if (!clientId) return <p className="text-sm text-muted-foreground">Salve a empresa primeiro.</p>;
  if (isLoading) return <Skeleton className="h-20 w-full" />;

  const openAdd = () => { setEditingId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (a: any) => {
    setEditingId(a.id);
    setForm({ label: a.label || "", cep: a.cep || "", street: a.street || "", street_number: a.street_number || "", city: a.city || "", state: a.state || "", complement: a.complement || "" });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    if (editingId) {
      await update.mutateAsync({ id: editingId, ...form } as any);
    } else {
      await create.mutateAsync({ client_id: clientId!, ...form, is_primary: addresses.length === 0 } as any);
    }
    setDialogOpen(false);
  };

  const formatAddress = (a: any) => {
    const parts = [a.street, a.street_number, a.complement, a.city, a.state].filter(Boolean);
    return parts.join(", ") || "Endereço incompleto";
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Endereços</Label>
        <Button variant="outline" size="sm" onClick={openAdd}><Plus className="h-3 w-3 mr-1" /> Adicionar</Button>
      </div>

      {addresses.length === 0 && <p className="text-sm text-muted-foreground">Nenhum endereço cadastrado.</p>}

      {addresses.map((a) => (
        <Card key={a.id}>
          <CardContent className="p-3 flex items-center justify-between">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium text-sm">{a.label || "Endereço"}</span>
                  {a.is_primary && <Badge variant="secondary" className="text-xs"><Star className="h-3 w-3 mr-1 fill-current" />Principal</Badge>}
                </div>
                <p className="text-xs text-muted-foreground">{formatAddress(a)}</p>
                {a.cep && <p className="text-xs text-muted-foreground">CEP: {a.cep}</p>}
              </div>
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => openEdit(a)}><Pencil className="h-3 w-3" /></Button>
              <Button variant="ghost" size="icon" onClick={() => remove.mutate(a.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? "Editar" : "Novo"} Endereço</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label>Rótulo</Label>
                <Input value={form.label} onChange={e => setForm({ ...form, label: e.target.value })} placeholder="Ex: Sede, Filial" />
              </div>
              <div className="space-y-1">
                <Label>CEP</Label>
                <Input value={form.cep} onChange={e => setForm({ ...form, cep: e.target.value })} placeholder="00000-000" />
              </div>
            </div>
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-1 col-span-2">
                <Label>Logradouro</Label>
                <Input value={form.street} onChange={e => setForm({ ...form, street: e.target.value })} placeholder="Rua, Av..." />
              </div>
              <div className="space-y-1">
                <Label>Nº</Label>
                <Input value={form.street_number} onChange={e => setForm({ ...form, street_number: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>Complemento</Label>
                <Input value={form.complement} onChange={e => setForm({ ...form, complement: e.target.value })} />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1 col-span-2">
                <Label>Cidade</Label>
                <Input value={form.city} onChange={e => setForm({ ...form, city: e.target.value })} />
              </div>
              <div className="space-y-1">
                <Label>UF</Label>
                <Input value={form.state} onChange={e => setForm({ ...form, state: e.target.value })} maxLength={2} placeholder="UF" />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={create.isPending || update.isPending}>
              {editingId ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
