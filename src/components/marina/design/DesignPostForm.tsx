import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import { ChevronDown, ImagePlus, Loader2, Sparkles, Upload, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "@/hooks/use-toast";
import { uploadDesignImage, type MarinaDesignForm } from "@/hooks/useMarinaDesigns";

interface Props {
  onCreate: (form: MarinaDesignForm, extraReferences: string[]) => void;
  creating: boolean;
  assetReferences?: { url: string; name: string }[];
  onClearAssetReferences?: () => void;
}

const SIZES: { value: MarinaDesignForm["size"]; label: string }[] = [
  { value: "quadrado", label: "Quadrado · 1080x1080" },
  { value: "feed", label: "Feed · 1080x1350" },
  { value: "paisagem", label: "Paisagem · 1920x1080" },
];

/** Formulário "Criar post": o motor recebe um briefing só e devolve as variações. */
export function DesignPostForm({ onCreate, creating, assetReferences, onClearAssetReferences }: Props) {
  const [open, setOpen] = useState(true);
  const [uploading, setUploading] = useState<"logo" | "apoio" | null>(null);
  const [logo, setLogo] = useState<{ url: string; name: string } | null>(null);
  const [support, setSupport] = useState<{ url: string; name: string }[]>([]);
  const [form, setForm] = useState<MarinaDesignForm>({
    size: "quadrado",
    theme: "",
    title: "",
    subtitle: "",
    cta: "",
    style: "azul-marinho corporativo",
    background: "",
    audience: "",
    logo: true,
    variations: 4,
  });

  const set = <K extends keyof MarinaDesignForm>(key: K, value: MarinaDesignForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const pick = async (files: FileList | null, kind: "logo" | "apoio") => {
    const list = Array.from(files ?? []).slice(0, kind === "logo" ? 1 : 3);
    if (!list.length) return;
    setUploading(kind);
    try {
      const uploaded = await Promise.all(
        list.map(async (file) => ({ url: await uploadDesignImage(file), name: file.name })),
      );
      if (kind === "logo") setLogo(uploaded[0]);
      else setSupport((prev) => [...prev, ...uploaded].slice(0, 3));
    } catch (e) {
      toast({ title: "Não deu para enviar a imagem", description: (e as Error).message, variant: "destructive" });
    } finally {
      setUploading(null);
    }
  };

  const submit = () => {
    if (!form.title.trim()) return;
    onCreate(
      { ...form, title: form.title.trim(), logo_url: logo?.url },
      support.map((s) => s.url),
    );
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="border-t border-border">
      <CollapsibleTrigger className="flex w-full items-center justify-between px-3 py-2 text-left hover:bg-muted/50">
        <span className="text-sm font-medium">Criar post</span>
        <span className="flex items-center gap-2 text-xs text-muted-foreground">
          4 variações no Canva
          <ChevronDown className={cn("h-4 w-4 transition-transform", open && "rotate-180")} />
        </span>
      </CollapsibleTrigger>
      <CollapsibleContent>
    <form
      className="space-y-3 p-3 pt-0"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="space-y-1">
        <Label className="text-xs">Formato</Label>
        <Select value={form.size} onValueChange={(v) => set("size", v as MarinaDesignForm["size"])}>
          <SelectTrigger className="h-9">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {SIZES.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="space-y-1">
        <Label className="text-xs" htmlFor="design-style">
          Cor / estilo predominante
        </Label>
        <Input
          id="design-style"
          className="h-9"
          placeholder="Ex.: azul marinho corporativo"
          value={form.style}
          onChange={(e) => set("style", e.target.value)}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs" htmlFor="design-theme">
          Tema
        </Label>
        <Input
          id="design-theme"
          className="h-9"
          placeholder="Ex.: Starlink marítima para frota offshore"
          value={form.theme ?? ""}
          onChange={(e) => set("theme", e.target.value)}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs" htmlFor="design-title">
          Título principal
        </Label>
        <Input
          id="design-title"
          className="h-9"
          placeholder="Texto principal da peça"
          value={form.title}
          onChange={(e) => set("title", e.target.value)}
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs" htmlFor="design-subtitle">
            Subtítulo
          </Label>
          <Input
            id="design-subtitle"
            className="h-9"
            placeholder="Opcional"
            value={form.subtitle ?? ""}
            onChange={(e) => set("subtitle", e.target.value)}
          />
        </div>
        <div className="space-y-1">
          <Label className="text-xs" htmlFor="design-cta">
            CTA
          </Label>
          <Input
            id="design-cta"
            className="h-9"
            placeholder="Ex.: Fale com a Lecsor"
            value={form.cta ?? ""}
            onChange={(e) => set("cta", e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1">
        <Label className="text-xs" htmlFor="design-audience">
          Público-alvo
        </Label>
        <Input
          id="design-audience"
          className="h-9"
          placeholder="Ex.: armadores e gestores de frota offshore"
          value={form.audience ?? ""}
          onChange={(e) => set("audience", e.target.value)}
        />
      </div>

      <div className="space-y-1">
        <Label className="text-xs" htmlFor="design-bg">
          Fundo
        </Label>
        <Input
          id="design-bg"
          className="h-9"
          placeholder="Ex.: embarcação de apoio no mar ao amanhecer"
          value={form.background ?? ""}
          onChange={(e) => set("background", e.target.value)}
        />
      </div>

      <div className="flex items-center justify-between rounded-md border border-border px-3 py-2">
        <Label className="text-xs" htmlFor="design-logo">
          Incluir logo LECSOR
        </Label>
        <Switch id="design-logo" checked={form.logo !== false} onCheckedChange={(v) => set("logo", v)} />
      </div>

      {form.logo !== false && (
        <div className="space-y-1">
          <Label className="text-xs">Logo da empresa</Label>
          <div className="relative">
            <Button type="button" variant="outline" className="w-full justify-start" disabled={uploading === "logo"}>
              {uploading === "logo" ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              {logo ? logo.name : "Enviar logo (opcional — usa a do brand kit)"}
            </Button>
            <input
              type="file"
              accept="image/*"
              className="absolute inset-0 cursor-pointer opacity-0"
              onChange={(e) => pick(e.target.files, "logo")}
            />
          </div>
          {logo && (
            <Button type="button" size="sm" variant="ghost" className="h-7 px-2 text-xs" onClick={() => setLogo(null)}>
              <X className="mr-1 h-3 w-3" /> Remover logo enviada
            </Button>
          )}
        </div>
      )}

      <div className="space-y-1">
        <Label className="text-xs">Imagens de apoio</Label>
        <div className="relative">
          <Button type="button" variant="outline" className="w-full justify-start" disabled={uploading === "apoio"}>
            {uploading === "apoio" ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <ImagePlus className="mr-2 h-4 w-4" />
            )}
            Enviar imagens (até 3)
          </Button>
          <input
            type="file"
            accept="image/*"
            multiple
            className="absolute inset-0 cursor-pointer opacity-0"
            onChange={(e) => pick(e.target.files, "apoio")}
          />
        </div>
        {!!support.length && (
          <div className="flex flex-wrap items-center gap-1">
            {support.map((s) => (
              <Badge key={s.url} variant="secondary" className="gap-1 text-[10px]">
                {s.name}
                <button type="button" onClick={() => setSupport((prev) => prev.filter((p) => p.url !== s.url))}>
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>
        )}
      </div>

      {!!assetReferences?.length && (
        <div className="flex flex-wrap items-center gap-1">
          <span className="text-xs text-muted-foreground">Referências:</span>
          {assetReferences.map((a) => (
            <Badge key={a.url} variant="secondary" className="text-[10px]">
              {a.name}
            </Badge>
          ))}
          {onClearAssetReferences && (
            <Button type="button" size="icon" variant="ghost" className="h-6 w-6" onClick={onClearAssetReferences}>
              <X className="h-3 w-3" />
            </Button>
          )}
        </div>
      )}

      <Button type="submit" className="w-full" disabled={creating || !!uploading || !form.title.trim()}>
        {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
        Criar post no Canva
      </Button>
    </form>
      </CollapsibleContent>
    </Collapsible>
  );
}
