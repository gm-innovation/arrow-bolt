import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, ExternalLink, ImageOff, Loader2, PenLine, RefreshCw, Trash2 } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MarinaDesign } from "@/hooks/useMarinaDesigns";

interface Props {
  design: MarinaDesign | null;
  versions: MarinaDesign[];
  onSelect: (design: MarinaDesign) => void;
  onApprove: (format: "png" | "jpg" | "pdf") => void;
  onAdjust: (note: string) => void;
  onDiscard: () => void;
  onRetryCanva: () => void;
  working: boolean;
  approving: boolean;
  retryingCanva: boolean;
}

const STATUS_LABEL: Record<string, string> = {
  pendente: "Aguardando aprovação",
  aprovado: "Aprovado",
  ajuste_solicitado: "Ajuste solicitado",
  descartado: "Descartado",
};

export function DesignStage({
  design,
  versions,
  onSelect,
  onApprove,
  onAdjust,
  onDiscard,
  onRetryCanva,
  working,
  approving,
  retryingCanva,
}: Props) {
  const [format, setFormat] = useState<"png" | "jpg" | "pdf">("png");
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [note, setNote] = useState("");

  const hasCanva = !!design?.canva_url;
  const hasArt = !!design?.file_url && hasCanva;
  // Registro já criado, arte ainda em produção.
  const preparando = !!design && (!hasArt || !hasCanva) && !design.fail_reason;
  const ready = hasArt && hasCanva;


  if (!design) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        {working ? (
          <div className="w-full max-w-2xl space-y-3">
            <Skeleton className="h-[420px] w-full rounded-xl" />
            <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> A Marina está trabalhando na peça…
            </p>
          </div>
        ) : (
          <>
            <div className="rounded-full bg-muted p-4">
              <ImageOff className="h-6 w-6 text-muted-foreground" />
            </div>
            <div>
              <h3 className="font-semibold">Nenhum design no palco</h3>
              <p className="max-w-sm text-sm text-muted-foreground">
                Peça uma peça para a Marina na conversa ao lado — quando ela criar no Canva, a prévia aparece aqui para você
                aprovar.
              </p>
            </div>
          </>
        )}
      </div>
    );
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex flex-wrap items-center gap-2 border-b border-border p-3">
        <Badge variant={design.status === "aprovado" ? "default" : "secondary"}>
          {ready ? (STATUS_LABEL[design.status] ?? design.status) : design.fail_reason ? "Canva pendente" : "Preparando no Canva"}
        </Badge>
        {hasArt && (
          <Badge variant="outline" className="text-[10px] uppercase">
            arte da Marina
          </Badge>
        )}
        {hasCanva && (
          <Badge variant="outline" className="text-[10px] uppercase">
            editável no Canva
          </Badge>
        )}
        <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
          {design.title ?? design.canva_url ?? "Arte gerada pela Marina"}

        </span>
        {design.canva_url && (
          <Button asChild variant="outline" size="sm">
            <a href={design.canva_url} target="_blank" rel="noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" /> Abrir no Canva
            </a>
          </Button>
        )}
      </div>

      {design.fail_reason && (
        <p className="border-b border-border bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
          {design.fail_reason}. A peça só poderá ser aprovada quando a versão editável e o preview exportado do Canva estiverem prontos.
        </p>
      )}

      <div className="min-h-0 flex-1 bg-muted/30 p-3">
        {preparando ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 rounded-lg border border-border bg-background p-6 text-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">Preparando a peça…</p>
          </div>
        ) : hasArt ? (
          <img
            key={design.id}
            src={design.file_url ?? undefined}
            alt={design.title ?? "Preview exportado da peça no Canva"}
            className="h-full w-full rounded-lg border border-border bg-background object-contain"
          />
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border p-6 text-center">
            <p className="max-w-sm text-sm text-muted-foreground">
              Ainda não tenho arquivo para mostrar desta peça. Peça para a Marina tentar de novo na conversa.
            </p>
            {design.canva_url && (
              <Button asChild size="sm">
                <a href={design.canva_url} target="_blank" rel="noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" /> Abrir no Canva
                </a>
              </Button>
            )}
          </div>
        )}
      </div>


      {ready && design.file_url && (
        <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
          Preview {design.export_format?.toUpperCase()} exportado do Canva ·{" "}
          <a className="text-primary underline" href={design.file_url} target="_blank" rel="noreferrer">
            baixar
          </a>
        </div>
      )}

      <div className="flex flex-wrap items-center gap-2 border-t border-border p-3">
        {hasCanva && (
          <Select value={format} onValueChange={(v) => setFormat(v as typeof format)}>
            <SelectTrigger className="w-28">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="png">PNG</SelectItem>
              <SelectItem value="jpg">JPG</SelectItem>
              <SelectItem value="pdf">PDF</SelectItem>
            </SelectContent>
          </Select>
        )}

        <Button onClick={() => onApprove(format)} disabled={!ready || approving || design.status === "aprovado"}>
          {approving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Check className="mr-2 h-4 w-4" />}
          Aprovar peça
        </Button>
        {!ready && !!design.fail_reason && (
          <Button variant="outline" onClick={onRetryCanva} disabled={working || retryingCanva}>
            <RefreshCw className={cn("mr-2 h-4 w-4", retryingCanva && "animate-spin")} /> Tentar criar no Canva novamente
          </Button>
        )}
        <Button variant="outline" onClick={() => setAdjustOpen(true)} disabled={working}>
          <PenLine className="mr-2 h-4 w-4" /> Solicitar ajuste
        </Button>
        <Button variant="ghost" onClick={onDiscard}>
          <Trash2 className="mr-2 h-4 w-4" /> Descartar
        </Button>
      </div>

      {versions.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto border-t border-border p-2">
          {versions.map((v, i) => (
            <button
              key={v.id}
              onClick={() => onSelect(v)}
              className={cn(
                "shrink-0 rounded-md border px-3 py-1 text-xs",
                v.id === design.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground",
              )}
            >
              Versão {versions.length - i}
            </button>
          ))}
        </div>
      )}

      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>O que mudar nesta peça?</DialogTitle>
          </DialogHeader>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={4}
            placeholder="Ex.: deixar o título maior e trocar a foto de fundo"
          />
          <DialogFooter>
            <Button variant="outline" onClick={() => setAdjustOpen(false)}>
              Cancelar
            </Button>
            <Button
              disabled={!note.trim()}
              onClick={() => {
                onAdjust(note.trim());
                setNote("");
                setAdjustOpen(false);
              }}
            >
              Pedir ajuste
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
