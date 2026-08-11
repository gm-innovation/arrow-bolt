import { useMemo, useState } from "react";
import { useOpportunityProducts } from "@/hooks/useOpportunityProducts";
import { useStockProducts } from "@/hooks/useStockProducts";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { Plus, Trash2, Wand2, ChevronsUpDown, AlertTriangle } from "lucide-react";

const fmt = (v: number | null) =>
  v != null ? new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v) : "—";

interface Props {
  opportunityId: string;
  onApplyTotal?: (total: number) => void;
}

export const OpportunityProductsTab = ({ opportunityId, onApplyTotal }: Props) => {
  const { items, isLoading, addItem, updateItem, removeItem, total, pendingCount } =
    useOpportunityProducts(opportunityId);
  const { products: stockProducts } = useStockProducts();
  const [open, setOpen] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [selectedId, setSelectedId] = useState<string>("");
  const [quantity, setQuantity] = useState<string>("1");
  const [unitValue, setUnitValue] = useState<string>("");

  const selected = useMemo(
    () => stockProducts.find((p) => p.id === selectedId) ?? null,
    [stockProducts, selectedId]
  );

  const reset = () => {
    setSelectedId("");
    setQuantity("1");
    setUnitValue("");
  };

  const handleAdd = () => {
    if (!selected) return;
    addItem.mutate(
      {
        stock_product_id: selected.id,
        item_name: selected.name,
        item_code: selected.external_product_code,
        list_unit_value: Number(selected.sell_price) || null,
        quantity: Number(quantity) || 1,
        unit_value: unitValue !== "" ? Number(unitValue) : Number(selected.sell_price) || null,
      },
      {
        onSuccess: () => {
          reset();
          setOpen(false);
        },
      }
    );
  };

  const discount = (it: (typeof items)[number]) => {
    const list = Number(it.list_unit_value) || 0;
    const negotiated = Number(it.unit_value) || 0;
    if (list <= 0 || negotiated <= 0 || negotiated >= list) return null;
    return Math.round(((list - negotiated) / list) * 100);
  };

  return (
    <div className="space-y-4">
      {!open ? (
        <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
          <Plus className="h-4 w-4 mr-2" /> Adicionar produto do estoque EVA
        </Button>
      ) : (
        <div className="space-y-3 rounded-md border p-3 bg-muted/30">
          <div className="space-y-1.5">
            <Label className="text-xs">Produto (estoque EVA) *</Label>
            <Popover open={pickerOpen} onOpenChange={setPickerOpen}>
              <PopoverTrigger asChild>
                <Button variant="outline" role="combobox" className="w-full justify-between font-normal">
                  <span className="truncate">
                    {selected ? `${selected.external_product_code ?? ""} ${selected.name}`.trim() : "Buscar por nome ou código..."}
                  </span>
                  <ChevronsUpDown className="h-4 w-4 opacity-50 shrink-0" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                <Command>
                  <CommandInput placeholder="Buscar produto..." />
                  <CommandList>
                    <CommandEmpty>
                      Nenhum produto encontrado. Sincronize o catálogo em Produtos.
                    </CommandEmpty>
                    <CommandGroup>
                      {stockProducts.map((p) => (
                        <CommandItem
                          key={p.id}
                          value={`${p.name} ${p.external_product_code ?? ""}`}
                          onSelect={() => {
                            setSelectedId(p.id);
                            setUnitValue(String(Number(p.sell_price) || ""));
                            setPickerOpen(false);
                          }}
                        >
                          <div className="min-w-0">
                            <p className="text-sm truncate">{p.name}</p>
                            <p className="text-xs text-muted-foreground">
                              {p.external_product_code || "sem código"} · {fmt(Number(p.sell_price) || null)} ·{" "}
                              {Number(p.current_quantity)} em estoque
                            </p>
                          </div>
                        </CommandItem>
                      ))}
                    </CommandGroup>
                  </CommandList>
                </Command>
              </PopoverContent>
            </Popover>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-xs">Quantidade</Label>
              <Input type="number" min={1} value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label className="text-xs">Valor unitário negociado (R$)</Label>
              <Input type="number" step="0.01" value={unitValue} onChange={(e) => setUnitValue(e.target.value)} />
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="ghost" size="sm" onClick={() => { reset(); setOpen(false); }}>Cancelar</Button>
            <Button size="sm" onClick={handleAdd} disabled={!selected || addItem.isPending}>
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
          {pendingCount > 0 && (
            <div className="flex items-center gap-2 rounded-md border border-warning/40 bg-warning/10 p-2 text-xs">
              <AlertTriangle className="h-4 w-4 text-warning shrink-0" />
              {pendingCount} {pendingCount === 1 ? "item pedido pelo cliente ainda não foi" : "itens pedidos pelo cliente ainda não foram"} vinculado(s) a um produto do estoque.
            </div>
          )}
          {items.map((it) => {
            const disc = discount(it);
            return (
              <div key={it.id} className="flex items-center gap-2 p-2 rounded-md border bg-card text-sm">
                <div className="flex-1 min-w-0">
                  <p className="font-medium truncate">{it.product_name}</p>
                  <p className="text-xs text-muted-foreground flex flex-wrap items-center gap-1">
                    {it.product_code && <span className="font-mono">{it.product_code}</span>}
                    <span>
                      {it.quantity} × {fmt(it.unit_value)} ={" "}
                      <span className="font-medium text-foreground">{fmt(it.total_value)}</span>
                    </span>
                    {disc != null && <Badge variant="outline">-{disc}%</Badge>}
                    {!it.stock_product_id && !it.product_id && <Badge variant="secondary">Sem vínculo</Badge>}
                  </p>
                </div>
                <Input
                  type="number"
                  min={1}
                  value={it.quantity}
                  onChange={(e) => updateItem.mutate({ id: it.id, quantity: Number(e.target.value) || 1 })}
                  className="w-16 h-8"
                />
                <Input
                  type="number"
                  step="0.01"
                  value={it.unit_value ?? ""}
                  placeholder="valor"
                  onChange={(e) =>
                    updateItem.mutate({ id: it.id, unit_value: e.target.value === "" ? null : Number(e.target.value) })
                  }
                  className="w-24 h-8"
                />
                <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => removeItem.mutate(it.id)}>
                  <Trash2 className="h-4 w-4 text-muted-foreground" />
                </Button>
              </div>
            );
          })}
          <div className="flex items-center justify-between pt-3 border-t">
            <span className="text-sm font-semibold">Total negociado: {fmt(total)}</span>
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
