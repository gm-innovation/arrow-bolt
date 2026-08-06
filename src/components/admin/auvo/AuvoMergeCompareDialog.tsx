import { useState } from "react";
import { format, parseISO } from "date-fns";
import { GitMerge, SplitSquareHorizontal, XCircle } from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { AuvoServiceReportTabs } from "./AuvoServiceReportTabs";
import type {
  AuvoMergeCandidate,
  AuvoMergeSuggestion,
  AuvoServiceMember,
} from "@/hooks/useAuvoServiceGroups";

const formatDate = (value?: string | null) =>
  value ? format(parseISO(value.slice(0, 10)), "dd/MM/yyyy") : "—";

const osLabel = (candidate: AuvoMergeCandidate) => {
  const all = Array.from(
    new Set([
      ...(candidate.order_numbers ?? []),
      ...(candidate.primary_order_number ? [candidate.primary_order_number] : []),
    ]),
  );
  return all.length ? `OS ${all.join(" + ")}` : "Sem número de OS";
};

interface Props {
  suggestion: AuvoMergeSuggestion | null;
  membersByGroup: Map<string, AuvoServiceMember[]>;
  onOpenChange: (open: boolean) => void;
  onMerge: (primaryGroupId: string, duplicateGroupIds: string[]) => void;
  onDismiss: (groupAId: string, groupBId: string, reason?: string) => void;
  isMerging: boolean;
  isDismissing: boolean;
}

const Side = ({
  candidate,
  members,
}: {
  candidate: AuvoMergeCandidate;
  members: AuvoServiceMember[];
}) => (
  <div className="flex min-h-0 flex-col gap-3 rounded-lg border p-3">
    <div className="space-y-1">
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">{osLabel(candidate)}</Badge>
        <span className="text-sm font-medium">
          {candidate.vessel_name ?? candidate.customer_name ?? "—"}
        </span>
      </div>
      <p className="text-xs text-muted-foreground">
        {candidate.customer_name ?? "—"} · {formatDate(candidate.first_task_date)} –{" "}
        {formatDate(candidate.last_task_date)} · {members.length} atendimento(s)
      </p>
    </div>
    <ScrollArea className="h-[52vh] pr-3">
      <AuvoServiceReportTabs members={members} />
    </ScrollArea>
  </div>
);

/** Compara dois serviços lado a lado para decidir se são o mesmo trabalho. */
export const AuvoMergeCompareDialog = ({
  suggestion,
  membersByGroup,
  onOpenChange,
  onMerge,
  onDismiss,
  isMerging,
  isDismissing,
}: Props) => {
  const [reason, setReason] = useState("");

  const close = () => {
    setReason("");
    onOpenChange(false);
  };

  return (
    <Dialog open={!!suggestion} onOpenChange={(open) => (open ? undefined : close())}>
      <DialogContent className="max-w-[95vw] xl:max-w-[1400px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SplitSquareHorizontal className="h-4 w-4" />
            Comparar serviços
          </DialogTitle>
          <DialogDescription>{suggestion?.reason}</DialogDescription>
        </DialogHeader>

        {suggestion && (
          <div className="grid gap-3 lg:grid-cols-2">
            <Side
              candidate={suggestion.primary}
              members={membersByGroup.get(suggestion.primary.id) ?? []}
            />
            <Side
              candidate={suggestion.duplicate}
              members={membersByGroup.get(suggestion.duplicate.id) ?? []}
            />
          </div>
        )}

        <div className="space-y-1.5">
          <Label htmlFor="dismiss-reason" className="text-xs text-muted-foreground">
            Motivo (opcional, usado ao descartar a duplicidade)
          </Label>
          <Textarea
            id="dismiss-reason"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Ex.: escopos diferentes, mesma embarcação em campanhas distintas."
            rows={2}
          />
        </div>

        <DialogFooter className="gap-2 sm:justify-between">
          <Button variant="ghost" onClick={close}>
            Fechar sem decidir
          </Button>
          <div className="flex flex-wrap gap-2">
            <Button
              variant="outline"
              disabled={isDismissing || !suggestion}
              onClick={() => {
                if (!suggestion) return;
                onDismiss(suggestion.primary.id, suggestion.duplicate.id, reason.trim() || undefined);
                close();
              }}
            >
              <XCircle className="mr-2 h-4 w-4" />
              Não são duplicatas
            </Button>
            <Button
              disabled={isMerging || !suggestion}
              onClick={() => {
                if (!suggestion) return;
                onMerge(suggestion.primary.id, [suggestion.duplicate.id]);
                close();
              }}
            >
              <GitMerge className="mr-2 h-4 w-4" />
              Unificar serviços
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
