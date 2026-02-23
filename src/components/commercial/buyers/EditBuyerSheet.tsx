import { useState, useEffect } from "react";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Mail, Phone } from "lucide-react";
import { format } from "date-fns";

const influenceLabels: Record<string, string> = {
  decisor: "Decisor",
  influenciador: "Influenciador",
  usuario: "Usuário",
};

const influenceColors: Record<string, string> = {
  decisor: "bg-purple-100 text-purple-800",
  influenciador: "bg-blue-100 text-blue-800",
  usuario: "bg-gray-100 text-gray-800",
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  buyer: Record<string, any> | null;
  onSave: (data: Record<string, any>) => void;
  onDelete: (id: string) => void;
  isLoading?: boolean;
}

export const EditBuyerSheet = ({ open, onOpenChange, buyer, onSave, onDelete, isLoading }: Props) => {
  const [form, setForm] = useState<Record<string, any>>({});

  useEffect(() => {
    if (open && buyer) {
      setForm({ ...buyer });
    }
  }, [open, buyer]);

  if (!buyer) return null;

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const handleSave = () => {
    if (!form.name) return;
    onSave({
      id: buyer.id,
      name: form.name,
      role: form.role || null,
      email: form.email || null,
      phone: form.phone || null,
      influence_level: form.influence_level || null,
      is_active: form.is_active ?? true,
      is_primary: form.is_primary ?? false,
      notes: form.notes || null,
    });
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Editar Comprador</SheetTitle>
          <SheetDescription>Atualize as informações do comprador.</SheetDescription>
        </SheetHeader>

        {/* Header badges */}
        <div className="flex flex-wrap gap-2 mt-4">
          {buyer.influence_level && (
            <Badge variant="secondary" className={influenceColors[buyer.influence_level] || ""}>
              {influenceLabels[buyer.influence_level] || buyer.influence_level}
            </Badge>
          )}
          <Badge variant="outline">{buyer.client_name}</Badge>
        </div>

        <Separator className="my-4" />

        {/* Informações Pessoais */}
        <div className="space-y-4">
          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Informações Pessoais</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome Completo *</Label>
              <Input value={form.name || ""} onChange={e => set("name", e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label>Cargo</Label>
              <Input value={form.role || ""} onChange={e => set("role", e.target.value)} />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>E-mail</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={form.email || ""} onChange={e => set("email", e.target.value)} className="pl-9" type="email" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Telefone</Label>
              <div className="relative">
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input value={form.phone || ""} onChange={e => set("phone", e.target.value)} className="pl-9" />
              </div>
            </div>
          </div>
        </div>

        <Separator className="my-4" />

        {/* Configurações */}
        <div className="space-y-4">
          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Configurações</h4>
          <div className="space-y-2">
            <Label>Nível de Influência</Label>
            <Select value={form.influence_level || ""} onValueChange={v => set("influence_level", v)}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {Object.entries(influenceLabels).map(([k, v]) => (
                  <SelectItem key={k} value={k}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="flex gap-6">
            <div className="flex items-center gap-2">
              <Checkbox
                id="is_active"
                checked={form.is_active ?? true}
                onCheckedChange={v => set("is_active", v)}
              />
              <Label htmlFor="is_active" className="cursor-pointer">Ativo</Label>
            </div>
            <div className="flex items-center gap-2">
              <Checkbox
                id="is_primary"
                checked={form.is_primary ?? false}
                onCheckedChange={v => set("is_primary", v)}
              />
              <Label htmlFor="is_primary" className="cursor-pointer">Contato Principal</Label>
            </div>
          </div>
        </div>

        <Separator className="my-4" />

        {/* Observações */}
        <div className="space-y-4">
          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Observações</h4>
          <Textarea
            value={form.notes || ""}
            onChange={e => set("notes", e.target.value)}
            rows={3}
            placeholder="Notas internas sobre o comprador..."
          />
        </div>

        <Separator className="my-4" />

        {/* Informações do Sistema */}
        <div className="space-y-4">
          <h4 className="font-semibold text-sm text-muted-foreground uppercase tracking-wide">Informações do Sistema</h4>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">Cadastrado em</Label>
              <p className="text-sm">{buyer.created_at ? format(new Date(buyer.created_at), "dd/MM/yyyy") : "—"}</p>
            </div>
            <div className="space-y-1">
              <Label className="text-muted-foreground text-xs">Última atualização</Label>
              <p className="text-sm">{buyer.updated_at ? format(new Date(buyer.updated_at), "dd/MM/yyyy") : "—"}</p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between mt-6 pt-4 border-t">
          <Button variant="destructive" size="sm" onClick={() => { onDelete(buyer.id); onOpenChange(false); }}>
            <Trash2 className="h-4 w-4 mr-2" /> Excluir Comprador
          </Button>
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.name || isLoading}>
              {isLoading ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};
