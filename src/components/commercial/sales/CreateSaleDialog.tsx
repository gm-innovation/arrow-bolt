import { useState } from "react";
import { useStockProducts, StockProduct } from "@/hooks/useStockProducts";
import { useCrmSales } from "@/hooks/useCrmSales";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Plus, Trash2, Search, ShoppingCart } from "lucide-react";

interface SaleItem {
  stock_product_id: string;
  name: string;
  quantity: number;
  unit_value: number;
  markup_percentage: number;
  available: number;
}

interface CreateSaleDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  opportunityId?: string;
  clientId?: string;
  opportunityTitle?: string;
}

const CreateSaleDialog = ({
  open,
  onOpenChange,
  opportunityId,
  clientId,
  opportunityTitle,
}: CreateSaleDialogProps) => {
  const { products } = useStockProducts();
  const { createSale } = useCrmSales();
  const [items, setItems] = useState<SaleItem[]>([]);
  const [notes, setNotes] = useState("");
  const [searchTerm, setSearchTerm] = useState("");

  const activeProducts = products.filter(p => p.is_active && p.current_quantity > 0);
  const filteredProducts = activeProducts.filter(p =>
    p.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    p.external_product_code?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const addItem = (product: StockProduct) => {
    if (items.find(i => i.stock_product_id === product.id)) return;
    setItems(prev => [...prev, {
      stock_product_id: product.id,
      name: product.name,
      quantity: 1,
      unit_value: product.sell_price > 0 ? product.sell_price : product.unit_cost,
      markup_percentage: 0,
      available: Number(product.current_quantity),
    }]);
    setSearchTerm("");
  };

  const removeItem = (productId: string) => {
    setItems(prev => prev.filter(i => i.stock_product_id !== productId));
  };

  const updateItem = (productId: string, field: keyof SaleItem, value: number) => {
    setItems(prev => prev.map(i =>
      i.stock_product_id === productId ? { ...i, [field]: value } : i
    ));
  };

  const calcItemTotal = (item: SaleItem) => {
    const markup = 1 + (item.markup_percentage / 100);
    return item.quantity * item.unit_value * markup;
  };

  const totalAmount = items.reduce((sum, item) => sum + calcItemTotal(item), 0);

  const handleSubmit = () => {
    if (items.length === 0) return;
    createSale.mutate({
      opportunity_id: opportunityId,
      client_id: clientId,
      notes,
      items: items.map(({ available, ...rest }) => rest),
    }, {
      onSuccess: () => {
        setItems([]);
        setNotes("");
        onOpenChange(false);
      }
    });
  };

  const formatCurrency = (v: number) =>
    `R$ ${v.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ShoppingCart className="h-5 w-5" />
            Nova Venda
          </DialogTitle>
          <DialogDescription>
            {opportunityTitle
              ? `Venda vinculada à oportunidade: ${opportunityTitle}`
              : "Selecione produtos do estoque e defina quantidades"}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          {/* Product search */}
          <div className="space-y-2">
            <Label>Adicionar Produto</Label>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Buscar produto no estoque..."
                value={searchTerm}
                onChange={e => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>
            {searchTerm && filteredProducts.length > 0 && (
              <div className="border rounded-md max-h-40 overflow-y-auto">
                {filteredProducts.slice(0, 8).map(p => (
                  <button
                    key={p.id}
                    onClick={() => addItem(p)}
                    disabled={!!items.find(i => i.stock_product_id === p.id)}
                    className="w-full text-left px-3 py-2 hover:bg-muted flex justify-between items-center text-sm disabled:opacity-50"
                  >
                    <span>{p.name} <span className="text-muted-foreground">({p.external_product_code})</span></span>
                    <span className="text-muted-foreground">{Number(p.current_quantity)} {p.unit} | {formatCurrency(p.sell_price > 0 ? p.sell_price : p.unit_cost)}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Items table */}
          {items.length > 0 && (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Produto</TableHead>
                  <TableHead className="w-20">Qtd</TableHead>
                  <TableHead className="w-28">Valor Unit.</TableHead>
                  <TableHead className="w-24">Markup %</TableHead>
                  <TableHead className="text-right w-28">Total</TableHead>
                  <TableHead className="w-10"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {items.map(item => (
                  <TableRow key={item.stock_product_id}>
                    <TableCell>
                      <div>
                        <span className="font-medium">{item.name}</span>
                        <span className="text-xs text-muted-foreground ml-2">
                          (disp: {item.available})
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        min={1}
                        max={item.available}
                        value={item.quantity}
                        onChange={e => updateItem(item.stock_product_id, "quantity", Number(e.target.value))}
                        className="h-8 w-20"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.unit_value}
                        onChange={e => updateItem(item.stock_product_id, "unit_value", Number(e.target.value))}
                        className="h-8 w-28"
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        type="number"
                        step="1"
                        value={item.markup_percentage}
                        onChange={e => updateItem(item.stock_product_id, "markup_percentage", Number(e.target.value))}
                        className="h-8 w-24"
                      />
                    </TableCell>
                    <TableCell className="text-right font-mono">
                      {formatCurrency(calcItemTotal(item))}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => removeItem(item.stock_product_id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}

          {items.length > 0 && (
            <div className="flex justify-end">
              <div className="text-right">
                <span className="text-sm text-muted-foreground">Total da venda: </span>
                <span className="text-lg font-bold">{formatCurrency(totalAmount)}</span>
              </div>
            </div>
          )}

          <div className="space-y-2">
            <Label>Observações</Label>
            <Textarea value={notes} onChange={e => setNotes(e.target.value)} rows={2} placeholder="Notas sobre a venda..." />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={items.length === 0 || createSale.isPending}>
            {createSale.isPending ? "Criando..." : "Confirmar Venda"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default CreateSaleDialog;
