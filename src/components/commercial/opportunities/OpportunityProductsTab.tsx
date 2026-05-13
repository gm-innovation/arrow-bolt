import { useState } from "react";
import { useOpportunityProducts } from "@/hooks/useOpportunityProducts";
import { useProducts } from "@/hooks/useProducts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Trash2, Wand2 } from "lucide-react";

const fmt = (v: number | null) =>
  v != null ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v) : "—";

interface Props {
  opportunityId: string;
  onApplyTotal?: (total: number) => void;
}

export const OpportunityProductsTab = ({ opportunityId, onApplyTotal }: Props) => {
  const { items, isLoading, addItem, updateItem, removeItem, total } = useOpportunityProducts(opportunityId);
  const { products } = useProducts();
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState<any>({ product_id: "", quantity: 1, unit_value: "" });

  const handleAdd = () => {
    if (!form.product_id) return;
    const product = (products as any[]).find((p) => p.id === form.product_id);
    addItem.mutate(
      {
        product_id: form.product_id,
        quantity: Number(form.quantity) || 1,
        unit_value: form.unit_value !== "" ? Number(form.unit_value) : (product?.reference_value ?? null),
      },
      {
        onSuccess: () => {
          setForm({ product_id: "", quantity: 1, unit_value: "" });
          setOpen(false);
        },
      }
    );
  };

  return (
    <div className="space-y-4">
      {!open ? (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Adicionar item
        </Button>
      ) : (
        <div className="space-y-3 rounded-md border p-3 bg-muted/30">
          <div className="space-y-1.5">
            <Label className="text-xs">Produto *</Label>
            <Select value={form.product_id} onValueChange={(v) => {
              const p = (products as any[]).find((x) => x.id === v);
              setForm((f: any) => ({ ...f, product_id: v, unit_value: p?.reference_value ?? f.unit_value }));
            }}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {(products as any[]).map((p) => <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Quantidade</Label>
              <Input type="number" min={1} value={form.quantity} onChange={(e) => setForm((f: any) => ({ ...f, quantity: e.target.value }))} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Valor unitário (R$)</Label>
              <Input type="number" step="0.01" value={form.unit_value} onChange={(e) => setForm((f: any) => ({ ...f, unit_value: e.target.value }))} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button size="sm" onClick={handleAdd} disabled={!form.product_id || addItem.isPending}>
              {addItem.isPending ? "Salvando..." : "Adicionar"}
            </Button>
          </div>
        </div>
      )}

      {isLoading ? (
        <div className="h-32 bg-muted animate-pulse rounded" />
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Nenhum item adicionado</p>
      ) : (
        <div className="space-y-2">
          {items.map((it) => (
            <div key={it.id} className="flex items-center gap-2 p-2 rounded-md border bg-card text-sm">
              <div className="flex-1 min-w-0">
                <p className="font-medium truncate">{it.product_name}</p>
                <p className="text-xs text-muted-foreground">
                  {it.quantity} × {fmt(it.unit_value)} = <span className="font-medium text-foreground">{fmt(it.total_value)}</span>
                </p>
              </div>
              <Input
                type="number"
                min={1}
                value={it.quantity}
                onChange={(e) => updateItem.mutate({ id: it.id, quantity: Number(e.target.value) || 1 })}
                className="w-20 h-8"
              />
              <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeItem.mutate(it.id)}>
                <Trash2 className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
          ))}
          <div className="flex items-center justify-between pt-3 border-t">
            <span className="text-sm font-semibold">Total: {fmt(total)}</span>
            {onApplyTotal && (
              <Button variant="outline" size="sm" onClick={() => onApplyTotal(total)}>
                <Wand2 className="h-4 w-4 mr-2" /> Aplicar como valor estimado
              </Button>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
