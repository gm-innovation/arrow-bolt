import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import { Check, Circle, CircleDot, ExternalLink, ImageOff, Loader2, PenLine, RefreshCw, RotateCcw, Trash2, TriangleAlert, X } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MarinaDesign, MarinaDesignStep } from "@/hooks/useMarinaDesigns";

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
  /** Etapa atual informada pela Marina (ex.: "montando as camadas no Canva…"). */
  statusLabel?: string | null;
  /** Trilha de etapas em tempo real do turno em andamento. */
  liveSteps?: MarinaDesignStep[];
  /** Peças descartadas desta conversa, para recuperar se foi engano. */
  discarded?: MarinaDesign[];
  onDiscardVersion: (id: string) => void;
  onKeepOnly: (id: string) => void;
  onRestore: (id: string) => void;
}

/** Trilha das etapas: concluídas com tempo, atual com giro, futuras apagadas. */
function StepTrail({ steps, elapsed }: { steps: MarinaDesignStep[]; elapsed: number }) {
  if (!steps.length) return null;
  return (
    <ol className="space-y-1 text-xs">
      {steps.map((s) => (
        <li key={`${s.id}-${s.label}`} className="flex items-center gap-2">
          {s.state === "andamento" ? (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
          ) : s.state === "falhou" ? (
            <TriangleAlert className="h-3.5 w-3.5 shrink-0 text-destructive" />
          ) : s.state === "aguardando" ? (
            <Circle className="h-3.5 w-3.5 shrink-0 text-muted-foreground/50" />
          ) : s.state === "cancelada" ? (
            <X className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
          ) : (
            <Check className="h-3.5 w-3.5 shrink-0 text-primary" />
          )}
          <span className={cn("min-w-0 flex-1", s.state === "andamento" ? "text-foreground" : "text-muted-foreground")}>
            {s.label}
            {s.detail ? ` — ${s.detail}` : ""}
          </span>
          <span className="shrink-0 tabular-nums text-muted-foreground">
            {s.state === "andamento" ? formatElapsed(elapsed) : s.ms != null ? formatElapsed(Math.round(s.ms / 1000)) : ""}
          </span>
        </li>
      ))}
    </ol>
  );
}

const STATUS_LABEL: Record<string, string> = {
  pendente: "Aguardando aprovação",
  aprovado: "Aprovado",
  ajuste_solicitado: "Ajuste solicitado",
  descartado: "Descartado",
};

/** Cronômetro simples da etapa em andamento, para a espera nunca ser cega. */
function useElapsed(active: boolean, resetKey?: string) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    setSeconds(0);
    if (!active) return;
    const started = Date.now();
    const t = setInterval(() => setSeconds(Math.floor((Date.now() - started) / 1000)), 1000);
    return () => clearInterval(t);
  }, [active, resetKey]);
  return seconds;
}

function formatElapsed(s: number) {
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}min ${String(s % 60).padStart(2, "0")}s`;
}

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
  statusLabel,
  liveSteps,
  discarded,
  onDiscardVersion,
  onKeepOnly,
  onRestore,
}: Props) {
  const [format, setFormat] = useState<"png" | "jpg" | "pdf">("png");
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [note, setNote] = useState("");

  const hasCanva = !!design?.canva_url;
  // Prévia disponível: a fotografia-base já aparece antes do Canva ficar pronto.
  const hasPreview = !!design?.file_url;
  // Pronto para aprovar só com arquivo-mestre no Canva E preview exportado dele.
  const ready = hasPreview && hasCanva && !!design?.export_format;
  const trail: MarinaDesignStep[] = (liveSteps?.length ? liveSteps : design?.steps ?? []) as MarinaDesignStep[];
  const currentStep = trail.find((s) => s.state === "andamento") ?? null;
  const updatedAt = design?.updated_at ? Date.parse(design.updated_at) : NaN;
  const stale = !!currentStep && !working && !retryingCanva && Number.isFinite(updatedAt) && Date.now() - updatedAt > 15 * 60_000;
  const preparing = !!design && !ready && !design.fail_reason && !!currentStep && !stale;
  const pendingCanva = !!design && !ready && !preparing;
  const elapsed = useElapsed((working || retryingCanva || preparing) && !ready, `${design?.id}-${currentStep?.id ?? ""}`);
  const demorando = elapsed >= 90;


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
          {ready ? (STATUS_LABEL[design.status] ?? design.status) : preparing || retryingCanva ? "Preparando no Canva" : "Canva pendente"}
        </Badge>
        {hasPreview && !ready && (
          <Badge variant="outline" className="text-[10px] uppercase">
            {preparing || retryingCanva ? "prévia — versão editável em preparo" : "prévia — Canva pendente"}
          </Badge>
        )}
        {ready && (
          <Badge variant="outline" className="text-[10px] uppercase">
            preview do Canva
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
        {hasPreview ? (
          <img
            key={design.file_url ?? design.id}
            src={design.file_url ?? undefined}
            alt={design.title ?? "Prévia da peça"}
            className={cn(
              "h-full w-full rounded-lg border border-border bg-background object-contain",
              !ready && "opacity-90",
            )}
          />
        ) : preparing || retryingCanva ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 rounded-lg border border-border bg-background p-6 text-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{currentStep?.label || statusLabel || "Preparando a peça…"}</p>
            <div className="w-full max-w-sm text-left">
              <StepTrail steps={trail} elapsed={elapsed} />
            </div>
          </div>
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

      {(trail.length > 0 || pendingCanva) && (
        <div className="space-y-1 border-t border-border px-3 py-2">
          <StepTrail steps={trail} elapsed={elapsed} />
          {pendingCanva && trail.length === 0 && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <TriangleAlert className="h-3.5 w-3.5" /> Esta versão não possui uma execução ativa registrada no Canva.
            </p>
          )}
          {stale && (
            <p className="text-xs text-destructive">A preparação foi interrompida sem atualização. Tente novamente para retomar do Canva.</p>
          )}
          {(preparing || retryingCanva) && demorando && (
            <p className="text-xs text-muted-foreground">
              Está demorando mais que o normal — pode continuar conversando, eu aviso quando terminar.
            </p>
          )}
        </div>
      )}



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
        {!ready && !preparing && (
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
            <div
              key={v.id}
              className={cn(
                "flex shrink-0 items-center gap-1 rounded-md border pl-3 pr-1 text-xs",
                v.id === design.id ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground",
              )}
            >
              <button onClick={() => onSelect(v)} className="py-1">
                Versão {versions.length - i}
              </button>
              <button
                onClick={() => onDiscardVersion(v.id)}
                aria-label={`Descartar versão ${versions.length - i}`}
                className="rounded p-1 hover:bg-destructive/10 hover:text-destructive"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          <Button variant="ghost" size="sm" className="shrink-0 text-xs" onClick={() => onKeepOnly(design.id)}>
            Descartar todas menos esta
          </Button>
        </div>
      )}

      {!!discarded?.length && (
        <div className="flex items-center gap-2 overflow-x-auto border-t border-border p-2 text-xs text-muted-foreground">
          <CircleDot className="h-3 w-3 shrink-0" />
          <span className="shrink-0">Descartadas:</span>
          {discarded.map((d) => (
            <button
              key={d.id}
              onClick={() => onRestore(d.id)}
              className="flex shrink-0 items-center gap-1 rounded-md border border-border px-2 py-1 hover:text-foreground"
            >
              <RotateCcw className="h-3 w-3" /> {d.title?.slice(0, 24) || "peça"} · recuperar
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
