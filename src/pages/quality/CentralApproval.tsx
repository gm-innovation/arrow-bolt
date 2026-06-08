import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

import { ShieldCheck, Crown, Check, X, Users, Clock, History, MessageSquarePlus, ChevronDown } from "lucide-react";
import { useQualitySettings, type ApprovalScope } from "@/hooks/useQualitySettings";
import {
  useCentralApprovalsQueue,
  useCentralApprovalEvents,
  type CentralApproval as CentralApprovalRow,
} from "@/hooks/useCentralApproval";
import { useCompanyUsers } from "@/hooks/useCompanyUsers";
import { format, parseISO, differenceInHours } from "date-fns";

const SCOPE_LABELS: Record<keyof ApprovalScope, string> = {
  document: "Documentos do SGQ",
  company_document: "Documentos da Empresa",
  process: "Processos",
  policy: "Política da Qualidade",
  context_official: "Snapshot oficial de Contexto",
  ncr: "Não-Conformidades (fechamento)",
  deviation: "Desvios",
};

const ENTITY_LABELS: Record<string, string> = {
  document: "Documento",
  company_document: "Documento da Empresa",
  process: "Processo",
  policy: "Política",
  context_official: "Contexto (oficial)",
  ncr: "NC",
  deviation: "Desvio",
};

const EVENT_LABELS: Record<string, string> = {
  requested: "Solicitação enviada",
  approved: "Aprovado",
  rejected: "Rejeitado",
  commented: "Comentário",
  reassigned: "Reatribuído",
};

const slaState = (requestedAt: string, slaHours: number) => {
  const elapsed = differenceInHours(new Date(), parseISO(requestedAt));
  if (elapsed >= slaHours) return { label: "Vencido", variant: "destructive" as const, elapsed };
  if (elapsed >= slaHours * 0.75) return { label: "Atenção", variant: "outline" as const, elapsed };
  return { label: "No prazo", variant: "secondary" as const, elapsed };
};

const TrailRow = ({ row, slaHours, masterName }: { row: CentralApprovalRow; slaHours: number; masterName: string }) => {
  const [open, setOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const { events } = useCentralApprovalEvents(open ? row.id : undefined);
  const { decide, comment } = useCentralApprovalsQueue();
  const { canDecideCentral } = useQualitySettings();
  const sla = slaState(row.requested_at, slaHours);

  return (
    <>
      <TableRow>
        <TableCell>
          <Badge variant="outline">{ENTITY_LABELS[row.entity_type] || row.entity_type}</Badge>
        </TableCell>
        <TableCell className="text-sm">{format(parseISO(row.requested_at), "dd/MM/yyyy HH:mm")}</TableCell>
        <TableCell>
          <Badge variant={sla.variant} className="gap-1">
            <Clock className="h-3 w-3" />
            {sla.label} · {sla.elapsed}h
          </Badge>
        </TableCell>
        <TableCell className="text-sm max-w-[260px] truncate">{row.notes || "—"}</TableCell>
        <TableCell className="flex gap-1">
          {canDecideCentral && (
            <>
              <Button size="sm" onClick={() => decide.mutate({ id: row.id, status: "approved" })}>
                <Check className="h-4 w-4 mr-1" />Aprovar
              </Button>
              <Button size="sm" variant="destructive" onClick={() => decide.mutate({ id: row.id, status: "rejected" })}>
                <X className="h-4 w-4 mr-1" />Rejeitar
              </Button>
            </>
          )}
          <Button size="sm" variant="ghost" onClick={() => setOpen(!open)}>
            <History className="h-4 w-4 mr-1" />Trilha
            <ChevronDown className={`h-3 w-3 ml-1 transition ${open ? "rotate-180" : ""}`} />
          </Button>
        </TableCell>
      </TableRow>
      {open && (
        <TableRow>
          <TableCell colSpan={5} className="bg-muted/30">
            <div className="space-y-3 p-2">
              <p className="text-xs text-muted-foreground">
                Master responsável: <span className="font-medium">{masterName}</span> ·
                SLA configurado: {slaHours}h
              </p>
              <div className="space-y-1">
                {events.length === 0 && <p className="text-xs text-muted-foreground">Sem eventos registrados.</p>}
                {events.map((e) => (
                  <div key={e.id} className="text-xs border-l-2 border-primary/40 pl-3 py-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline" className="text-[10px]">{EVENT_LABELS[e.event_type] ?? e.event_type}</Badge>
                      <span className="text-muted-foreground">
                        {format(parseISO(e.created_at), "dd/MM/yyyy HH:mm")}
                      </span>
                    </div>
                    {e.comment && <p className="mt-1 whitespace-pre-wrap">{e.comment}</p>}
                  </div>
                ))}
              </div>
              {canDecideCentral && (
                <div className="flex gap-2 items-start">
                  <Textarea
                    rows={2}
                    placeholder="Adicionar comentário…"
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    className="text-sm"
                  />
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={!commentText.trim() || comment.isPending}
                    onClick={() => {
                      comment.mutate({ approval: row, text: commentText }, {
                        onSuccess: () => setCommentText(""),
                      });
                    }}
                  >
                    <MessageSquarePlus className="h-4 w-4 mr-1" />Comentar
                  </Button>
                </div>
              )}
            </div>
          </TableCell>
        </TableRow>
      )}
    </>
  );
};

const CentralApproval = () => {
  const {
    settings, approvalScope, isMaster, isDelegate, delegateActive,
    slaHours, upsert,
  } = useQualitySettings();
  const { data: users = [] } = useCompanyUsers();
  const { pending } = useCentralApprovalsQueue();

  const usersList = users as { id: string; full_name: string }[];
  const masterName = usersList.find((u) => u.id === settings?.quality_master_user_id)?.full_name ?? "—";
  const delegateName = usersList.find((u) => u.id === settings?.master_delegate_user_id)?.full_name ?? "—";

  const [slaDraft, setSlaDraft] = useState<number>(slaHours);

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Aprovação central / workflow
        </h3>
        <p className="text-sm text-muted-foreground">
          Designe o Master, configure delegação e SLA, e acompanhe a trilha completa de aprovações.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Crown className="h-4 w-4" />Master de Qualidade
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Usuário designado (aprova centralmente)</Label>
            <Select
              value={settings?.quality_master_user_id || "none"}
              onValueChange={(v) => upsert.mutate({ quality_master_user_id: v === "none" ? null : v })}
            >
              <SelectTrigger className="max-w-md"><SelectValue placeholder="Selecionar usuário" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Nenhum —</SelectItem>
                {usersList.map((u) => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex flex-wrap gap-2 text-xs">
            {isMaster && <Badge className="bg-emerald-600">Você é o Master</Badge>}
            {isDelegate && <Badge className="bg-amber-600">Você está como delegado vigente</Badge>}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Users className="h-4 w-4" />Delegação temporária
          </CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3">
          <div>
            <Label>Delegado (substitui o Master enquanto vigente)</Label>
            <Select
              value={settings?.master_delegate_user_id || "none"}
              onValueChange={(v) =>
                upsert.mutate({ master_delegate_user_id: v === "none" ? null : v })
              }
              disabled={!isMaster}
            >
              <SelectTrigger><SelectValue placeholder="Sem delegação" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="none">— Sem delegação —</SelectItem>
                {usersList
                  .filter((u) => u.id !== settings?.quality_master_user_id)
                  .map((u) => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Vigência até</Label>
            <Input
              type="datetime-local"
              value={
                settings?.master_delegate_until
                  ? settings.master_delegate_until.slice(0, 16)
                  : ""
              }
              onChange={(e) =>
                upsert.mutate({
                  master_delegate_until: e.target.value
                    ? new Date(e.target.value).toISOString()
                    : null,
                })
              }
              disabled={!isMaster}
            />
            <p className="text-xs text-muted-foreground mt-1">
              {delegateActive
                ? `Delegação ativa para ${delegateName}.`
                : settings?.master_delegate_user_id
                ? "Delegação configurada mas vencida."
                : "Sem delegação ativa."}
            </p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="h-4 w-4" />SLA da fila central
          </CardTitle>
        </CardHeader>
        <CardContent className="flex flex-wrap items-end gap-3">
          <div>
            <Label>Prazo (horas) por solicitação</Label>
            <Input
              type="number"
              min={1}
              value={slaDraft}
              onChange={(e) => setSlaDraft(Number(e.target.value) || 0)}
              className="w-32"
              disabled={!isMaster}
            />
          </div>
          <Button
            size="sm"
            disabled={!isMaster || slaDraft <= 0 || slaDraft === slaHours}
            onClick={() => upsert.mutate({ central_approval_sla_hours: slaDraft })}
          >
            Salvar SLA
          </Button>
          <p className="text-xs text-muted-foreground">
            Solicitações sem decisão dentro desse prazo aparecem como "Vencido" na fila.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Escopo da aprovação central</CardTitle>
        </CardHeader>
        <CardContent className="grid sm:grid-cols-2 gap-3">
          {(Object.keys(SCOPE_LABELS) as (keyof ApprovalScope)[]).map((k) => (
            <div key={k} className="flex items-center justify-between border rounded p-3">
              <Label className="cursor-pointer">{SCOPE_LABELS[k]}</Label>
              <Switch
                checked={approvalScope[k]}
                onCheckedChange={(v) => upsert.mutate({ approval_scope: { [k]: v } as any })}
              />
            </div>
          ))}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Fila de aprovações pendentes</CardTitle>
        </CardHeader>
        <CardContent className="p-0">
          {pending.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">Sem aprovações pendentes.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Solicitada em</TableHead>
                  <TableHead>SLA</TableHead>
                  <TableHead>Notas</TableHead>
                  <TableHead className="w-64">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {pending.map((a) => (
                  <TrailRow key={a.id} row={a} slaHours={slaHours} masterName={masterName} />
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default CentralApproval;
