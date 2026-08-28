import { useEffect, useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { AlertTriangle, Loader2, MoreHorizontal, Pencil, Plus, Star, Trash2, Upload } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  ASSET_CATEGORIES,
  categoryLabel,
  uploadAssetFile,
  useDeleteDesignAsset,
  useMarinaDesignAssets,
  useSaveDesignAsset,
  type MarinaDesignAsset,
} from "@/hooks/useMarinaDesignAssets";

const EDIT_ROLES = ["marketing", "commercial", "director", "super_admin"];

/** Pistas para avisar quando a categoria escolhida parece incoerente. */
const CATEGORY_HINTS: Array<{ category: string; re: RegExp }> = [
  { category: "equipamentos", re: /starlink|antena|radar|r[aá]dio|furuno|icom|sensor|equipamento|instrumento|gps|sonda/i },
  { category: "equipe_epi", re: /capacete|epi|luva|macac[ãa]o|bota|[oó]culos|talabarte|cinto|t[eé]cnic|equipe/i },
  { category: "embarcacoes", re: /embarca|navio|psv|osv|barco|casco|plataforma|rebocador/i },
  { category: "marca", re: /logo|marca|assinatura|brand/i },
  { category: "ambientes", re: /laborat[oó]rio|bancada|oficina|deck|praça de m[aá]quinas|ponte de comando/i },
];

function suggestCategory(texto: string): string | null {
  const hit = CATEGORY_HINTS.find((h) => h.re.test(texto));
  return hit?.category ?? null;
}

interface FormState {
  id?: string;
  category: string;
  name: string;
  description: string;
  tags: string;
  is_default: boolean;
}

const EMPTY_FORM: FormState = {
  category: ASSET_CATEGORIES[0].value,
  name: "",
  description: "",
  tags: "",
  is_default: false,
};

interface Props {
  /** Permite escolher assets como referência de um pedido de peça. */
  onUseAsReference?: (assets: MarinaDesignAsset[]) => void;
}

export function DesignAssetsPanel({ onUseAsReference }: Props) {
  const { userRole } = useAuth();
  const canEdit = EDIT_ROLES.includes(userRole ?? "");
  const { data: assets, isLoading } = useMarinaDesignAssets();
  const save = useSaveDesignAsset();
  const remove = useDeleteDesignAsset();

  const [filtro, setFiltro] = useState<string>("todos");
  const [busca, setBusca] = useState("");
  const [selecionados, setSelecionados] = useState<string[]>([]);

  const [aberto, setAberto] = useState(false);
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [previa, setPrevia] = useState<string | null>(null);
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!arquivo) return;
    const url = URL.createObjectURL(arquivo);
    setPrevia(url);
    return () => URL.revokeObjectURL(url);
  }, [arquivo]);

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (assets ?? []).filter((a) => {
      if (filtro !== "todos" && a.category !== filtro) return false;
      if (!termo) return true;
      return [a.name, a.description ?? "", (a.tags ?? []).join(" ")].join(" ").toLowerCase().includes(termo);
    });
  }, [assets, filtro, busca]);

  const sugestao = useMemo(() => {
    const texto = [form.name, form.description, form.tags].join(" ");
    const s = suggestCategory(texto);
    return s && s !== form.category ? s : null;
  }, [form.name, form.description, form.tags, form.category]);

  const abrirNovo = () => {
    setForm({ ...EMPTY_FORM, category: filtro !== "todos" ? filtro : EMPTY_FORM.category });
    setArquivo(null);
    setPrevia(null);
    setAberto(true);
  };

  const abrirEdicao = (a: MarinaDesignAsset) => {
    setForm({
      id: a.id,
      category: a.category,
      name: a.name,
      description: a.description ?? "",
      tags: (a.tags ?? []).join(", "),
      is_default: a.is_default,
    });
    setArquivo(null);
    setPrevia(a.file_url);
    setAberto(true);
  };

  const salvar = async () => {
    if (!form.id && !arquivo) {
      toast({ title: "Escolha uma imagem para o asset", variant: "destructive" });
      return;
    }
    setSalvando(true);
    try {
      const storage_path = arquivo ? await uploadAssetFile(arquivo) : undefined;
      await save.mutateAsync({
        id: form.id,
        category: form.category,
        name: (form.name.trim() || arquivo?.name.replace(/\.[^.]+$/, "") || "Asset").slice(0, 120),
        description: form.description.trim() || undefined,
        tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
        is_default: form.is_default,
        ...(storage_path ? { storage_path } : {}),
      });
      toast({ title: form.id ? "Asset atualizado" : "Asset guardado na biblioteca" });
      setAberto(false);
    } catch (e) {
      toast({ title: "Não deu para salvar", description: (e as Error).message, variant: "destructive" });
    } finally {
      setSalvando(false);
    }
  };

  const alternarPadrao = async (asset: MarinaDesignAsset) => {
    try {
      await save.mutateAsync({
        id: asset.id,
        category: asset.category,
        name: asset.name,
        description: asset.description ?? undefined,
        tags: asset.tags ?? [],
        is_default: !asset.is_default,
      });
    } catch (e) {
      toast({ title: "Não deu para alterar", description: (e as Error).message, variant: "destructive" });
    }
  };

  const excluir = async (asset: MarinaDesignAsset) => {
    try {
      await remove.mutateAsync(asset.id);
      setSelecionados((s) => s.filter((id) => id !== asset.id));
    } catch (e) {
      toast({ title: "Não deu para excluir", description: (e as Error).message, variant: "destructive" });
    }
  };

  const usarSelecionados = () => {
    const escolhidos = (assets ?? []).filter((a) => selecionados.includes(a.id) && a.file_url);
    if (!escolhidos.length) return;
    onUseAsReference?.(escolhidos);
    setSelecionados([]);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Select value={filtro} onValueChange={setFiltro}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="todos">Todas as categorias</SelectItem>
            {ASSET_CATEGORIES.map((c) => (
              <SelectItem key={c.value} value={c.value}>
                {c.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          value={busca}
          onChange={(e) => setBusca(e.target.value)}
          placeholder="Buscar por nome, descrição ou etiqueta"
          className="max-w-xs"
        />
        {onUseAsReference && selecionados.length > 0 && (
          <Button size="sm" variant="secondary" onClick={usarSelecionados}>
            Usar {selecionados.length} como referência
          </Button>
        )}
        {canEdit && (
          <Button size="sm" className="ml-auto" onClick={abrirNovo}>
            <Plus className="mr-2 h-4 w-4" /> Novo asset
          </Button>
        )}
      </div>

      {isLoading ? (
        <p className="text-sm text-muted-foreground">Carregando biblioteca…</p>
      ) : lista.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          Nenhum asset guardado ainda. Suba as fotos que vocês usam sempre: embarcações de apoio offshore, equipamentos,
          equipe com EPI e logos.
        </p>
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {lista.map((a) => {
            const marcado = selecionados.includes(a.id);
            return (
              <Card key={a.id} className={`overflow-hidden ${marcado ? "ring-2 ring-primary" : ""}`}>
                <button
                  type="button"
                  className="block w-full"
                  onClick={() =>
                    onUseAsReference &&
                    setSelecionados((s) => (s.includes(a.id) ? s.filter((x) => x !== a.id) : [...s, a.id]))
                  }
                >
                  {a.file_url ? (
                    <img src={a.file_url} alt={a.name} className="h-40 w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-40 items-center justify-center bg-muted text-xs text-muted-foreground">
                      Imagem indisponível
                    </div>
                  )}
                </button>
                <div className="flex items-start gap-2 p-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-medium">{a.name}</p>
                    <p className="text-xs text-muted-foreground">{categoryLabel(a.category)}</p>
                  </div>
                  {a.is_default && (
                    <Badge variant="secondary" className="gap-1">
                      <Star className="h-3 w-3" /> Padrão
                    </Badge>
                  )}
                  {canEdit && (
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button size="icon" variant="ghost" className="h-7 w-7" aria-label={`Ações de ${a.name}`}>
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => abrirEdicao(a)}>
                          <Pencil className="mr-2 h-4 w-4" /> Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => void alternarPadrao(a)}>
                          <Star className="mr-2 h-4 w-4" />
                          {a.is_default ? "Remover padrão" : "Definir como padrão"}
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => void excluir(a)}>
                          <Trash2 className="mr-2 h-4 w-4" /> Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}

      <Dialog open={aberto} onOpenChange={setAberto}>
        <DialogContent className="max-h-[85vh] overflow-y-auto sm:max-w-lg">
          <DialogHeader>
            <DialogTitle>{form.id ? "Editar asset" : "Novo asset"}</DialogTitle>
            <DialogDescription>
              Imagens de referência que a Marina usa para manter fidelidade ao equipamento, à embarcação e ao uniforme.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Imagem</Label>
              <div className="relative flex h-40 items-center justify-center overflow-hidden rounded-md border border-dashed border-border bg-muted/40">
                {previa ? (
                  <img src={previa} alt="Prévia do asset" className="h-full w-full object-contain" />
                ) : (
                  <span className="flex items-center gap-2 text-sm text-muted-foreground">
                    <Upload className="h-4 w-4" /> Arraste ou clique para escolher
                  </span>
                )}
                <input
                  type="file"
                  accept="image/*"
                  className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                  onChange={(e) => setArquivo(e.target.files?.[0] ?? null)}
                />
              </div>
              {form.id && <p className="text-xs text-muted-foreground">Escolha um arquivo só se quiser trocar a imagem.</p>}
            </div>

            <div className="space-y-1">
              <Label>Nome</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="Ex.: Antena Starlink Maritime"
              />
            </div>

            <div className="space-y-1">
              <Label>Categoria</Label>
              <Select value={form.category} onValueChange={(v) => setForm((f) => ({ ...f, category: v }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ASSET_CATEGORIES.map((c) => (
                    <SelectItem key={c.value} value={c.value}>
                      {c.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {sugestao && (
                <button
                  type="button"
                  onClick={() => setForm((f) => ({ ...f, category: sugestao }))}
                  className="flex items-start gap-2 rounded-md bg-muted p-2 text-left text-xs text-muted-foreground"
                >
                  <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0 text-amber-500" />
                  <span>
                    Pelo nome, esse asset parece ser de <strong>{categoryLabel(sugestao)}</strong>. Clique para trocar.
                  </span>
                </button>
              )}
            </div>

            <div className="space-y-1">
              <Label>Descrição (opcional)</Label>
              <Textarea
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                placeholder="O que essa imagem mostra e quando usar"
                rows={2}
              />
            </div>

            <div className="space-y-1">
              <Label>Etiquetas (separadas por vírgula)</Label>
              <Input
                value={form.tags}
                onChange={(e) => setForm((f) => ({ ...f, tags: e.target.value }))}
                placeholder="starlink, antena, marítima"
              />
            </div>

            <label className="flex items-start gap-2 text-sm">
              <Checkbox
                checked={form.is_default}
                onCheckedChange={(v) => setForm((f) => ({ ...f, is_default: v === true }))}
              />
              <span>
                Usar como referência padrão
                <span className="block text-xs text-muted-foreground">
                  Entra automaticamente quando o pedido falar desse tema.
                </span>
              </span>
            </label>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setAberto(false)} disabled={salvando}>
              Cancelar
            </Button>
            <Button onClick={() => void salvar()} disabled={salvando}>
              {salvando && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Salvar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
