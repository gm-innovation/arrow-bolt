import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Star, Trash2, Upload } from "lucide-react";
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
  const fileRef = useRef<HTMLInputElement>(null);

  const [filtro, setFiltro] = useState<string>("todos");
  const [busca, setBusca] = useState("");
  const [uploading, setUploading] = useState(false);
  const [novo, setNovo] = useState({ category: ASSET_CATEGORIES[0].value as string, name: "", description: "", tags: "" });
  const [selecionados, setSelecionados] = useState<string[]>([]);

  const lista = useMemo(() => {
    const termo = busca.trim().toLowerCase();
    return (assets ?? []).filter((a) => {
      if (filtro !== "todos" && a.category !== filtro) return false;
      if (!termo) return true;
      return [a.name, a.description ?? "", (a.tags ?? []).join(" ")].join(" ").toLowerCase().includes(termo);
    });
  }, [assets, filtro, busca]);

  const subir = async (files: FileList | null) => {
    if (!files?.length) return;
    setUploading(true);
    try {
      for (const file of Array.from(files).slice(0, 8)) {
        const path = await uploadAssetFile(file);
        await save.mutateAsync({
          category: novo.category,
          name: (novo.name.trim() || file.name.replace(/\.[^.]+$/, "")).slice(0, 120),
          description: novo.description.trim() || undefined,
          tags: novo.tags
            .split(",")
            .map((t) => t.trim())
            .filter(Boolean),
          storage_path: path,
        });
      }
      setNovo((n) => ({ ...n, name: "", description: "", tags: "" }));
      toast({ title: "Assets guardados na biblioteca" });
    } catch (e) {
      toast({ title: "Não deu para subir", description: (e as Error).message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const alternarPadrao = async (asset: MarinaDesignAsset) => {
    try {
      await save.mutateAsync({ id: asset.id, category: asset.category, name: asset.name, is_default: !asset.is_default });
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
      {canEdit && (
        <Card className="space-y-3 p-4">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label>Categoria</Label>
              <Select value={novo.category} onValueChange={(v) => setNovo((n) => ({ ...n, category: v }))}>
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
            </div>
            <div className="space-y-1">
              <Label>Nome (opcional)</Label>
              <Input
                value={novo.name}
                onChange={(e) => setNovo((n) => ({ ...n, name: e.target.value }))}
                placeholder="Ex.: PSV atendimento offshore"
              />
            </div>
          </div>
          <div className="space-y-1">
            <Label>Descrição (opcional)</Label>
            <Textarea
              value={novo.description}
              onChange={(e) => setNovo((n) => ({ ...n, description: e.target.value }))}
              placeholder="O que essa imagem mostra e quando usar"
              rows={2}
            />
          </div>
          <div className="space-y-1">
            <Label>Etiquetas (separadas por vírgula)</Label>
            <Input
              value={novo.tags}
              onChange={(e) => setNovo((n) => ({ ...n, tags: e.target.value }))}
              placeholder="starlink, antena, marítima"
            />
          </div>
          <div className="relative w-fit">
            <Button type="button" variant="outline" disabled={uploading}>
              {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
              Subir imagens
            </Button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
              onChange={(e) => void subir(e.target.files)}
            />
          </div>
        </Card>
      )}

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
          <Button size="sm" onClick={usarSelecionados}>
            Usar {selecionados.length} como referência
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
                <div className="space-y-2 p-3">
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium">{a.name}</p>
                      <p className="text-xs text-muted-foreground">{categoryLabel(a.category)}</p>
                    </div>
                    {a.is_default && (
                      <Badge variant="secondary" className="gap-1">
                        <Star className="h-3 w-3" /> Padrão
                      </Badge>
                    )}
                  </div>
                  {a.description && <p className="line-clamp-2 text-xs text-muted-foreground">{a.description}</p>}
                  {(a.tags ?? []).length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {(a.tags ?? []).slice(0, 4).map((t) => (
                        <Badge key={t} variant="outline" className="text-[10px]">
                          {t}
                        </Badge>
                      ))}
                    </div>
                  )}
                  {canEdit && (
                    <div className="flex gap-2">
                      <Button size="sm" variant="outline" onClick={() => void alternarPadrao(a)}>
                        <Star className="mr-1 h-3 w-3" />
                        {a.is_default ? "Remover padrão" : "Marcar padrão"}
                      </Button>
                      <Button size="sm" variant="ghost" onClick={() => void excluir(a)} aria-label={`Excluir ${a.name}`}>
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
