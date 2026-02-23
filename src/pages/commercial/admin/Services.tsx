import { useProducts } from "@/hooks/useProducts";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Search, Package, Plus, MoreHorizontal, Pencil } from "lucide-react";
import { useState } from "react";

const CATEGORIES = ["manutenção", "inspeção", "calibração", "consultoria", "treinamento", "outro"];

const typeColors: Record<string, string> = {
  service: "bg-blue-100 text-blue-700",
  product: "bg-green-100 text-green-700",
};

const AdminServices = () => {
  const { products, isLoading, createProduct, updateProduct } = useProducts();
  const [search, setSearch] = useState("");
  const [createOpen, setCreateOpen] = useState(false);
  const [editOpen, setEditOpen] = useState(false);
  const [editItem, setEditItem] = useState<any>(null);

  // Create form
  const [name, setName] = useState("");
  const [type, setType] = useState("service");
  const [category, setCategory] = useState("");
  const [leadTime, setLeadTime] = useState("30");
  const [active, setActive] = useState(true);

  // Edit form
  const [eName, setEName] = useState("");
  const [eType, setEType] = useState("service");
  const [eCategory, setECategory] = useState("");
  const [eLeadTime, setELeadTime] = useState("30");
  const [eActive, setEActive] = useState(true);

  const filtered = products.filter((p: any) =>
    p.name?.toLowerCase().includes(search.toLowerCase()) ||
    p.type?.toLowerCase().includes(search.toLowerCase()) ||
    p.category?.toLowerCase().includes(search.toLowerCase())
  );

  const resetCreate = () => {
    setName(""); setType("service"); setCategory(""); setLeadTime("30"); setActive(true);
  };

  const handleCreate = () => {
    if (!name) return;
    createProduct.mutate({ name, type, category: category || null, lead_time_days: parseInt(leadTime) || 30, active }, {
      onSuccess: () => { setCreateOpen(false); resetCreate(); },
    });
  };

  const openEdit = (p: any) => {
    setEditItem(p);
    setEName(p.name); setEType(p.type); setECategory(p.category || ""); setELeadTime(String(p.lead_time_days ?? 30)); setEActive(p.active !== false);
    setEditOpen(true);
  };

  const handleEdit = () => {
    if (!editItem || !eName) return;
    updateProduct.mutate({ id: editItem.id, name: eName, type: eType, category: eCategory || null, lead_time_days: parseInt(eLeadTime) || 30, active: eActive }, {
      onSuccess: () => { setEditOpen(false); setEditItem(null); },
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Serviços e Produtos</h2>
        <Button onClick={() => { resetCreate(); setCreateOpen(true); }} className="gap-2">
          <Plus className="h-4 w-4" /> Novo Serviço
        </Button>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="relative mb-4">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por nome ou tipo..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-9" />
          </div>

          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Package className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhum serviço encontrado</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Serviço</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead className="hidden md:table-cell">Categoria</TableHead>
                  <TableHead className="hidden md:table-cell">Lead Time</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.name}</TableCell>
                    <TableCell>
                      <Badge className={typeColors[p.type] || "bg-muted text-muted-foreground"}>{p.type === "service" ? "Serviço" : "Produto"}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{p.category || "-"}</TableCell>
                    <TableCell className="hidden md:table-cell text-sm">{p.lead_time_days ?? 30} dias</TableCell>
                    <TableCell>
                      <Badge variant={p.active ? "default" : "secondary"}>{p.active ? "Ativo" : "Inativo"}</Badge>
                    </TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => openEdit(p)}>
                            <Pencil className="h-4 w-4 mr-2" /> Editar
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => updateProduct.mutate({ id: p.id, active: !p.active })}>
                            {p.active ? "Desativar" : "Ativar"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Create Dialog */}
      <Dialog open={createOpen} onOpenChange={setCreateOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Novo Serviço / Produto</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="Nome do serviço" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="service">Serviço</SelectItem>
                    <SelectItem value="product">Produto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={category} onValueChange={setCategory}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Lead Time (dias)</Label>
                <Input type="number" value={leadTime} onChange={(e) => setLeadTime(e.target.value)} />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch checked={active} onCheckedChange={setActive} />
                <Label>Ativo</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
            <Button onClick={handleCreate} disabled={createProduct.isPending}>{createProduct.isPending ? "Criando..." : "Criar"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={editOpen} onOpenChange={setEditOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader><DialogTitle>Editar Serviço / Produto</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Nome *</Label>
              <Input value={eName} onChange={(e) => setEName(e.target.value)} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={eType} onValueChange={setEType}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="service">Serviço</SelectItem>
                    <SelectItem value="product">Produto</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Categoria</Label>
                <Select value={eCategory} onValueChange={setECategory}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {CATEGORIES.map(c => <SelectItem key={c} value={c}>{c.charAt(0).toUpperCase() + c.slice(1)}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Lead Time (dias)</Label>
                <Input type="number" value={eLeadTime} onChange={(e) => setELeadTime(e.target.value)} />
              </div>
              <div className="flex items-center gap-3 pt-6">
                <Switch checked={eActive} onCheckedChange={setEActive} />
                <Label>Ativo</Label>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditOpen(false)}>Cancelar</Button>
            <Button onClick={handleEdit} disabled={updateProduct.isPending}>{updateProduct.isPending ? "Salvando..." : "Salvar Alterações"}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminServices;
