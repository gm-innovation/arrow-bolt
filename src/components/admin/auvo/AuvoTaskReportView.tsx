import { useState } from "react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertTriangle, ChevronLeft, ChevronRight, FileText, Package, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useAuvoTaskReport } from "@/hooks/useAuvoTaskReport";
import {
  extractSuppliedMaterialSection,
  isEmptyMaterialSection,
} from "@/lib/auvo/reportSections";

const fmtDate = (value?: string | null) => {
  if (!value) return "—";
  try {
    return format(parseISO(value), "dd/MM/yyyy HH:mm", { locale: ptBR });
  } catch {
    return "—";
  }
};

const fmtDay = (value?: string | null) => {
  if (!value) return "—";
  try {
    return format(parseISO(value), "dd/MM/yyyy", { locale: ptBR });
  } catch {
    return "—";
  }
};

interface Props {
  auvoTaskUid?: string | null;
}

export const AuvoTaskReportView = ({ auvoTaskUid }: Props) => {
  const { data, isLoading } = useAuvoTaskReport(auvoTaskUid);
  const [lightboxIndex, setLightboxIndex] = useState<number | null>(null);

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-16" />
        <Skeleton className="h-40" />
      </div>
    );
  }

  if (!data?.task) {
    return (
      <p className="rounded-md border border-dashed p-4 text-sm text-muted-foreground">
        Atendimento do Auvo não encontrado para esta divergência.
      </p>
    );
  }

  const { task, report, materials } = data;
  const materialSection = extractSuppliedMaterialSection(report?.report_text);
  const attachments = report?.attachments ?? [];
  const images = attachments.filter((a) => /\.(png|jpe?g|webp|gif)(\?|$)/i.test(a.url));
  const otherFiles = attachments.filter((a) => !images.includes(a));

  const move = (delta: number) => {
    setLightboxIndex((prev) => {
      if (prev === null) return prev;
      const next = (prev + delta + images.length) % images.length;
      return next;
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-md border bg-muted/40 p-3 text-sm space-y-1">
        <p className="font-medium">
          OS {task.order_number ?? `AUVO-${task.auvo_task_id}`} · {task.customer_name ?? "—"}
        </p>
        <p className="text-muted-foreground">
          Técnico: {task.technician_name ?? "—"} · Data: {fmtDay(task.task_date)}
        </p>
        <p className="text-xs text-muted-foreground">
          Check-in {fmtDate(task.checkin_at)} · Check-out {fmtDate(task.checkout_at)}
          {task.vessel_name ? ` · Embarcação: ${task.vessel_name}` : ""}
        </p>
      </div>

      {!report?.report_text ? (
        <div className="flex items-start gap-2 rounded-md border border-dashed p-3 text-sm text-muted-foreground">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>
            Relatório não disponível no Auvo para este atendimento. Use "Reanalisar" após a
            próxima sincronização para tentar novamente.
          </span>
        </div>
      ) : (
        <>
          <div>
            <div className="mb-2 flex items-center gap-2">
              <Package className="h-4 w-4 text-primary" />
              <h4 className="text-sm font-semibold">Material fornecido (fonte da auditoria)</h4>
            </div>
            {!materialSection ? (
              <div className="flex items-start gap-2 rounded-md border border-amber-300 bg-amber-50 p-3 text-sm text-amber-900 dark:border-amber-800 dark:bg-amber-950/40 dark:text-amber-200">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                <span>
                  O relatório não traz a seção de material fornecido. Sem lista declarada, a
                  auditoria não considera materiais deste atendimento.
                </span>
              </div>
            ) : isEmptyMaterialSection(materialSection.body) ? (
              <p className="rounded-md border bg-muted/40 p-3 text-sm text-muted-foreground">
                O técnico declarou que não houve fornecimento de material.
              </p>
            ) : (
              <pre className="max-h-52 overflow-auto whitespace-pre-wrap rounded-md border border-primary/30 bg-primary/5 p-3 text-sm font-sans">
                {materialSection.body}
              </pre>
            )}
          </div>

          <Separator />

          <div>
            <div className="mb-2 flex items-center gap-2">
              <FileText className="h-4 w-4 text-muted-foreground" />
              <h4 className="text-sm font-semibold">Relatório completo do técnico</h4>
            </div>
            <ScrollArea className="h-64 rounded-md border p-3">
              <pre className="whitespace-pre-wrap text-sm font-sans">{report.report_text}</pre>
            </ScrollArea>
          </div>
        </>
      )}

      {materials.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold">Materiais reconhecidos pela IA</h4>
          <div className="space-y-2">
            {materials.map((m) => (
              <div key={m.id} className="rounded-md border p-2 text-sm">
                <div className="flex items-center justify-between gap-2">
                  <span className="font-medium">{m.mentioned_name}</span>
                  <span className="text-muted-foreground">
                    {m.quantity ?? "—"} {m.unit ?? ""}
                  </span>
                </div>
                {m.source_excerpt && (
                  <p className="mt-1 text-xs text-muted-foreground">"{m.source_excerpt}"</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {report?.extraction_status === "pending" && (
        <p className="text-xs text-muted-foreground">
          Leitura por IA ainda pendente para este relatório.
        </p>
      )}

      {report?.questionnaire?.length ? (
        <div>
          <h4 className="mb-2 text-sm font-semibold">Questionário do Auvo</h4>
          <div className="space-y-3">
            {report.questionnaire.map((q, qi) => (
              <div key={q.id ?? qi} className="rounded-md border p-2">
                {q.title && <p className="text-sm font-medium">{q.title}</p>}
                <div className="mt-1 space-y-1">
                  {(q.answers ?? [])
                    .filter((a) => a.question)
                    .map((a, ai) => (
                      <p key={ai} className="text-xs">
                        <span className="text-muted-foreground">{a.question}: </span>
                        {a.reply?.trim() || "—"}
                      </p>
                    ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {images.length > 0 && (
        <div>
          <h4 className="mb-2 text-sm font-semibold">Fotos do atendimento ({images.length})</h4>
          <div className="grid grid-cols-3 gap-2 sm:grid-cols-4">
            {images.map((img, i) => (
              <button
                key={img.url}
                type="button"
                onClick={() => setLightboxIndex(i)}
                className="overflow-hidden rounded-md border transition hover:opacity-80"
              >
                <img
                  src={img.url}
                  alt={img.name ?? `Foto ${i + 1} do atendimento`}
                  loading="lazy"
                  className="h-20 w-full object-cover"
                />
              </button>
            ))}
          </div>
        </div>
      )}

      {otherFiles.length > 0 && (
        <div className="space-y-1">
          <h4 className="text-sm font-semibold">Outros anexos</h4>
          {otherFiles.map((f) => (
            <a
              key={f.url}
              href={f.url}
              target="_blank"
              rel="noreferrer"
              className="block text-sm text-primary underline"
            >
              {f.name ?? f.url.split("/").pop()}
            </a>
          ))}
        </div>
      )}

      <Dialog
        open={lightboxIndex !== null}
        onOpenChange={(open) => !open && setLightboxIndex(null)}
      >
        <DialogContent className="max-w-4xl p-2">
          {lightboxIndex !== null && images[lightboxIndex] && (
            <div className="relative">
              <img
                src={images[lightboxIndex].url}
                alt={images[lightboxIndex].name ?? `Foto ${lightboxIndex + 1}`}
                className="max-h-[75vh] w-full object-contain"
              />
              {images.length > 1 && (
                <>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute left-2 top-1/2 -translate-y-1/2"
                    onClick={() => move(-1)}
                    aria-label="Foto anterior"
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="secondary"
                    size="icon"
                    className="absolute right-2 top-1/2 -translate-y-1/2"
                    onClick={() => move(1)}
                    aria-label="Próxima foto"
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </>
              )}
              <Badge variant="secondary" className="absolute bottom-2 left-1/2 -translate-x-1/2">
                {lightboxIndex + 1} de {images.length}
              </Badge>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};
