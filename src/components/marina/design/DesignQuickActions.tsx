import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, Image, Palette, PenLine, Sparkles } from "lucide-react";

type ActionKey = "post" | "editar" | "exportar" | "assets";

interface Props {
  onSend: (prompt: string) => void;
  disabled?: boolean;
}

const FORMATOS = [
  { value: "post quadrado 1080x1080 (feed)", label: "Feed quadrado 1080×1080" },
  { value: "story vertical 1080x1920", label: "Story 1080×1920" },
  { value: "carrossel 1080x1350 com 3 páginas", label: "Carrossel 1080×1350" },
  { value: "banner horizontal 1920x1080", label: "Banner 1920×1080" },
  { value: "capa de LinkedIn 1584x396", label: "Capa LinkedIn 1584×396" },
];

export function DesignQuickActions({ onSend, disabled }: Props) {
  const [open, setOpen] = useState<ActionKey | null>(null);

  // Criar post
  const [tema, setTema] = useState("");
  const [texto, setTexto] = useState("");
  const [formato, setFormato] = useState(FORMATOS[0].value);

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

  const criarPost = () => {
    if (!tema.trim()) return;
    onSend(
      [
        `Crie no Canva um ${formato} para a LECSOR sobre: ${tema.trim()}.`,
        texto.trim() ? `Texto principal da peça: "${texto.trim()}".` : "",
        "Use o brand kit e as cores da marca. Ao terminar, devolva o link do design.",
      ]
        .filter(Boolean)
        .join(" "),
    );
    setTema("");
    setTexto("");
    close();
  };

  const editar = () => {
    if (!linkEditar.trim() || !instrucao.trim()) return;
    onSend(`Edite o design do Canva ${linkEditar.trim()} com os seguintes ajustes: ${instrucao.trim()}. Ao terminar, devolva o link do design atualizado.`);
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
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Image className="h-4 w-4" /> Criar post para rede social
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-3">
            <div>
              <Label htmlFor="design-tema">Tema da peça</Label>
              <Input
                id="design-tema"
                value={tema}
                onChange={(e) => setTema(e.target.value)}
                placeholder="Ex.: calibração de instrumentos a bordo"
              />
            </div>
            <div>
              <Label htmlFor="design-texto">Texto principal (opcional)</Label>
              <Textarea
                id="design-texto"
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                rows={3}
                placeholder="Chamada que deve aparecer na arte"
              />
            </div>
            <div>
              <Label>Formato</Label>
              <Select value={formato} onValueChange={setFormato}>
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
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={close}>
              Cancelar
            </Button>
            <Button onClick={criarPost} disabled={!tema.trim()}>
              Pedir para a Marina
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={open === "editar"} onOpenChange={(v) => !v && close()}>
        <DialogContent>
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
