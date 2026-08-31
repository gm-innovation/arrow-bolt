import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Sparkles, X } from "lucide-react";
import type { MarinaDesignForm } from "@/hooks/useMarinaDesigns";

interface Props {
  onCreate: (form: MarinaDesignForm) => void;
  creating: boolean;
  assetReferences?: { url: string; name: string }[];
  onClearAssetReferences?: () => void;
}

const SIZES: { value: MarinaDesignForm["size"]; label: string }[] = [
  { value: "quadrado", label: "Quadrado · 1080x1080" },
  { value: "story", label: "Story · 1080x1920" },
  { value: "feed", label: "Feed · 1080x1350" },
];

const STYLES: { value: MarinaDesignForm["style"]; label: string }[] = [
  { value: "moderno", label: "Moderno" },
  { value: "corporativo", label: "Corporativo" },
  { value: "criativo", label: "Criativo" },
  { value: "minimalista", label: "Minimalista" },
];

/** Formulário "Criar post": o motor recebe um briefing só e devolve as variações. */
export function DesignPostForm({ onCreate, creating, assetReferences, onClearAssetReferences }: Props) {
  const [form, setForm] = useState<MarinaDesignForm>({
    size: "quadrado",
    theme: "",
    title: "",
    subtitle: "",
    cta: "",
    style: "moderno",
    background: "",
    logo: true,
    variations: 4,
  });

  const set = <K extends keyof MarinaDesignForm>(key: K, value: MarinaDesignForm[K]) =>
    setForm((prev) => ({ ...prev, [key]: value }));

  const submit = () => {
    if (!form.title.trim()) return;
    onCreate({ ...form, title: form.title.trim() });
  };

  return (
    <form
      className="space-y-3 border-t border-border p-3"
      onSubmit={(e) => {
        e.preventDefault();
        submit();
      }}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium">Criar post</p>
        <span className="text-xs text-muted-foreground">4 variações no Canva</span>
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div className="space-y-1">
          <Label className="text-xs">Tamanho</Label>
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
          <Label className="text-xs">Estilo</Label>
          <Select value={form.style} onValueChange={(v) => set("style", v as MarinaDesignForm["style"])}>
            <SelectTrigger className="h-9">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STYLES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
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
          Título
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

      <Button type="submit" className="w-full" disabled={creating || !form.title.trim()}>
        {creating ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Sparkles className="mr-2 h-4 w-4" />}
        Criar post no Canva
      </Button>
    </form>
  );
}
