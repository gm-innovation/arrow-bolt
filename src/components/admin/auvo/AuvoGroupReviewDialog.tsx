import { useEffect, useMemo, useRef, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AuvoServiceReportTabs } from "./AuvoServiceReportTabs";
import type { AuvoServiceMember } from "@/hooks/useAuvoServiceGroups";
import type { AuvoDiscrepancy, AuvoPhotoFinding } from "@/hooks/useAuvoIntegration";
import { Camera, ImageOff } from "lucide-react";

export type ReviewStatus = "confirmed" | "justified" | "dismissed";

export interface AuvoReviewDecision {
  id: string;
  review_status: ReviewStatus;
  review_notes?: string;
}

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  orderLabel: string;
  customerName?: string | null;
  vesselName?: string | null;
  totalRisk: number;
  items: AuvoDiscrepancy[];
  photoFindings?: AuvoPhotoFinding[];
  members: AuvoServiceMember[];
  focusItemId?: string | null;
  initialTaskUid?: string | null;
  isSaving: boolean;
  onSubmit: (decisions: AuvoReviewDecision[]) => void;
  onSubmitPhotos?: (decisions: AuvoReviewDecision[]) => void;
  classificationLabel: Record<string, string>;
  reviewLabel: Record<string, string>;
  currency: (v: number) => string;
  severityVariant: (s: string) => any;
}

const STATUS_OPTIONS: { value: ReviewStatus; label: string }[] = [
  { value: "confirmed", label: "Divergência confirmada" },
  { value: "justified", label: "Justificada pelo técnico" },
  { value: "dismissed", label: "Descartar (falso positivo)" },
];

type Draft = { status: ReviewStatus | ""; notes: string };

/** Revisão de TODAS as divergências de um serviço/OS em um único modal. */
export const AuvoGroupReviewDialog = ({
  open,
  onOpenChange,
  orderLabel,
  customerName,
  vesselName,
  totalRisk,
  items,
  photoFindings = [],
  members,
  focusItemId,
  initialTaskUid,
  isSaving,
  onSubmit,
  onSubmitPhotos,
  classificationLabel,
  reviewLabel,
  currency,
  severityVariant,
}: Props) => {
  const [drafts, setDrafts] = useState<Record<string, Draft>>({});
  const [photoDrafts, setPhotoDrafts] = useState<Record<string, Draft>>({});
  const [bulkStatus, setBulkStatus] = useState<ReviewStatus>("confirmed");
  const [bulkNotes, setBulkNotes] = useState("");
  const [photoBulkStatus, setPhotoBulkStatus] = useState<ReviewStatus>("confirmed");
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});

  useEffect(() => {
    if (!open) return;
    const next: Record<string, Draft> = {};
    for (const d of items) {
      next[d.id] = {
        status: d.review_status && d.review_status !== "pending" ? (d.review_status as ReviewStatus) : "",
        notes: d.review_notes ?? "",
      };
    }
    setDrafts(next);
    const nextPhotos: Record<string, Draft> = {};
    for (const f of photoFindings) {
      nextPhotos[f.id] = {
        status: f.review_status && f.review_status !== "pending" ? (f.review_status as ReviewStatus) : "",
        notes: f.review_notes ?? "",
      };
    }
    setPhotoDrafts(nextPhotos);
    setBulkNotes("");
  }, [open, items, photoFindings]);

  useEffect(() => {
    if (!open || !focusItemId) return;
    const timer = setTimeout(() => {
      itemRefs.current[focusItemId]?.scrollIntoView({ block: "center", behavior: "smooth" });
    }, 120);
    return () => clearTimeout(timer);
  }, [open, focusItemId]);

  const decided = useMemo(
    () => items.filter((d) => drafts[d.id]?.status).length,
    [items, drafts],
  );

  const changed = useMemo(
    () =>
      items.filter((d) => {
        const draft = drafts[d.id];
        if (!draft?.status) return false;
        return draft.status !== d.review_status || draft.notes !== (d.review_notes ?? "");
      }),
    [items, drafts],
  );

  const photoChanged = useMemo(
    () =>
      photoFindings.filter((f) => {
        const draft = photoDrafts[f.id];
        if (!draft?.status) return false;
        return draft.status !== f.review_status || draft.notes !== (f.review_notes ?? "");
      }),
    [photoFindings, photoDrafts],
  );

  const setDraft = (id: string, patch: Partial<Draft>) =>
    setDrafts((prev) => ({ ...prev, [id]: { ...(prev[id] ?? { status: "", notes: "" }), ...patch } }));

  const setPhotoDraft = (id: string, patch: Partial<Draft>) =>
    setPhotoDrafts((prev) => ({
      ...prev,
      [id]: { ...(prev[id] ?? { status: "", notes: "" }), ...patch },
    }));

  const applyToAll = () =>
    setDrafts((prev) => {
      const next = { ...prev };
      for (const d of items) {
        const current = next[d.id] ?? { status: "", notes: "" };
        if (current.status) continue;
        next[d.id] = { status: bulkStatus, notes: bulkNotes || current.notes };
      }
      return next;
    });

  const applyToAllPhotos = () =>
    setPhotoDrafts((prev) => {
      const next = { ...prev };
      for (const f of photoFindings) {
        const current = next[f.id] ?? { status: "", notes: "" };
        if (current.status) continue;
        next[f.id] = { status: photoBulkStatus, notes: current.notes };
      }
      return next;
    });

  const totalChanged = changed.length + photoChanged.length;

  const handleSubmit = () => {
    if (photoChanged.length > 0 && onSubmitPhotos) {
      onSubmitPhotos(
        photoChanged.map((f) => ({
          id: f.id,
          review_status: photoDrafts[f.id].status as ReviewStatus,
          review_notes: photoDrafts[f.id].notes || undefined,
        })),
      );
    }
    onSubmit(
      changed.map((d) => ({
        id: d.id,
        review_status: drafts[d.id].status as ReviewStatus,
        review_notes: drafts[d.id].notes || undefined,
      })),
    );
  };


  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[92vh] overflow-hidden p-0">
        <div className="max-h-[92vh] overflow-y-auto p-6">
          <DialogHeader>
            <DialogTitle>Revisar divergências do serviço</DialogTitle>
            <DialogDescription>
              OS {orderLabel}
              {customerName ? ` · ${customerName}` : ""}
              {vesselName ? ` · ${vesselName}` : ""} · {items.length}{" "}
              {items.length === 1 ? "material" : "materiais"} · risco total {currency(totalRisk)}
            </DialogDescription>
          </DialogHeader>

          <div className="mt-4 grid gap-6 lg:grid-cols-[1.1fr_1fr]">
            <div className="min-w-0">
              <AuvoServiceReportTabs members={members} initialTaskUid={initialTaskUid} />
            </div>

            <div className="min-w-0 space-y-3">
              <div className="rounded-md border p-3">
                <div className="flex items-center justify-between gap-2">
                  <p className="text-sm font-medium">
                    {decided} de {items.length} decididos
                  </p>
                </div>
                <div className="mt-2 flex flex-col gap-2 sm:flex-row sm:items-center">
                  <Select value={bulkStatus} onValueChange={(v) => setBulkStatus(v as ReviewStatus)}>
                    <SelectTrigger className="h-9">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {STATUS_OPTIONS.map((o) => (
                        <SelectItem key={o.value} value={o.value}>
                          {o.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Button variant="outline" size="sm" onClick={applyToAll} className="shrink-0">
                    Aplicar a todos
                  </Button>
                </div>
                <Textarea
                  className="mt-2 min-h-[60px]"
                  value={bulkNotes}
                  onChange={(e) => setBulkNotes(e.target.value)}
                  placeholder="Observação aplicada em massa (opcional)"
                />
                <p className="mt-1 text-xs text-muted-foreground">
                  A ação em massa preenche apenas os materiais ainda sem conclusão.
                </p>
              </div>

              <div className="space-y-3">
                {items.map((d) => {
                  const draft = drafts[d.id] ?? { status: "", notes: "" };
                  return (
                    <div
                      key={d.id}
                      ref={(el) => {
                        itemRefs.current[d.id] = el;
                      }}
                      className={`rounded-md border p-3 space-y-2 ${
                        focusItemId === d.id ? "ring-2 ring-primary" : ""
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-medium" title={d.item_name}>
                            {d.item_name}
                          </p>
                          {d.external_product_code && (
                            <p className="text-xs text-muted-foreground">{d.external_product_code}</p>
                          )}
                        </div>
                        <Badge variant={severityVariant(d.severity)} className="shrink-0">
                          {classificationLabel[d.classification] ?? d.classification}
                        </Badge>
                      </div>

                      <p className="text-xs text-muted-foreground">
                        Baixa no estoque: {Number(d.stock_quantity ?? 0)} · Relatado:{" "}
                        {d.reported_quantity === null ? "—" : Number(d.reported_quantity)} · Risco:{" "}
                        {Number(d.value_at_risk ?? 0) > 0 ? currency(Number(d.value_at_risk)) : "—"}
                      </p>

                      {d.ai_notes && (
                        <p className="rounded bg-muted p-2 text-xs text-muted-foreground">
                          {d.ai_notes}
                        </p>
                      )}

                      {d.review_status && d.review_status !== "pending" && (
                        <Badge variant="secondary" className="text-[10px]">
                          Já revisado: {reviewLabel[d.review_status] ?? d.review_status}
                        </Badge>
                      )}

                      <div className="grid gap-2 sm:grid-cols-2">
                        <div className="space-y-1">
                          <Label className="text-xs">Conclusão</Label>
                          <Select
                            value={draft.status || undefined}
                            onValueChange={(v) => setDraft(d.id, { status: v as ReviewStatus })}
                          >
                            <SelectTrigger className="h-9">
                              <SelectValue placeholder="Selecionar" />
                            </SelectTrigger>
                            <SelectContent>
                              {STATUS_OPTIONS.map((o) => (
                                <SelectItem key={o.value} value={o.value}>
                                  {o.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="space-y-1">
                          <Label className="text-xs">Observações</Label>
                          <Textarea
                            className="min-h-[36px]"
                            value={draft.notes}
                            onChange={(e) => setDraft(d.id, { notes: e.target.value })}
                            placeholder="O que foi apurado"
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>

          <DialogFooter className="mt-6">
            <Button variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button onClick={handleSubmit} disabled={isSaving || changed.length === 0}>
              {changed.length > 0 ? `Salvar ${changed.length} revisões` : "Salvar revisões"}
            </Button>
          </DialogFooter>
        </div>
      </DialogContent>
    </Dialog>
  );
};
