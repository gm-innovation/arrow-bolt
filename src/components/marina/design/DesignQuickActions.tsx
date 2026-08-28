import { useMemo, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Image, Loader2, Palette, PenLine, Sparkles, Trash2, Upload, X } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/hooks/use-toast";
import { useAuth } from "@/contexts/AuthContext";
import {
  buildAdjustPrompt,
  buildDesignPrompt,
  emptySpec,
  ESTILOS,
  FORMATOS,
  TEMPLATES,
  TONS,
  type DesignSpec,
} from "@/lib/marina/designTemplates";
import {
  useDeleteDesignTemplate,
  useMarinaDesignTemplates,
  useSaveDesignTemplate,
} from "@/hooks/useMarinaDesignTemplates";

type ActionKey = "post" | "editar" | "exportar" | "assets";

interface Props {
  onSend: (prompt: string, extra?: { references?: string[] }) => void;
  disabled?: boolean;
}

/** Remove acentos e espaços do nome do arquivo (exigência do storage). */
function safeName(name: string) {
  return name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9._-]/g, "-");
}

export function DesignQuickActions({ onSend, disabled }: Props) {
  const { user } = useAuth();
  const [open, setOpen] = useState<ActionKey | null>(null);
  const [spec, setSpec] = useState<DesignSpec>(emptySpec());
  const [refFiles, setRefFiles] = useState<{ url: string; name: string }[]>([]);
  const [uploading, setUploading] = useState(false);
  const [templateName, setTemplateName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);

  const { data: meusModelos } = useMarinaDesignTemplates();
  const saveTemplate = useSaveDesignTemplate();
  const deleteTemplate = useDeleteDesignTemplate();

  // Editar
  const [linkEditar, setLinkEditar] = useState("");
  const [instrucao, setInstrucao] = useState("");

  // Exportar
  const [linkExportar, setLinkExportar] = useState("");
  const [tipo, setTipo] = useState("PNG");
  const [dimensao, setDimensao] = useState("");

  // Assets
  const [termo, setTermo] = useState("");

  const close = () => setOpen(null);
  const patch = (v: Partial<DesignSpec>) => setSpec((s) => ({ ...s, ...v }));

  const fullSpec: DesignSpec = useMemo(
    () => ({ ...spec, referencias: refFiles.map((r) => r.url) }),
    [spec, refFiles],
  );
  const previewPrompt = useMemo(() => buildDesignPrompt(fullSpec), [fullSpec]);

  const aplicarModelo = (key: string) => {
    const modelo = TEMPLATES.find((t) => t.key === key);
    setSpec((s) => ({ ...s, ...(modelo?.sugestao ?? {}), template: key }));
  };

  const aplicarMeuModelo = (id: string) => {
    const salvo = meusModelos?.find((m) => m.id === id);
    if (!salvo) return;
    setSpec({ ...emptySpec(), ...salvo.payload, referencias: [] });
    toast({ title: `Modelo "${salvo.name}" aplicado` });
  };

  const subirReferencias = async (files: FileList | null) => {
    if (!files?.length || !user?.id) return;
    setUploading(true);
    try {
      for (const file of Array.from(files).slice(0, 4)) {
        const path = `${user.id}/refs/${Date.now()}-${safeName(file.name)}`;
        const { error } = await supabase.storage.from("marina-designs").upload(path, file, {
          contentType: file.type || "image/png",
          upsert: true,
        });
        if (error) throw error;
        const { data } = await supabase.storage.from("marina-designs").createSignedUrl(path, 60 * 60 * 6);
        if (data?.signedUrl) setRefFiles((r) => [...r, { url: data.signedUrl, name: file.name }].slice(0, 4));
      }
    } catch (e) {
      toast({ title: "Não deu para anexar a foto", description: (e as Error).message, variant: "destructive" });
    } finally {
      setUploading(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  const criarPost = () => {
    if (!spec.tema.trim()) return;
    onSend(previewPrompt, { references: fullSpec.referencias });
    setSpec(emptySpec());
    setRefFiles([]);
    close();
  };

  const salvarModelo = async () => {
    if (!templateName.trim()) return;
    try {
      await saveTemplate.mutateAsync({ name: templateName.trim(), spec: { ...spec, referencias: [] } });
      setTemplateName("");
      toast({ title: "Modelo salvo" });
    } catch (e) {
      toast({ title: "Não deu para salvar o modelo", description: (e as Error).message, variant: "destructive" });
    }
  };

  const editar = () => {
    if (!linkEditar.trim() || !instrucao.trim()) return;
    onSend(buildAdjustPrompt(linkEditar.trim(), instrucao.trim(), fullSpec), {
      references: fullSpec.referencias,
    });
    setInstrucao("");
    close();
  };

  const exportar = () => {
    if (!linkExportar.trim()) return;
    onSend(
      `Exporte o design do Canva ${linkExportar.trim()} em ${tipo}${dimensao.trim() ? ` na dimensão ${dimensao.trim()}` : ""} e devolva o link do design e do arquivo exportado.`,
    );
    close();
  };

  const assets = () => {
    onSend(
      termo.trim()
        ? `Busque no Canva assets e itens do brand kit da LECSOR relacionados a "${termo.trim()}" e me mostre o que existe para usar.`
        : "Me mostre o brand kit da LECSOR no Canva: cores, fontes, logos e templates disponíveis.",
    );
    setTermo("");
    close();
  };

  const referenciasUI = (
    <div className="space-y-2">
      <Label>Fotos reais de referência (opcional)</Label>
      <p className="text-xs text-muted-foreground">
        Anexe fotos do produto/equipamento: a peça reproduz o equipamento fiel ao original. Sem foto, a imagem é uma
        composição.
      </p>
      <div className="relative">
        <Button variant="outline" size="sm" type="button" disabled={uploading}>
          {uploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
          Anexar fotos
        </Button>
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          multiple
          className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
          onChange={(e) => void subirReferencias(e.target.files)}
        />
      </div>
      {refFiles.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {refFiles.map((r) => (
            <Badge key={r.url} variant="secondary" className="max-w-[200px] gap-1">
              <span className="truncate">{r.name}</span>
              <button
                type="button"
                aria-label={`Remover ${r.name}`}
                onClick={() => setRefFiles((list) => list.filter((x) => x.url !== r.url))}
              >
                <X className="h-3 w-3" />
              </button>
            </Badge>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <>
      <div className="grid grid-cols-2 gap-2 border-t border-border p-3">
        <Button variant="outline" size="sm" className="justify-start" disabled={disabled} onClick={() => setOpen("post")}>
          <Sparkles className="mr-2 h-4 w-4 text-primary" /> Criar post
        </Button>
        <Button variant="outline" size="sm" className="justify-start" disabled={disabled} onClick={() => setOpen("editar")}>
          <PenLine className="mr-2 h-4 w-4 text-primary" /> Editar design
        </Button>
        <Button variant="outline" size="sm" className="justify-start" disabled={disabled} onClick={() => setOpen("exportar")}>
          <Download className="mr-2 h-4 w-4 text-primary" /> Exportar
        </Button>
        <Button variant="outline" size="sm" className="justify-start" disabled={disabled} onClick={() => setOpen("assets")}>
          <Palette className="mr-2 h-4 w-4 text-primary" /> Assets / marca
        </Button>
      </div>

      <Dialog open={open === "post"} onOpenChange={(v) => !v && close()}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Image className="h-4 w-4" /> Criar post para rede social
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[65vh] pr-3">
            <div className="space-y-4">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Modelo de peça</Label>
                  <Select value={spec.template} onValueChange={aplicarModelo}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TEMPLATES.map((t) => (
                        <SelectItem key={t.key} value={t.key}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Meus modelos</Label>
                  <Select value="" onValueChange={aplicarMeuModelo}>
                    <SelectTrigger>
                      <SelectValue placeholder={meusModelos?.length ? "Usar um modelo salvo" : "Nenhum salvo ainda"} />
                    </SelectTrigger>
                    <SelectContent>
                      {(meusModelos ?? []).map((m) => (
                        <SelectItem key={m.id} value={m.id}>
                          {m.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="design-tema">Tema da peça</Label>
                <Input
                  id="design-tema"
                  value={spec.tema}
                  onChange={(e) => patch({ tema: e.target.value })}
                  placeholder="Ex.: calibração de instrumentos a bordo"
                />
              </div>

              <div>
                <Label htmlFor="design-texto">Texto principal (opcional)</Label>
                <Textarea
                  id="design-texto"
                  value={spec.texto}
                  onChange={(e) => patch({ texto: e.target.value })}
                  rows={2}
                  placeholder="Chamada que deve aparecer na arte"
                />
              </div>

              <div>
                <Label htmlFor="design-especs">Especificações</Label>
                <Textarea
                  id="design-especs"
                  value={spec.especificacoes}
                  onChange={(e) => patch({ especificacoes: e.target.value })}
                  rows={5}
                  placeholder="O que precisa aparecer, o que evitar, dados técnicos, produtos, referências…"
                />
              </div>

              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <Label>Formato</Label>
                  <Select value={spec.formato} onValueChange={(v) => patch({ formato: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {FORMATOS.map((f) => (
                        <SelectItem key={f.value} value={f.value}>
                          {f.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Estilo da imagem</Label>
                  <Select value={spec.estilo} onValueChange={(v) => patch({ estilo: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {ESTILOS.map((e) => (
                        <SelectItem key={e.value} value={e.value}>
                          {e.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label>Tom de voz</Label>
                  <Select value={spec.tom} onValueChange={(v) => patch({ tom: v })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TONS.map((t) => (
                        <SelectItem key={t.value} value={t.value}>
                          {t.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div>
                  <Label htmlFor="design-cta">Chamada para ação</Label>
                  <Input
                    id="design-cta"
                    value={spec.cta}
                    onChange={(e) => patch({ cta: e.target.value })}
                    placeholder="Ex.: Fale com nosso time"
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="design-marca">Observações de marca</Label>
                <Input
                  id="design-marca"
                  value={spec.marca}
                  onChange={(e) => patch({ marca: e.target.value })}
                  placeholder="Ex.: logo branca no topo, site e WhatsApp no rodapé"
                />
              </div>

              {referenciasUI}

              <div className="rounded-md border border-border bg-muted/40 p-3">
                <Label className="text-xs uppercase text-muted-foreground">Pedido que vai para a Marina</Label>
                <p className="mt-1 whitespace-pre-wrap text-sm">{previewPrompt}</p>
              </div>

              <div className="space-y-2 rounded-md border border-border p-3">
                <Label htmlFor="design-modelo-nome">Salvar como meu modelo</Label>
                <div className="flex gap-2">
                  <Input
                    id="design-modelo-nome"
                    value={templateName}
                    onChange={(e) => setTemplateName(e.target.value)}
                    placeholder="Nome do modelo"
                  />
                  <Button
                    variant="outline"
                    onClick={() => void salvarModelo()}
                    disabled={!templateName.trim() || saveTemplate.isPending}
                  >
                    Salvar
                  </Button>
                </div>
                {(meusModelos ?? []).length > 0 && (
                  <div className="flex flex-wrap gap-2 pt-1">
                    {meusModelos!.map((m) => (
                      <Badge key={m.id} variant="outline" className="gap-1">
                        {m.name}
                        <button
                          type="button"
                          aria-label={`Apagar modelo ${m.name}`}
                          onClick={() => void deleteTemplate.mutateAsync(m.id)}
                        >
                          <Trash2 className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Cancelar
            </Button>
            <Button onClick={criarPost} disabled={!spec.tema.trim()}>
              Pedir para a Marina
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open === "editar"} onOpenChange={(v) => !v && close()}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Editar design existente</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="design-link">Link do Canva</Label>
              <Input
                id="design-link"
                value={linkEditar}
                onChange={(e) => setLinkEditar(e.target.value)}
                placeholder="https://www.canva.com/design/..."
              />
            </div>
            <div>
              <Label htmlFor="design-instrucao">O que mudar?</Label>
              <Textarea
                id="design-instrucao"
                value={instrucao}
                onChange={(e) => setInstrucao(e.target.value)}
                rows={3}
                placeholder="Ex.: trocar o título e usar o azul da marca no fundo"
              />
            </div>
            <div>
              <Label htmlFor="design-especs-edit">Especificações do ajuste (opcional)</Label>
              <Textarea
                id="design-especs-edit"
                value={spec.especificacoes}
                onChange={(e) => patch({ especificacoes: e.target.value })}
                rows={3}
                placeholder="O que precisa continuar igual, o que evitar…"
              />
            </div>
            <div>
              <Label>Estilo da imagem</Label>
              <Select value={spec.estilo} onValueChange={(v) => patch({ estilo: v })}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {ESTILOS.map((e) => (
                    <SelectItem key={e.value} value={e.value}>
                      {e.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            {referenciasUI}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Cancelar
            </Button>
            <Button onClick={editar} disabled={!linkEditar.trim() || !instrucao.trim()}>
              Pedir ajuste
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open === "exportar"} onOpenChange={(v) => !v && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Exportar design</DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="design-link-export">Link do Canva</Label>
              <Input
                id="design-link-export"
                value={linkExportar}
                onChange={(e) => setLinkExportar(e.target.value)}
                placeholder="https://www.canva.com/design/..."
              />
            </div>
            <div>
              <Label>Formato do arquivo</Label>
              <Select value={tipo} onValueChange={setTipo}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="PNG">PNG</SelectItem>
                  <SelectItem value="JPG">JPG</SelectItem>
                  <SelectItem value="PDF">PDF</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="design-dimensao">Dimensão (opcional)</Label>
              <Input
                id="design-dimensao"
                value={dimensao}
                onChange={(e) => setDimensao(e.target.value)}
                placeholder="Ex.: 1080x1080"
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Cancelar
            </Button>
            <Button onClick={exportar} disabled={!linkExportar.trim()}>
              Exportar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open === "assets"} onOpenChange={(v) => !v && close()}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Buscar assets e brand kit</DialogTitle>
          </DialogHeader>
          <div>
            <Label htmlFor="design-termo">O que você procura? (opcional)</Label>
            <Input
              id="design-termo"
              value={termo}
              onChange={(e) => setTermo(e.target.value)}
              placeholder="Ex.: fotos de navio, logo branco, template de proposta"
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Cancelar
            </Button>
            <Button onClick={assets}>Buscar</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
