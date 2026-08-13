import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Palmtree,
  Plus,
  Check,
  X,
  CalendarClock,
  Wallet,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";


import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  daysBetween,
  requestTypeLabel,
  useCancelVacationRequest,
  useCreateVacationRequest,
  useDecideVacationRequest,
  useVacationConflicts,
  useVacationPeriods,
  useVacationRequests,
  useVacationRules,
  VacationRequestType,
} from "@/hooks/useVacations";
import { useAuth } from "@/contexts/AuthContext";
import { VacationYearGrid } from "@/components/hr/vacations/VacationYearGrid";
import { VacationMonthGrid } from "@/components/hr/vacations/VacationMonthGrid";
import { PeriodsTable } from "@/components/hr/vacations/PeriodsTable";
import { RequestsTable } from "@/components/hr/vacations/RequestsTable";
import { VacationRulesForm } from "@/components/hr/vacations/VacationRulesForm";

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

function NewRequestDialog({ trigger }: { trigger: React.ReactNode }) {
  const { profile, userRole } = useAuth();
  const isHRUser = ["hr", "director", "admin", "super_admin"].includes(userRole ?? "");
  const [open, setOpen] = useState(false);
  const employees = useEmployeeOptions();
  const create = useCreateVacationRequest();
  const rules = useVacationRules(profile?.company_id);
  const [employeeId, setEmployeeId] = useState<string>(profile?.id ?? "");
  const [employeeSearch, setEmployeeSearch] = useState("");
  const periods = useVacationPeriods(employeeId || undefined);
  const [type, setType] = useState<VacationRequestType>("vacation");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isSplit, setIsSplit] = useState(false);
  const [sellDays, setSellDays] = useState(0);
  const [advance13, setAdvance13] = useState(false);
  const [justification, setJustification] = useState("");

  const normalize = (v: string) =>
    v.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const filteredEmployees = useMemo(() => {
    const term = normalize(employeeSearch.trim());
    const list = employees.data ?? [];
    if (!term) return list;
    return list.filter((e) =>
      normalize(`${e.full_name ?? ""} ${e.position ?? ""}`).includes(term)
    );
  }, [employees.data, employeeSearch]);

  const invalidRange = Boolean(startDate && endDate && endDate < startDate);
  const days = startDate && endDate && !invalidRange ? daysBetween(startDate, endDate) : 0;
  const minDays = isSplit ? 5 : 14;
  const belowMinimum = type === "vacation" && days > 0 && days < minDays;
  const splitAgainstPolicy = isSplit && rules.data?.permite_divisao_ferias === false;
  const selectedEmployee = employees.data?.find((e) => e.id === employeeId);
  const managerId = selectedEmployee?.direct_manager_id ?? null;

  /** período aquisitivo mais antigo com saldo — vinculado automaticamente */
  const autoPeriodId = useMemo(() => {
    const withBalance = (periods.data ?? [])
      .filter((p) => p.entitled_days - p.used_days - p.sold_days > 0)
      .sort((a, b) => a.period_start.localeCompare(b.period_start));
    return withBalance[0]?.id ?? null;
  }, [periods.data]);

  const canSubmit =
    Boolean(employeeId && startDate && endDate) && !invalidRange && days > 0 && !belowMinimum;

  const submit = async () => {
    if (!canSubmit) return;
    await create.mutateAsync({
      employee_id: employeeId,
      period_id: autoPeriodId,
      request_type: type,
      start_date: startDate,
      end_date: endDate,
      requested_days: days,
      sell_days: sellDays,
      advance_13th: advance13,
      justification: justification || null,
      manager_id: managerId,
      created_by_hr_id: isHRUser ? (profile?.id ?? null) : null,
    });
    setOpen(false);
    setStartDate("");
    setEndDate("");
    setJustification("");
    setSellDays(0);
    setAdvance13(false);
    setIsSplit(false);
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger}</DialogTrigger>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Nova Solicitação de Férias</DialogTitle>
          <DialogDescription>
            Informe o colaborador e o período desejado de gozo.
          </DialogDescription>
        </DialogHeader>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2 space-y-2">
            <Label htmlFor="employee-search">Colaborador *</Label>
            {selectedEmployee && (
              <p className="text-sm">
                Selecionado:{" "}
                <strong>{selectedEmployee.full_name}</strong>
                {selectedEmployee.position && (
                  <span className="text-muted-foreground"> — {selectedEmployee.position}</span>
                )}
              </p>
            )}
            <Input
              id="employee-search"
              placeholder="Buscar colaborador por nome ou cargo..."
              value={employeeSearch}
              onChange={(e) => setEmployeeSearch(e.target.value)}
            />
            <div className="max-h-60 overflow-y-auto rounded-md border">
              {filteredEmployees.length === 0 ? (
                <p className="p-3 text-sm text-muted-foreground">
                  Nenhum colaborador encontrado.
                </p>
              ) : (
                filteredEmployees.map((e) => (
                  <button
                    key={e.id}
                    type="button"
                    onClick={() => setEmployeeId(e.id)}
                    className={cn(
                      "flex w-full items-center gap-2 px-3 py-2 text-left text-sm hover:bg-accent",
                      employeeId === e.id && "bg-accent font-medium"
                    )}
                  >
                    <Check
                      className={cn(
                        "h-4 w-4 shrink-0",
                        employeeId === e.id ? "opacity-100" : "opacity-0"
                      )}
                    />
                    <span className="truncate">
                      {e.full_name}
                      {e.position && (
                        <span className="text-muted-foreground"> — {e.position}</span>
                      )}
                    </span>
                  </button>
                ))
              )}
            </div>
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
            <Input
              type="date"
              value={endDate}
              min={startDate || undefined}
              onChange={(e) => setEndDate(e.target.value)}
            />
          </div>

          <div className="md:col-span-2 flex items-start gap-2">
            <input
              id="split"
              type="checkbox"
              className="mt-1"
              checked={isSplit}
              onChange={(e) => setIsSplit(e.target.checked)}
            />
            <div>
              <Label htmlFor="split" className="cursor-pointer">Dividir férias em parcelas</Label>
              <p className="text-xs text-muted-foreground">
                Marque para solicitar um período menor que 14 dias (mínimo de 5 dias por parcela).
              </p>
            </div>
          </div>

          <div className="md:col-span-2 space-y-1 text-sm text-muted-foreground">
            {invalidRange && (
              <div className="text-destructive">
                A data fim deve ser igual ou posterior à data de início.
              </div>
            )}
            {belowMinimum && (
              <div className="text-destructive">
                Férias devem ter no mínimo {minDays} dias corridos
                {isSplit ? " por parcela." : ", exceto quando divididas em parcelas."}
              </div>
            )}
            {days > 0 && !belowMinimum && (
              <div>Total: <strong>{days}</strong> dia(s) de gozo{sellDays > 0 && <> + {sellDays} de abono</>}.</div>
            )}
            {splitAgainstPolicy && (
              <div className="text-amber-600">
                ⚠ A política da empresa não prevê divisão de férias — a solicitação será registrada e
                dependerá de aprovação do RH.
              </div>
            )}
            {employeeId && isHRUser && (
              <div className="text-emerald-600">
                ✓ Cadastro pelo RH — a solicitação já será registrada como aprovada.
              </div>
            )}
            {employeeId && !isHRUser && !managerId && (
              <div className="text-amber-600">
                ⚠ Colaborador sem gestor direto — o RH decide diretamente.
              </div>
            )}
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
          <Button onClick={submit} disabled={create.isPending || !canSubmit}>
            {create.isPending
              ? "Salvando..."
              : isHRUser
                ? "Registrar e Aprovar"
                : "Enviar Solicitação"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}


function DecisionDialog({
  requestId,
  stage,
  bypassManager,
  trigger,
}: {
  requestId: string;
  stage: "manager" | "hr";
  bypassManager?: boolean;
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
      bypass_manager: bypassManager,
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
  const [mainTab, setMainTab] = useState("schedule");
  const [listFilter, setListFilter] = useState("all");
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth());
  const [viewMode, setViewMode] = useState<"year" | "month">("year");
  const requests = useVacationRequests();
  const periods = useVacationPeriods();
  const conflicts = useVacationConflicts();
  const rules = useVacationRules(profile?.company_id);
  const cancel = useCancelVacationRequest();
  const isHR = ["hr", "director", "admin", "super_admin"].includes(userRole ?? "");

  const filteredRequests = useMemo(() => {
    const list = requests.data ?? [];
    if (listFilter === "pending")
      return list.filter((r) => r.status === "pending_manager" || r.status === "pending_hr");
    if (listFilter === "approved") return list.filter((r) => r.status === "approved");
    if (listFilter === "conflicts") {
      const ids = new Set(
        (conflicts.data ?? []).filter((c) => !c.resolvido).map((c) => c.programacao_id)
      );
      return list.filter((r) => ids.has(r.id));
    }
    if (listFilter === "mine") return list.filter((r) => r.employee_id === profile?.id);
    if (listFilter === "team") return list.filter((r) => r.manager_id === profile?.id);
    return list;
  }, [requests.data, listFilter, profile?.id, conflicts.data]);

  const counters = useMemo(() => {
    const list = requests.data ?? [];
    return {
      pending: list.filter((r) => r.status === "pending_manager" || r.status === "pending_hr").length,
      approved: list.filter((r) => r.status === "approved").length,
      total: list.length,
      conflicts: (conflicts.data ?? []).filter((c) => !c.resolvido).length,
    };
  }, [requests.data, conflicts.data]);

  const expiringPeriods = useMemo(
    () =>
      (periods.data ?? []).filter((p) => p.status === "open" || p.status === "partially_used").length,
    [periods.data]
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-semibold flex items-center gap-2">
            <Palmtree className="h-6 w-6 text-primary" />
            Gestão de Férias
          </h1>
          <p className="text-sm text-muted-foreground">
            Programação anual, períodos aquisitivos (limite de gozo em 23 meses) e aprovação em duas
            etapas (Gestor → RH).
          </p>
        </div>
        <NewRequestDialog
          trigger={
            <Button aria-label="Nova Solicitação de Férias">
              <Plus className="h-4 w-4 mr-2" /> Nova Solicitação
            </Button>
          }
        />
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
              <CalendarClock className="h-4 w-4 text-amber-600" />Pendentes
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-amber-600">{counters.pending}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
              <Check className="h-4 w-4 text-emerald-600" />Aprovadas
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-emerald-600">{counters.approved}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-4 w-4 text-destructive" />Conflitos abertos
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold text-destructive">{counters.conflicts}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm text-muted-foreground flex items-center gap-1">
              <Wallet className="h-4 w-4" />Períodos Ativos
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-semibold">{expiringPeriods}</CardContent>
        </Card>
      </div>

      <Tabs value={mainTab} onValueChange={setMainTab}>
        <TabsList>
          <TabsTrigger value="schedule">Programação</TabsTrigger>
          <TabsTrigger value="requests">Solicitações</TabsTrigger>
          <TabsTrigger value="periods">Períodos Aquisitivos</TabsTrigger>
          <TabsTrigger value="rules">Regras</TabsTrigger>
        </TabsList>

        <TabsContent value="schedule" className="mt-4">
          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-3">
              <CardTitle className="text-base">
                {viewMode === "year"
                  ? `Programação anual ${year}`
                  : `Programação de ${format(new Date(year, month, 1), "MMMM 'de' yyyy", { locale: ptBR })}`}
              </CardTitle>
              <div className="flex items-center gap-3">
                <Tabs value={viewMode} onValueChange={(v) => setViewMode(v as "year" | "month")}>
                  <TabsList>
                    <TabsTrigger value="year">Ano</TabsTrigger>
                    <TabsTrigger value="month">Mês</TabsTrigger>
                  </TabsList>
                </Tabs>
                <div className="flex items-center gap-1">
                  <Button
                    size="icon"
                    variant="outline"
                    aria-label={viewMode === "year" ? "Ano anterior" : "Mês anterior"}
                    onClick={() => {
                      if (viewMode === "year") setYear(year - 1);
                      else if (month === 0) {
                        setMonth(11);
                        setYear(year - 1);
                      } else setMonth(month - 1);
                    }}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="min-w-[7rem] text-center font-medium">
                    {viewMode === "year"
                      ? year
                      : format(new Date(year, month, 1), "MMM yyyy", { locale: ptBR })}
                  </span>
                  <Button
                    size="icon"
                    variant="outline"
                    aria-label={viewMode === "year" ? "Próximo ano" : "Próximo mês"}
                    onClick={() => {
                      if (viewMode === "year") setYear(year + 1);
                      else if (month === 11) {
                        setMonth(0);
                        setYear(year + 1);
                      } else setMonth(month + 1);
                    }}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {requests.isLoading ? (
                <p className="py-8 text-center text-sm text-muted-foreground">Carregando...</p>
              ) : viewMode === "year" ? (
                <VacationYearGrid
                  year={year}
                  requests={requests.data ?? []}
                  conflicts={conflicts.data ?? []}
                  rules={rules.data ?? null}
                />
              ) : (
                <VacationMonthGrid
                  year={year}
                  month={month}
                  requests={requests.data ?? []}
                  conflicts={conflicts.data ?? []}
                  rules={rules.data ?? null}
                  companyId={profile?.company_id}
                />
              )}
            </CardContent>
          </Card>
        </TabsContent>


        <TabsContent value="requests" className="mt-4">
          <Card>
            <CardHeader>
              <Tabs value={listFilter} onValueChange={setListFilter}>
                <TabsList>
                  <TabsTrigger value="all">Todas</TabsTrigger>
                  <TabsTrigger value="pending">Pendentes</TabsTrigger>
                  <TabsTrigger value="approved">Aprovadas</TabsTrigger>
                  <TabsTrigger value="conflicts">Com conflito</TabsTrigger>
                  <TabsTrigger value="mine">Minhas</TabsTrigger>
                  <TabsTrigger value="team">Minha Equipe</TabsTrigger>
                </TabsList>
              </Tabs>
            </CardHeader>
            <CardContent>
              <RequestsTable
                requests={filteredRequests}
                allRequests={requests.data ?? []}

                conflicts={conflicts.data ?? []}
                isLoading={requests.isLoading}
                isHR={isHR}
                profileId={profile?.id}
                onCancel={(id) => cancel.mutate(id)}
                renderActions={(r) => (
                  <>
                    {r.status === "pending_manager" && r.manager_id === profile?.id && (
                      <DecisionDialog
                        requestId={r.id}
                        stage="manager"
                        trigger={<Button size="sm" variant="outline">Decidir</Button>}
                      />
                    )}
                    {isHR && (r.status === "pending_manager" || r.status === "pending_hr") && (
                      <DecisionDialog
                        requestId={r.id}
                        stage="hr"
                        bypassManager={r.status === "pending_manager"}
                        trigger={
                          <Button size="sm">
                            {r.status === "pending_manager" ? "Aprovar direto" : "Homologar"}
                          </Button>
                        }
                      />
                    )}
                  </>
                )}

              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="periods" className="mt-4">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Períodos aquisitivos e limite de gozo</CardTitle>
            </CardHeader>
            <CardContent>
              <PeriodsTable periods={periods.data ?? []} isLoading={periods.isLoading} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="rules" className="mt-4">
          <VacationRulesForm canEdit={isHR} />
        </TabsContent>
      </Tabs>
    </div>
  );
}
