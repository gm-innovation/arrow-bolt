import { useMemo, useState } from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  BookCheck,
  Check,
  ChevronsUpDown,
  Pencil,
  Plus,
  Search,
  Trash2,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import {
  CatalogInput,
  HRDocumentCatalogItem,
  useHRDocumentCatalog,
  useHRPositions,
} from "@/hooks/useHRDocumentCatalog";

const CATEGORIES: { value: string; label: string }[] = [
  { value: "identificacao", label: "Identificação" },
  { value: "saude", label: "Saúde" },
  { value: "seguranca", label: "Segurança" },
  { value: "habilitacao", label: "Habilitação" },
  { value: "fiscal", label: "Fiscal" },
  { value: "contrato", label: "Contrato" },
  { value: "outro", label: "Outro" },
];
const RESPONSIBLES: Record<string, string> = {
  hr: "RH",
  direct_manager: "Gestor direto",
  both: "RH e Gestor",
};

const emptyInput = (): CatalogInput => ({
  name: "",
  code: "",
  description: "",
  category: "outro",
  is_required: true,
  has_expiry: false,
  default_validity_months: null,
  renewal_warning_days: 30,
  responsible_role: "hr",
  applies_to_all: false,
  is_active: true,
  positions: [],
});

export const DocumentCatalog = () => {
  const { data: items, isLoading, create, update, remove } = useHRDocumentCatalog();
  const { data: positions = [] } = useHRPositions();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<HRDocumentCatalogItem | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<HRDocumentCatalogItem | null>(null);

  const filtered = useMemo(() => {
    const list = items ?? [];
    return list.filter((it) => {
      if (categoryFilter !== "all" && it.category !== categoryFilter) return false;
      if (!search.trim()) return true;
      const q = search.toLowerCase();
      return (
        it.name.toLowerCase().includes(q) ||
        (it.code ?? "").toLowerCase().includes(q) ||
        it.positions.some((p) => p.toLowerCase().includes(q))
      );
    });
  }, [items, search, categoryFilter]);

  const openNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };
  const openEdit = (it: HRDocumentCatalogItem) => {
    setEditing(it);
    setDialogOpen(true);
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-3 flex-wrap">
          <div className="flex items-start gap-3">
            <div className="rounded-md bg-primary/10 p-2">
              <BookCheck className="h-5 w-5 text-primary" />
            </div>
            <div>
              <CardTitle>Catálogo de Documentos Obrigatórios</CardTitle>
              <CardDescription>
                Defina, uma única vez, quais documentos cada cargo precisa ter — com validade,
                renovação e responsável pelo controle.
              </CardDescription>
            </div>
          </div>
          <Button onClick={openNew} className="gap-2">
            <Plus className="h-4 w-4" /> Novo documento
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="flex flex-col sm:flex-row gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar por nome, código ou cargo..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9"
            />
          </div>
          <Select value={categoryFilter} onValueChange={setCategoryFilter}>
            <SelectTrigger className="w-full sm:w-[200px]">
              <SelectValue placeholder="Categoria" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Todas categorias</SelectItem>
              {CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead>Categoria</TableHead>
                <TableHead>Aplicável a</TableHead>
                <TableHead>Validade</TableHead>
                <TableHead>Aviso</TableHead>
                <TableHead>Responsável</TableHead>
                <TableHead className="w-[100px]">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading ? (
                Array.from({ length: 4 }).map((_, i) => (
                  <TableRow key={i}>
                    <TableCell colSpan={7}>
                      <Skeleton className="h-8 w-full" />
                    </TableCell>
                  </TableRow>
                ))
              ) : filtered.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    Nenhum documento no catálogo. Clique em "Novo documento" para começar.
                  </TableCell>
                </TableRow>
              ) : (
                filtered.map((it) => (
                  <TableRow key={it.id}>
                    <TableCell>
                      <div className="font-medium">{it.name}</div>
                      {it.code && (
                        <div className="text-xs text-muted-foreground font-mono">{it.code}</div>
                      )}
                      {it.is_required && (
                        <Badge variant="secondary" className="mt-1">
                          Obrigatório
                        </Badge>
                      )}
                    </TableCell>
                    <TableCell>
                      <Badge variant="outline">
                        {CATEGORIES.find((c) => c.value === it.category)?.label ?? it.category}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      {it.applies_to_all ? (
                        <Badge>Todos os cargos</Badge>
                      ) : it.positions.length === 0 ? (
                        <Badge variant="outline" className="text-muted-foreground">
                          Não configurado
                        </Badge>
                      ) : (
                        <div className="flex flex-wrap gap-1 max-w-[260px]">
                          {it.positions.map((p) => (
                            <Badge key={p} variant="secondary">
                              {p}
                            </Badge>
                          ))}
                        </div>
                      )}
                    </TableCell>
                    <TableCell className="text-sm">
                      {it.has_expiry
                        ? it.default_validity_months
                          ? `${it.default_validity_months} meses`
                          : "Sim"
                        : "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {it.has_expiry ? `${it.renewal_warning_days} dias antes` : "—"}
                    </TableCell>
                    <TableCell className="text-sm">
                      {RESPONSIBLES[it.responsible_role] ?? it.responsible_role}
                    </TableCell>
                    <TableCell>
                      <div className="flex gap-1">
                        <Button size="icon" variant="ghost" onClick={() => openEdit(it)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setConfirmDelete(it)}
                        >
                          <Trash2 className="h-4 w-4 text-destructive" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>

      <CatalogDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        editing={editing}
        positions={positions}
        onSubmit={async (input) => {
          if (editing) {
            await update.mutateAsync({ id: editing.id, input });
          } else {
            await create.mutateAsync(input);
          }
          setDialogOpen(false);
        }}
        isSaving={create.isPending || update.isPending}
      />

      <AlertDialog open={!!confirmDelete} onOpenChange={(o) => !o && setConfirmDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remover do catálogo?</AlertDialogTitle>
            <AlertDialogDescription>
              "{confirmDelete?.name}" será removido. Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirmDelete) remove.mutate(confirmDelete.id);
                setConfirmDelete(null);
              }}
            >
              Remover
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </Card>
  );
};

interface CatalogDialogProps {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  editing: HRDocumentCatalogItem | null;
  positions: string[];
  onSubmit: (input: CatalogInput) => Promise<void>;
  isSaving: boolean;
}

const CatalogDialog = ({
  open,
  onOpenChange,
  editing,
  positions,
  onSubmit,
  isSaving,
}: CatalogDialogProps) => {
  const [form, setForm] = useState<CatalogInput>(emptyInput());
  const [posOpen, setPosOpen] = useState(false);
  const [newPos, setNewPos] = useState("");

  // sync form when opening
  useMemo(() => {
    if (open) {
      if (editing) {
        setForm({
          name: editing.name,
          code: editing.code ?? "",
          description: editing.description ?? "",
          category: editing.category,
          is_required: editing.is_required,
          has_expiry: editing.has_expiry,
          default_validity_months: editing.default_validity_months,
          renewal_warning_days: editing.renewal_warning_days,
          responsible_role: editing.responsible_role,
          applies_to_all: editing.applies_to_all,
          is_active: editing.is_active,
          positions: editing.positions,
        });
      } else {
        setForm(emptyInput());
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editing?.id]);

  const togglePosition = (p: string) => {
    setForm((f) => ({
      ...f,
      positions: f.positions.includes(p)
        ? f.positions.filter((x) => x !== p)
        : [...f.positions, p],
    }));
  };

  const addCustomPosition = () => {
    const v = newPos.trim();
    if (!v) return;
    if (!form.positions.includes(v)) {
      setForm((f) => ({ ...f, positions: [...f.positions, v] }));
    }
    setNewPos("");
  };

  const canSave =
    form.name.trim().length >= 2 &&
    (form.applies_to_all || form.positions.length > 0) &&
    (!form.has_expiry || (form.default_validity_months ?? 0) > 0);

  const allOptions = useMemo(() => {
    const set = new Set([...positions, ...form.positions]);
    return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [positions, form.positions]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{editing ? "Editar documento" : "Novo documento do catálogo"}</DialogTitle>
          <DialogDescription>
            Defina os atributos do documento e a quais cargos ele se aplica.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-2">
              <Label>Nome *</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="Ex: ASO Admissional"
              />
            </div>
            <div>
              <Label>Código</Label>
              <Input
                value={form.code ?? ""}
                onChange={(e) => setForm({ ...form, code: e.target.value })}
                placeholder="Opcional"
              />
            </div>
          </div>

          <div>
            <Label>Descrição</Label>
            <Textarea
              rows={2}
              value={form.description ?? ""}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
              placeholder="Instruções ou observações para quem entrega"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <Label>Categoria</Label>
              <Select
                value={form.category}
                onValueChange={(v) => setForm({ ...form, category: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Responsável pelo controle</Label>
              <Select
                value={form.responsible_role}
                onValueChange={(v) => setForm({ ...form, responsible_role: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {Object.entries(RESPONSIBLES).map(([k, l]) => (
                    <SelectItem key={k} value={k}>
                      {l}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="rounded-md border p-3 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <Label htmlFor="all-positions">Aplica a todos os cargos</Label>
                <p className="text-xs text-muted-foreground">
                  Quando ativo, ignora a lista de cargos específicos.
                </p>
              </div>
              <Switch
                id="all-positions"
                checked={form.applies_to_all}
                onCheckedChange={(c) =>
                  setForm({ ...form, applies_to_all: c, positions: c ? [] : form.positions })
                }
              />
            </div>

            {!form.applies_to_all && (
              <div className="space-y-2">
                <Label>Cargos aplicáveis *</Label>
                <Popover open={posOpen} onOpenChange={setPosOpen}>
                  <PopoverTrigger asChild>
                    <Button
                      type="button"
                      variant="outline"
                      role="combobox"
                      className="w-full justify-between font-normal"
                    >
                      <span className="truncate text-left">
                        {form.positions.length === 0
                          ? "Selecione cargos..."
                          : `${form.positions.length} cargo(s) selecionado(s)`}
                      </span>
                      <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-[--radix-popover-trigger-width] p-0" align="start">
                    <Command>
                      <CommandInput placeholder="Buscar cargo..." />
                      <CommandList>
                        <CommandEmpty>Nenhum cargo cadastrado.</CommandEmpty>
                        <CommandGroup>
                          {allOptions.map((p) => (
                            <CommandItem
                              key={p}
                              value={p}
                              onSelect={() => togglePosition(p)}
                            >
                              <Check
                                className={cn(
                                  "mr-2 h-4 w-4",
                                  form.positions.includes(p) ? "opacity-100" : "opacity-0",
                                )}
                              />
                              {p}
                            </CommandItem>
                          ))}
                        </CommandGroup>
                      </CommandList>
                    </Command>
                  </PopoverContent>
                </Popover>

                <div className="flex gap-2">
                  <Input
                    placeholder="Adicionar cargo manualmente"
                    value={newPos}
                    onChange={(e) => setNewPos(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addCustomPosition();
                      }
                    }}
                  />
                  <Button type="button" variant="outline" onClick={addCustomPosition}>
                    Adicionar
                  </Button>
                </div>

                {form.positions.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {form.positions.map((p) => (
                      <Badge key={p} variant="secondary" className="gap-1">
                        {p}
                        <button
                          type="button"
                          onClick={() => togglePosition(p)}
                          className="hover:text-destructive"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          <div className="rounded-md border p-3 space-y-3">
            <div className="flex items-center justify-between">
              <Label htmlFor="is_required">Obrigatório</Label>
              <Switch
                id="is_required"
                checked={form.is_required}
                onCheckedChange={(c) => setForm({ ...form, is_required: c })}
              />
            </div>
            <div className="flex items-center justify-between">
              <Label htmlFor="has_expiry">Possui validade</Label>
              <Switch
                id="has_expiry"
                checked={form.has_expiry}
                onCheckedChange={(c) =>
                  setForm({
                    ...form,
                    has_expiry: c,
                    default_validity_months: c ? form.default_validity_months ?? 12 : null,
                  })
                }
              />
            </div>
            {form.has_expiry && (
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>Validade (meses) *</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.default_validity_months ?? ""}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        default_validity_months: e.target.value
                          ? parseInt(e.target.value, 10)
                          : null,
                      })
                    }
                  />
                </div>
                <div>
                  <Label>Alertar (dias antes)</Label>
                  <Input
                    type="number"
                    min={1}
                    value={form.renewal_warning_days}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        renewal_warning_days: parseInt(e.target.value || "30", 10),
                      })
                    }
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex items-center justify-between">
            <Label htmlFor="is_active">Ativo</Label>
            <Switch
              id="is_active"
              checked={form.is_active}
              onCheckedChange={(c) => setForm({ ...form, is_active: c })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancelar
          </Button>
          <Button onClick={() => onSubmit(form)} disabled={!canSave || isSaving}>
            {isSaving ? "Salvando..." : editing ? "Salvar" : "Criar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
