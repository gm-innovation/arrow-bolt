import { useState } from "react";
import { useStockProducts, StockProduct } from "@/hooks/useStockProducts";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Plus, Search, Edit, Trash2, Package, ArrowUpDown, AlertTriangle } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";

const Products = () => {
  const { products, isLoading, createProduct, updateProduct, deleteProduct } = useStockProducts();
  const [search, setSearch] = useState("");
  const [filterActive, setFilterActive] = useState("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<StockProduct | null>(null);
  const [form, setForm] = useState<Record<string, any>>({});
  const [sortKey, setSortKey] = useState<string>("name");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");

  const set = (k: string, v: any) => setForm(p => ({ ...p, [k]: v }));

  const openNew = () => {
    setEditingProduct(null);
    setForm({ is_active: true, unit: "un", current_quantity: 0, min_quantity: 0, unit_cost: 0, sell_price: 0 });
    setDialogOpen(true);
  };

  const openEdit = (p: StockProduct) => {
    setEditingProduct(p);
    setForm(p);
    setDialogOpen(true);
  };

  const handleSave = () => {
    if (!form.name) return;
    const payload = {
      name: form.name,
      category: form.category || null,
      unit: form.unit || "un",
      current_quantity: Number(form.current_quantity) || 0,
      min_quantity: Number(form.min_quantity) || 0,
      unit_cost: Number(form.unit_cost) || 0,
      sell_price: Number(form.sell_price) || 0,
      is_active: form.is_active ?? true,
      external_product_code: form.external_product_code || null,
    };
    if (editingProduct) {
      updateProduct.mutate({ id: editingProduct.id, ...payload });
    } else {
      createProduct.mutate(payload);
    }
    setDialogOpen(false);
  };

  const toggleSort = (key: string) => {
    if (sortKey === key) setSortDir(d => d === "asc" ? "desc" : "asc");
    else { setSortKey(key); setSortDir("asc"); }
  };

  const filtered = products
    .filter((p) => {
      const matchSearch = p.name?.toLowerCase().includes(search.toLowerCase()) ||
        p.external_product_code?.toLowerCase().includes(search.toLowerCase()) ||
        p.category?.toLowerCase().includes(search.toLowerCase());
      const matchActive = filterActive === "all" || (filterActive === "active" ? p.is_active : !p.is_active);
      return matchSearch && matchActive;
    })
    .sort((a: any, b: any) => {
      const av = a[sortKey] ?? "";
      const bv = b[sortKey] ?? "";
      const cmp = typeof av === "number" ? av - bv : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });

  const SortIcon = ({ column }: { column: string }) => (
    <ArrowUpDown className={`h-3 w-3 ml-1 inline cursor-pointer ${sortKey === column ? "text-primary" : "text-muted-foreground"}`} onClick={() => toggleSort(column)} />
  );

  const formatCurrency = (value: number) =>
    `R$ ${Number(value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}`;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Catálogo de Estoque</h2>
        <Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Novo Produto</Button>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar por nome, código ou categoria..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
            </div>
            <Select value={filterActive} onValueChange={setFilterActive}>
              <SelectTrigger className="w-[180px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="active">Ativos</SelectItem>
                <SelectItem value="inactive">Inativos</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum produto encontrado</p>
              <p className="text-sm mt-1">Produtos são importados automaticamente do Eva ou podem ser adicionados manualmente.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Código</TableHead>
                  <TableHead>Nome <SortIcon column="name" /></TableHead>
                  <TableHead className="hidden md:table-cell">Categoria <SortIcon column="category" /></TableHead>
                  <TableHead className="text-right">Qtd <SortIcon column="current_quantity" /></TableHead>
                  <TableHead className="text-right hidden md:table-cell">Custo <SortIcon column="unit_cost" /></TableHead>
                  <TableHead className="text-right">Preço Venda <SortIcon column="sell_price" /></TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-mono text-xs text-muted-foreground">
                      {p.external_product_code || "-"}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        {p.name}
                        {p.current_quantity <= p.min_quantity && p.current_quantity > 0 && (
                          <AlertTriangle className="h-3.5 w-3.5 text-yellow-500" title="Estoque baixo" />
                        )}
                        {p.current_quantity <= 0 && (
                          <AlertTriangle className="h-3.5 w-3.5 text-destructive" title="Sem estoque" />
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">{p.category || "-"}</TableCell>
                    <TableCell className="text-right font-mono">
                      {Number(p.current_quantity)} {p.unit}
                    </TableCell>
                    <TableCell className="text-right hidden md:table-cell">{formatCurrency(p.unit_cost)}</TableCell>
                    <TableCell className="text-right">{p.sell_price > 0 ? formatCurrency(p.sell_price) : "-"}</TableCell>
                    <TableCell>
                      <Badge variant={p.is_active ? "default" : "outline"}>{p.is_active ? "Ativo" : "Inativo"}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Edit className="h-4 w-4" /></Button>
                      <Button variant="ghost" size="icon" onClick={() => deleteProduct.mutate(p.id)}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editingProduct ? "Editar Produto" : "Novo Produto"}</DialogTitle>
            <DialogDescription>
              {editingProduct ? "Atualize os dados do produto no estoque" : "Adicione um novo produto ao catálogo de estoque"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={form.name || ""} onChange={e => set("name", e.target.value)} placeholder="Nome do produto" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Código Externo</Label>
                <Input value={form.external_product_code || ""} onChange={e => set("external_product_code", e.target.value)} placeholder="Código Eva" />
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Input value={form.category || ""} onChange={e => set("category", e.target.value)} placeholder="Ex: Eletrônica" />
              </div>
            </div>
            <div className="grid grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Unidade</Label>
                <Select value={form.unit || "un"} onValueChange={v => set("unit", v)}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="un">un</SelectItem>
                    <SelectItem value="kg">kg</SelectItem>
                    <SelectItem value="m">m</SelectItem>
                    <SelectItem value="l">L</SelectItem>
                    <SelectItem value="pç">pç</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Qtd em Estoque</Label>
                <Input type="number" value={form.current_quantity ?? 0} onChange={e => set("current_quantity", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Qtd Mínima</Label>
                <Input type="number" value={form.min_quantity ?? 0} onChange={e => set("min_quantity", e.target.value)} />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Custo Unitário (R$)</Label>
                <Input type="number" step="0.01" value={form.unit_cost ?? 0} onChange={e => set("unit_cost", e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Preço de Venda (R$)</Label>
                <Input type="number" step="0.01" value={form.sell_price ?? 0} onChange={e => set("sell_price", e.target.value)} />
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Switch checked={form.is_active ?? true} onCheckedChange={v => set("is_active", v)} />
              <Label>Ativo no catálogo</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button>
            <Button onClick={handleSave} disabled={!form.name}>
              {editingProduct ? "Salvar Alterações" : "Criar Produto"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Products;
