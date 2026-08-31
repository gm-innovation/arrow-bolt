import { useEffect, useState } from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Check,
  ChevronRight,
  Circle,
  ExternalLink,
  ImageOff,
  Loader2,
  PenLine,
  RefreshCw,
  RotateCcw,
  Trash2,
  TriangleAlert,
  X,
} from "lucide-react";
import { cn } from "@/lib/utils";
import type { MarinaDesign, MarinaDesignStep } from "@/hooks/useMarinaDesigns";

interface Props {
  design: MarinaDesign | null;
  /** Variações do mesmo pedido (mesmo lote). */
  variants: MarinaDesign[];
  /** Demais pedidos desta conversa, mais novos primeiro. */
  versions: MarinaDesign[];
  onSelect: (design: MarinaDesign) => void;
  onApprove: (format: "png" | "jpg" | "pdf") => void;
  onAdjust: (note: string) => void;
  onDiscard: () => void;
  onRetryCanva: () => void;
  /** Passa para a próxima variação do lote. */
  onNext: () => void;
  working: boolean;
  approving: boolean;
  retryingCanva: boolean;
  statusLabel?: string | null;
  liveSteps?: MarinaDesignStep[];
  discarded?: MarinaDesign[];
  onDiscardVersion: (id: string) => void;
  onKeepOnly: (id: string) => void;
  onRestore: (id: string) => void;
}

const STATUS_LABEL: Record<string, string> = {
  pendente: "Aguardando aprovação",
  aprovado: "Aprovado",
  ajuste_solicitado: "Ajuste solicitado",
  descartado: "Descartado",
};

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

/** Cronômetro simples da etapa em andamento, para a espera nunca ser cega. */
function useElapsed(active: boolean, resetKey?: string, startedAt?: string) {
  const [seconds, setSeconds] = useState(0);
  useEffect(() => {
    const parsed = startedAt ? Date.parse(startedAt) : NaN;
    const getSeconds = () => (Number.isFinite(parsed) ? Math.max(0, Math.floor((Date.now() - parsed) / 1000)) : 0);
    setSeconds(getSeconds());
    if (!active) return;
    const t = setInterval(() => setSeconds(getSeconds()), 1000);
    return () => clearInterval(t);
  }, [active, resetKey, startedAt]);
  return seconds;
}

function formatElapsed(s: number) {
  return s < 60 ? `${s}s` : `${Math.floor(s / 60)}min ${String(s % 60).padStart(2, "0")}s`;
}

function previewOf(design: MarinaDesign) {
  return design.file_url || design.preview_url || null;
}

export function DesignStage({
  design,
  variants,
  versions,
  onSelect,
  onApprove,
  onAdjust,
  onDiscard,
  onRetryCanva,
  onNext,
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
  const preview = design ? previewOf(design) : null;
  const ready = !!preview && hasCanva;

  const trail: MarinaDesignStep[] = (liveSteps?.length ? liveSteps : design?.steps ?? []) as MarinaDesignStep[];
  const currentStep = trail.find((s) => s.state === "andamento") ?? null;
  const updatedAt = design?.updated_at ? Date.parse(design.updated_at) : NaN;
  const stale =
    !!currentStep && !working && !retryingCanva && Number.isFinite(updatedAt) && Date.now() - updatedAt > 12 * 60_000;
  const preparing = !!design && !ready && !design.fail_reason && !!currentStep && !stale;
  const elapsed = useElapsed((working || retryingCanva || preparing) && !ready, `${design?.id}-${currentStep?.id ?? ""}`, currentStep?.started_at);
  const demorando = elapsed >= 120;

  if (!design) {
    return (
      <div className="flex h-full flex-col items-center justify-center gap-4 p-8 text-center">
        {working ? (
          <div className="w-full max-w-2xl space-y-3">
            <Skeleton className="h-[420px] w-full rounded-xl" />
            <p className="flex items-center justify-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> A Marina está gerando as variações no Canva…
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
                Preencha o formulário "Criar post" ao lado — as variações geradas no Canva aparecem aqui para você aprovar.
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
          {ready ? STATUS_LABEL[design.status] ?? design.status : preparing || retryingCanva ? "Gerando no Canva" : "Canva pendente"}
        </Badge>
        {variants.length > 1 && (
          <Badge variant="outline" className="text-[10px] uppercase">
            variação {(design.variant_index ?? 0) + 1} de {variants.length}
          </Badge>
        )}
        {hasCanva && (
          <Badge variant="outline" className="text-[10px] uppercase">
            editável no Canva
          </Badge>
        )}
        <span className="min-w-0 flex-1 truncate text-sm text-muted-foreground">
          {design.title ?? design.form?.title ?? "Arte gerada pela Marina"}
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
          {design.fail_reason}. Você pode pedir uma nova geração com o mesmo briefing.
        </p>
      )}

      <div className="min-h-0 flex-1 bg-muted/30 p-3">
        {preview ? (
          <img
            key={preview}
            src={preview}
            alt={design.title ?? "Prévia da peça"}
            className="h-full w-full rounded-lg border border-border bg-background object-contain"
          />
        ) : preparing || retryingCanva ? (
          <div className="flex h-full flex-col items-center justify-center gap-3 rounded-lg border border-border bg-background p-6 text-center">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <p className="text-sm text-muted-foreground">{currentStep?.label || statusLabel || "Preparando as variações…"}</p>
            <div className="w-full max-w-sm text-left">
              <StepTrail steps={trail} elapsed={elapsed} />
            </div>
          </div>
        ) : (
          <div className="flex h-full flex-col items-center justify-center gap-3 rounded-lg border border-dashed border-border p-6 text-center">
            <p className="max-w-sm text-sm text-muted-foreground">
              Ainda não tenho arquivo para mostrar desta peça.
            </p>
            <Button size="sm" variant="outline" onClick={onRetryCanva} disabled={working || retryingCanva}>
              <RefreshCw className={cn("mr-2 h-4 w-4", retryingCanva && "animate-spin")} /> Gerar de novo
            </Button>
          </div>
        )}
      </div>

      {variants.length > 1 && (
        <div className="flex items-center gap-2 overflow-x-auto border-t border-border p-2">
          {variants.map((v, i) => {
            const thumb = previewOf(v);
            return (
              <button
                key={v.id}
                onClick={() => onSelect(v)}
                className={cn(
                  "h-16 w-16 shrink-0 overflow-hidden rounded-md border",
                  v.id === design.id ? "border-primary ring-2 ring-primary/30" : "border-border",
                )}
                aria-label={`Variação ${i + 1}`}
              >
                {thumb ? (
                  <img src={thumb} alt={`Variação ${i + 1}`} className="h-full w-full object-cover" />
                ) : (
                  <span className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">{i + 1}</span>
                )}
              </button>
            );
          })}
        </div>
      )}

      {(trail.length > 0 || stale) && (
        <div className="space-y-1 border-t border-border px-3 py-2">
          <StepTrail steps={trail} elapsed={elapsed} />
          {stale && (
            <p className="text-xs text-destructive">
              Sem atualização por mais de doze minutos. Peça uma nova geração com o mesmo briefing.
            </p>
          )}
          {(preparing || retryingCanva) && demorando && (
            <p className="text-xs text-muted-foreground">
              A geração das variações continua em segundo plano — normalmente leva de um a três minutos.
            </p>
          )}
        </div>
      )}

      {ready && preview && (
        <div className="border-t border-border px-3 py-2 text-xs text-muted-foreground">
          Prévia exportada do Canva ·{" "}
          <a className="text-primary underline" href={preview} target="_blank" rel="noreferrer">
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
        <Button variant="outline" onClick={() => setAdjustOpen(true)} disabled={working}>
          <PenLine className="mr-2 h-4 w-4" /> Solicitar ajuste
        </Button>
        {variants.length > 1 && (
          <Button variant="outline" onClick={onNext}>
            Próximo <ChevronRight className="ml-2 h-4 w-4" />
          </Button>
        )}
        {!ready && !preparing && (
          <Button variant="outline" onClick={onRetryCanva} disabled={working || retryingCanva}>
            <RefreshCw className={cn("mr-2 h-4 w-4", retryingCanva && "animate-spin")} /> Gerar de novo
          </Button>
        )}
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
                Pedido {versions.length - i}
              </button>
              <button
                onClick={() => onDiscardVersion(v.id)}
                className="rounded p-1 hover:bg-muted"
                aria-label="Descartar esta versão"
              >
                <X className="h-3 w-3" />
              </button>
            </div>
          ))}
          {design.id !== "streaming" && (
            <Button size="sm" variant="ghost" className="shrink-0" onClick={() => onKeepOnly(design.id)}>
              Manter só esta
            </Button>
          )}
        </div>
      )}

      {!!discarded?.length && (
        <div className="flex items-center gap-2 overflow-x-auto border-t border-border p-2 text-xs text-muted-foreground">
          <span className="shrink-0">Descartadas:</span>
          {discarded.map((d) => (
            <Button key={d.id} size="sm" variant="ghost" className="shrink-0" onClick={() => onRestore(d.id)}>
              <RotateCcw className="mr-1 h-3 w-3" /> {d.title ?? "peça"}
            </Button>
          ))}
        </div>
      )}

      <Dialog open={adjustOpen} onOpenChange={setAdjustOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>O que deve mudar?</DialogTitle>
          </DialogHeader>
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Ex.: trocar o título por…, deixar o fundo mais escuro, aumentar a logo"
            rows={4}
          />
          <DialogFooter>
            <Button variant="ghost" onClick={() => setAdjustOpen(false)}>
              Cancelar
            </Button>
            <Button
              onClick={() => {
                onAdjust(note);
                setNote("");
                setAdjustOpen(false);
              }}
              disabled={!note.trim()}
            >
              Enviar ajuste
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
