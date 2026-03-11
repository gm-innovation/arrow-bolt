import { useState, useEffect, useRef } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Plus, Pencil, Trash2, Star } from "lucide-react";
import { useClientLegalEntities } from "@/hooks/useClientLegalEntities";
import { Skeleton } from "@/components/ui/skeleton";

interface Props {
  clientId: string | null;
  legacyCnpj?: string | null;
  clientName?: string;
}

interface FormData {
  legal_name: string;
  cnpj: string;
}

const emptyForm: FormData = { legal_name: "", cnpj: "" };

export const LegalEntitiesSection = ({ clientId, legacyCnpj, clientName }: Props) => {
  const { entities, isLoading, create, update, remove } = useClientLegalEntities(clientId);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [form, setForm] = useState<FormData>(emptyForm);
  const migratedRef = useRef(false);

  // Auto-migrate legacy CNPJ to sub-table
  useEffect(() => {
    if (!clientId || isLoading || migratedRef.current) return;
    if (entities.length === 0 && legacyCnpj) {
      migratedRef.current = true;
      create.mutate({
        client_id: clientId,
        legal_name: clientName || "Razão Social",
        cnpj: legacyCnpj,
        is_primary: true,
      });
    }
  }, [clientId, isLoading, entities.length, legacyCnpj]);

  if (!clientId) return <p className="text-sm text-muted-foreground">Salve a empresa primeiro.</p>;
  if (isLoading) return <Skeleton className="h-20 w-full" />;

  const openAdd = () => { setEditingId(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (e: any) => { setEditingId(e.id); setForm({ legal_name: e.legal_name, cnpj: e.cnpj || "" }); setDialogOpen(true); };

  const handleSave = async () => {
    if (!form.legal_name.trim()) return;
    if (editingId) {
      await update.mutateAsync({ id: editingId, legal_name: form.legal_name.trim(), cnpj: form.cnpj.trim() || null } as any);
    } else {
      await create.mutateAsync({ client_id: clientId!, legal_name: form.legal_name.trim(), cnpj: form.cnpj.trim() || undefined, is_primary: entities.length === 0 });
    }
    setDialogOpen(false);
  };

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <Label className="text-sm font-semibold">Razões Sociais / CNPJs</Label>
        <Button variant="outline" size="sm" onClick={openAdd}><Plus className="h-3 w-3 mr-1" /> Adicionar</Button>
      </div>

      {entities.length === 0 && <p className="text-sm text-muted-foreground">Nenhuma razão social cadastrada.</p>}

      {entities.map((e) => (
        <Card key={e.id}>
          <CardContent className="p-3 flex items-center justify-between">
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium text-sm">{e.legal_name}</span>
                {e.is_primary && <Badge variant="secondary" className="text-xs"><Star className="h-3 w-3 mr-1 fill-current" />Principal</Badge>}
              </div>
              {e.cnpj && <p className="text-xs text-muted-foreground">{e.cnpj}</p>}
            </div>
            <div className="flex gap-1">
              <Button variant="ghost" size="icon" onClick={() => openEdit(e)}><Pencil className="h-3 w-3" /></Button>
              <Button variant="ghost" size="icon" onClick={() => remove.mutate(e.id)}><Trash2 className="h-3 w-3 text-destructive" /></Button>
            </div>
          </CardContent>
        </Card>
      ))}

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>{editingId ? "Editar" : "Nova"} Razão Social</DialogTitle></DialogHeader>
          <div className="space-y-3">
            <div className="space-y-1">
              <Label>Razão Social *</Label>
              <Input value={form.legal_name} onChange={e => setForm({ ...form, legal_name: e.target.value })} placeholder="Razão social completa" />
            </div>
            <div className="space-y-1">
              <Label>CNPJ</Label>
              <Input value={form.cnpj} onChange={e => setForm({ ...form, cnpj: e.target.value })} placeholder="00.000.000/0000-00" />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.legal_name.trim() || create.isPending || update.isPending}>
              {editingId ? "Salvar" : "Adicionar"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
