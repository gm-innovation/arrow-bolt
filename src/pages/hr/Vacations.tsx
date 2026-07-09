import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Palmtree, Plus, Check, X, CalendarClock, Wallet, AlertTriangle } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  daysBetween,
  requestStatusLabel,
  requestTypeLabel,
  useCancelVacationRequest,
  useCreateVacationRequest,
  useDecideVacationRequest,
  useVacationBalance,
  useVacationPeriods,
  useVacationRequests,
  VacationRequestStatus,
  VacationRequestType,
} from "@/hooks/useVacations";
import { useAuth } from "@/contexts/AuthContext";

function useEmployeeOptions() {
  return useQuery({
    queryKey: ["employee-options-for-hr"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("profiles")
        .select("id, full_name, position, direct_manager_id, status")
        .eq("status", "active")
        .order("full_name");
      if (error) throw error;
      return (data ?? []) as unknown as {
        id: string;
        full_name: string | null;
        position: string | null;
        direct_manager_id: string | null;
      }[];
    },
  });
}

function statusVariant(s: VacationRequestStatus) {
  if (s === "approved") return "default" as const;
  if (s === "rejected" || s === "cancelled") return "destructive" as const;
  return "secondary" as const;
}

function NewRequestDialog({ trigger }: { trigger: React.ReactNode }) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const employees = useEmployeeOptions();
  const create = useCreateVacationRequest();
  const [employeeId, setEmployeeId] = useState<string>(profile?.id ?? "");
  const periods = useVacationPeriods(employeeId || undefined);
  const [periodId, setPeriodId] = useState<string>("");
  const [type, setType] = useState<VacationRequestType>("vacation");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [sellDays, setSellDays] = useState(0);
  const [advance13, setAdvance13] = useState(false);
  const [justification, setJustification] = useState("");

  const days = startDate && endDate ? daysBetween(startDate, endDate) : 0;
  const selectedEmployee = employees.data?.find((e) => e.id === employeeId);
  const managerId = selectedEmployee?.direct_manager_id ?? null;

  const submit = async () => {
    if (!employeeId || !startDate || !endDate || days <= 0) return;
    await create.mutateAsync({
      employee_id: employeeId,
      period_id: periodId || null,
      request_type: type,
      start_date: startDate,
      end_date: endDate,
      requested_days: days,
      sell_days: sellDays,
      advance_13th: advance13,
      justification: justification || null,
      manager_id: managerId,
    });
    setOpen(false);
    setStartDate("");
    setEndDate("");
    setJustification("");
    setSellDays(0);
    setAdvance13(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nova Solicitação de Férias</DialogTitle>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <Label>Colaborador *</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
              <SelectContent>
                {(employees.data ?? []).map((e) => (
                  <SelectItem key={e.id} value={e.id}>
                    {e.full_name}{e.position ? ` — ${e.position}` : ""}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="md:col-span-2">
            <Label>Período Aquisitivo</Label>
            <Select value={periodId} onValueChange={setPeriodId} disabled={!employeeId}>
              <SelectTrigger><SelectValue placeholder="Vincular a um período" /></SelectTrigger>
              <SelectContent>
                {(periods.data ?? []).map((p) => (
                  <SelectItem key={p.id} value={p.id}>
                    {format(parseISO(p.period_start), "dd/MM/yyyy")} — {format(parseISO(p.period_end), "dd/MM/yyyy")} · saldo {p.entitled_days - p.used_days - p.sold_days}d
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Tipo *</Label>
            <Select value={type} onValueChange={(v) => setType(v as VacationRequestType)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {(Object.keys(requestTypeLabel) as VacationRequestType[]).map((t) => (
                  <SelectItem key={t} value={t}>{requestTypeLabel[t]}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Venda de Dias (Abono)</Label>
            <Input type="number" min={0} max={10} value={sellDays} onChange={(e) => setSellDays(Number(e.target.value) || 0)} />
          </div>

          <div>
            <Label>Início *</Label>
            <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
          </div>
          <div>
            <Label>Fim *</Label>
            <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
          </div>

          <div className="md:col-span-2 text-sm text-muted-foreground">
            {days > 0 && <>Total: <strong>{days}</strong> dia(s) de gozo{sellDays > 0 && <> + {sellDays} de abono</>}.</>}
            {!managerId && employeeId && <div className="text-amber-600 mt-1">⚠ Colaborador sem gestor direto — a solicitação irá direto para o RH.</div>}
          </div>

          <div className="md:col-span-2">
            <Label>Justificativa</Label>
            <Textarea rows={3} value={justification} onChange={(e) => setJustification(e.target.value)} />
          </div>

          <div className="md:col-span-2 flex items-center gap-2">
            <input id="a13" type="checkbox" checked={advance13} onChange={(e) => setAdvance13(e.target.checked)} />
            <Label htmlFor="a13" className="cursor-pointer">Solicitar adiantamento da 1ª parcela do 13º</Label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
          <Button onClick={submit} disabled={create.isPending || !employeeId || !startDate || !endDate}>
            {create.isPending ? "Enviando..." : "Enviar Solicitação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DecisionDialog({
  requestId,
  stage,
  trigger,
}: {
  requestId: string;
  stage: "manager" | "hr";
  trigger: React.ReactNode;
}) {
  const { profile } = useAuth();
  const [open, setOpen] = useState(false);
  const [comment, setComment] = useState("");
  const decide = useDecideVacationRequest();
  const run = async (decision: "approved" | "rejected") => {
    if (!profile?.id) return;
    await decide.mutateAsync({
      id: requestId,
      stage,
      decision,
      comment: comment || null,
      approver_id: profile.id,
    });
    setOpen(false);
    setComment("");
  };
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Decidir Solicitação ({stage === "manager" ? "Gestor" : "RH"})</DialogTitle>
        </DialogHeader>
        <div>
          <Label>Comentário</Label>
          <Textarea rows={3} value={comment} onChange={(e) => setComment(e.target.value)} />
        </div>
        <DialogFooter className="gap-2">
          <Button variant="destructive" onClick={() => run("rejected")} disabled={decide.isPending}>
            <X className="h-4 w-4 mr-1" /> Rejeitar
          </Button>
          <Button onClick={() => run("approved")} disabled={decide.isPending}>
            <Check className="h-4 w-4 mr-1" /> Aprovar
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default function Vacations() {
  const { profile, userRole } = useAuth();
  const [tab, setTab] = useState("all");
  const requests = useVacationRequests();
  const periods = useVacationPeriods();
  const cancel = useCancelVacationRequest();
  const isHR = ["hr", "director", "admin", "super_admin"].includes(userRole ?? "");

  const filteredRequests = useMemo(() => {
    const list = requests.data ?? [];
    if (tab === "pending") return list.filter((r) => r.status === "pending_manager" || r.status === "pending_hr");
    if (tab === "approved") return list.filter((r) => r.status === "approved");
    if (tab === "mine") return list.filter((r) => r.employee_id === profile?.id);
    if (tab === "team") return list.filter((r) => r.manager_id === profile?.id);
    return list;
  }, [requests.data, tab, profile?.id]);

  const counters = useMemo(() => {
    const list = requests.data ?? [];
    return {
      pending: list.filter((r) => r.status === "pending_manager" || r.status === "pending_hr").length,
      approved: list.filter((r) => r.status === "approved").length,
      total: list.length,
    };
  }, [requests.data]);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Palmtree className="h-6 w-6 text-primary" />
            Gestão de Férias
          </h1>
          <p className="text-sm text-muted-foreground">
            Períodos aquisitivos, saldo de dias e fluxo de aprovação em duas etapas (Gestor → RH).
          </p>
        </div>
        <NewRequestDialog
          trigger={
            <Button>
              <Plus className="h-4 w-4 mr-2" /> Nova Solicitação
            </Button>
          }
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground">Total</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">{counters.total}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><CalendarClock className="h-4 w-4 text-amber-600" />Pendentes</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold text-amber-600">{counters.pending}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><Check className="h-4 w-4 text-emerald-600" />Aprovadas</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold text-emerald-600">{counters.approved}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm text-muted-foreground flex items-center gap-1"><Wallet className="h-4 w-4" />Períodos Ativos</CardTitle></CardHeader>
          <CardContent className="text-2xl font-semibold">
            {(periods.data ?? []).filter((p) => p.status === "open" || p.status === "partially_used").length}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <Tabs value={tab} onValueChange={setTab}>
            <TabsList>
              <TabsTrigger value="all">Todas</TabsTrigger>
              <TabsTrigger value="pending">Pendentes</TabsTrigger>
              <TabsTrigger value="approved">Aprovadas</TabsTrigger>
              <TabsTrigger value="mine">Minhas</TabsTrigger>
              <TabsTrigger value="team">Minha Equipe</TabsTrigger>
            </TabsList>
          </Tabs>
        </CardHeader>
        <CardContent>
          <TabsContent value={tab} forceMount>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Dias</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requests.isLoading && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Carregando...</TableCell></TableRow>
                )}
                {!requests.isLoading && filteredRequests.length === 0 && (
                  <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma solicitação.</TableCell></TableRow>
                )}
                {filteredRequests.map((r) => {
                  const canManager = r.status === "pending_manager" && r.manager_id === profile?.id;
                  const canHR = r.status === "pending_hr" && isHR;
                  const canCancel =
                    (r.employee_id === profile?.id && r.status !== "approved" && r.status !== "cancelled") || isHR;
                  return (
                    <TableRow key={r.id}>
                      <TableCell className="font-medium">
                        {r.employee?.full_name ?? "—"}
                        {r.employee?.position && <div className="text-xs text-muted-foreground">{r.employee.position}</div>}
                      </TableCell>
                      <TableCell>{requestTypeLabel[r.request_type]}</TableCell>
                      <TableCell className="text-sm">
                        {format(parseISO(r.start_date), "dd/MM/yyyy", { locale: ptBR })}
                        {" → "}
                        {format(parseISO(r.end_date), "dd/MM/yyyy", { locale: ptBR })}
                      </TableCell>
                      <TableCell>
                        {r.requested_days}d
                        {r.sell_days > 0 && <span className="text-xs text-muted-foreground"> + {r.sell_days}d abono</span>}
                      </TableCell>
                      <TableCell><Badge variant={statusVariant(r.status)}>{requestStatusLabel[r.status]}</Badge></TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-1">
                          {canManager && (
                            <DecisionDialog requestId={r.id} stage="manager" trigger={<Button size="sm">Decidir</Button>} />
                          )}
                          {canHR && (
                            <DecisionDialog requestId={r.id} stage="hr" trigger={<Button size="sm">Homologar</Button>} />
                          )}
                          {canCancel && (
                            <Button size="sm" variant="ghost" onClick={() => cancel.mutate(r.id)}>
                              Cancelar
                            </Button>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TabsContent>
        </CardContent>
      </Card>

      {isHR && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <AlertTriangle className="h-4 w-4 text-amber-600" />
              Períodos Aquisitivos — próximos vencimentos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Período</TableHead>
                  <TableHead>Prazo de Gozo</TableHead>
                  <TableHead>Saldo</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {(periods.data ?? []).slice(0, 20).map((p) => {
                  const balance = p.entitled_days - p.used_days - p.sold_days;
                  return (
                    <TableRow key={p.id}>
                      <TableCell>{p.employee?.full_name ?? "—"}</TableCell>
                      <TableCell className="text-sm">
                        {format(parseISO(p.period_start), "dd/MM/yy")} → {format(parseISO(p.period_end), "dd/MM/yy")}
                      </TableCell>
                      <TableCell>{format(parseISO(p.concession_deadline), "dd/MM/yyyy")}</TableCell>
                      <TableCell>{balance}d</TableCell>
                      <TableCell>
                        <Badge variant={p.status === "fully_used" ? "secondary" : p.status === "expired" ? "destructive" : "default"}>
                          {p.status}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
