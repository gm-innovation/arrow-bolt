import { useState } from "react";
import { format, parseISO } from "date-fns";
import { GitMerge, RefreshCw, SplitSquareHorizontal, Undo2, XCircle } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { AuvoMergeCompareDialog } from "./AuvoMergeCompareDialog";
import type {
  AuvoMergeDismissal,
  AuvoMergeSuggestion,
  AuvoServiceGroup,
  AuvoServiceMember,
} from "@/hooks/useAuvoServiceGroups";

const formatDate = (value?: string | null) =>
  value ? format(parseISO(value.slice(0, 10)), "dd/MM/yyyy") : "—";

const label = (
  order: string | null,
  key: string,
  numbers: string[] | null | undefined,
) => {
  const all = Array.from(new Set([...(numbers ?? []), ...(order ? [order] : [])]));
  if (all.length === 0) return key.startsWith("os:") ? `OS ${key.slice(3)}` : "Sem OS";
  return `OS ${all.join(" + ")}`;
};

interface Props {
  suggestions: AuvoMergeSuggestion[];
  isLoading: boolean;
  onRefresh: () => void;
  onMerge: (primaryGroupId: string, duplicateGroupIds: string[]) => void;
  isMerging: boolean;
  mergedGroups: AuvoServiceGroup[];
  onUnmerge: (groupId: string) => void;
  isUnmerging: boolean;
  membersByGroup: Map<string, AuvoServiceMember[]>;
  dismissals: AuvoMergeDismissal[];
  onDismiss: (groupAId: string, groupBId: string, reason?: string) => void;
  isDismissing: boolean;
  onUndoDismiss: (dismissalId: string) => void;
  groups: AuvoServiceGroup[];
}


/**
 * Serviços que provavelmente são o mesmo trabalho registrado com números de OS
 * diferentes (OS cancelada e reaberta, digitação, atendimento sem OS).
 */
export const AuvoMergeSuggestionsPanel = ({
  suggestions,
  isLoading,
  onRefresh,
  onMerge,
  isMerging,
  mergedGroups,
  onUnmerge,
  isUnmerging,
}: Props) => {
  const [confirm, setConfirm] = useState<AuvoMergeSuggestion | null>(null);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
          <div className="space-y-1.5">
            <CardTitle>Possíveis serviços duplicados</CardTitle>
            <CardDescription>
              Mesma embarcação, técnico em comum e escopo semelhante em datas próximas. Ao unificar,
              os atendimentos passam a ser auditados como um único serviço.
            </CardDescription>
          </div>
          <Button variant="outline" onClick={onRefresh} disabled={isLoading} className="shrink-0">
            <RefreshCw className={`mr-2 h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
            Reavaliar
          </Button>
        </CardHeader>

        <CardContent className="space-y-3">
          {isLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-20 w-full" />
              <Skeleton className="h-20 w-full" />
            </div>
          ) : suggestions.length === 0 ? (
            <p className="py-8 text-center text-muted-foreground">
              Nenhuma duplicidade sugerida no momento.
            </p>
          ) : (
            suggestions.map((s) => (
              <div
                key={`${s.primary.id}-${s.duplicate.id}`}
                className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">
                      {label(s.primary.primary_order_number, s.primary.service_key, s.primary.order_numbers)}
                    </Badge>
                    <GitMerge className="h-4 w-4 text-muted-foreground" />
                    <Badge variant="outline">
                      {label(s.duplicate.primary_order_number, s.duplicate.service_key, s.duplicate.order_numbers)}
                    </Badge>
                    <span className="text-sm font-medium">
                      {s.primary.vessel_name ?? s.primary.customer_name ?? "—"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{s.reason}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(s.primary.first_task_date)} – {formatDate(s.primary.last_task_date)}
                    {" · "}
                    {formatDate(s.duplicate.first_task_date)} – {formatDate(s.duplicate.last_task_date)}
                  </p>
                </div>
                <Button className="shrink-0" onClick={() => setConfirm(s)} disabled={isMerging}>
                  <GitMerge className="mr-2 h-4 w-4" />
                  Unificar serviços
                </Button>
              </div>
            ))
          )}
        </CardContent>
      </Card>

      {mergedGroups.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Serviços unificados</CardTitle>
            <CardDescription>
              Auditados como um único serviço. É possível desfazer e voltar à separação por OS.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {mergedGroups.map((g) => (
              <div
                key={g.id}
                className="flex flex-col gap-3 rounded-lg border p-4 md:flex-row md:items-center md:justify-between"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <Badge variant="secondary">
                      {label(g.primary_order_number, g.service_key, g.order_numbers)}
                    </Badge>
                    <span className="text-sm font-medium">
                      {g.vessel_name ?? g.customer_name ?? "—"}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{g.merge_reason}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(g.first_task_date)} – {formatDate(g.last_task_date)}
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="shrink-0"
                  onClick={() => onUnmerge(g.id)}
                  disabled={isUnmerging}
                >
                  <Undo2 className="mr-2 h-4 w-4" />
                  Desfazer unificação
                </Button>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <AlertDialog open={!!confirm} onOpenChange={(open) => !open && setConfirm(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Unificar os dois serviços?</AlertDialogTitle>
            <AlertDialogDescription>
              Os atendimentos passam para o serviço mais antigo, as OS envolvidas ficam registradas
              juntas e a auditoria de materiais e fotos é refeita sobre o conjunto. Você pode
              desfazer depois.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => {
                if (confirm) onMerge(confirm.primary.id, [confirm.duplicate.id]);
                setConfirm(null);
              }}
            >
              Unificar
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
