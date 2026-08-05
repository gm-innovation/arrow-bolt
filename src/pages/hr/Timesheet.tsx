import { useMemo, useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Clock,
  Cog,
  Lock,
  RefreshCw,
  Unlock,
  Users,
  Wallet,
  XCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useHRTimesheet, type TimeclockDevice, type TimesheetDay } from '@/hooks/useHRTimesheet';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const statusLabel: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' }> = {
  ok: { label: 'Normal', variant: 'default' },
  late: { label: 'Atraso', variant: 'destructive' },
  pending: { label: 'Pendência', variant: 'destructive' },
  absence: { label: 'Ausência', variant: 'secondary' },
  vacation: { label: 'Férias', variant: 'secondary' },
  holiday: { label: 'Feriado', variant: 'outline' },
  weekend: { label: 'Folga', variant: 'outline' },
};

const hhmm = (hours: number) => {
  const sign = hours < 0 ? '-' : '';
  const abs = Math.abs(Number(hours ?? 0));
  const h = Math.floor(abs);
  const m = Math.round((abs - h) * 60);
  return `${sign}${h}h${String(m).padStart(2, '0')}`;
};
const timeOnly = (iso: string | null) => (iso ? format(new Date(iso), 'HH:mm') : '—');

const HRTimesheet = () => {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [employeeId, setEmployeeId] = useState<string>('all');
  const selectedEmployee = employeeId === 'all' ? undefined : employeeId;

  const ts = useHRTimesheet(year, month, selectedEmployee);
  const [editDay, setEditDay] = useState<TimesheetDay | null>(null);
  const [deviceDialog, setDeviceDialog] = useState<Partial<TimeclockDevice> | null>(null);

  const days = ts.days.data ?? [];
  const overtimePending = (ts.overtime.data ?? []).filter((o) => o.status === 'pending');
  const pendingIssues = days.filter((d) => d.status === 'pending');
  const closures = ts.closures.data ?? [];
  const isClosed =
    closures.length > 0 &&
    closures.filter((c) => !selectedEmployee || c.employee_id === selectedEmployee)
      .every((c) => c.status === 'closed');

  const totals = useMemo(() => {
    const sum = (pick: (d: TimesheetDay) => number) =>
      days.reduce((a, d) => a + Number(pick(d) ?? 0), 0);
    return {
      worked: sum((d) => d.worked_hours),
      extra: sum((d) => d.hours_extra),
      night: sum((d) => d.hours_night),
      balance: sum((d) => d.balance_hours),
    };
  }, [days]);

  const pendingCorrections = (ts.corrections.data ?? []).filter((c) => c.status === 'pending');

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Ponto e Jornada</h1>
          <p className="text-muted-foreground">
            Espelho de ponto, banco de horas e integração com o relógio biométrico.
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label className="text-xs">Mês</Label>
            <Select value={String(month)} onValueChange={(v) => setMonth(Number(v))}>
              <SelectTrigger className="w-[150px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {MONTHS.map((m, i) => (
                  <SelectItem key={m} value={String(i + 1)}>{m}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Ano</Label>
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-[110px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                {[year - 1, year, year + 1].map((y) => (
                  <SelectItem key={y} value={String(y)}>{y}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1">
            <Label className="text-xs">Colaborador</Label>
            <Select value={employeeId} onValueChange={setEmployeeId}>
              <SelectTrigger className="w-[220px]"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {(ts.employees.data ?? []).map((e) => (
                  <SelectItem key={e.id} value={e.id}>{e.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <Button
            variant="outline"
            onClick={() => ts.syncPunches.mutate(undefined)}
            disabled={ts.syncPunches.isPending}
          >
            <RefreshCw className={`h-4 w-4 mr-2 ${ts.syncPunches.isPending ? 'animate-spin' : ''}`} />
            Sincronizar relógio
          </Button>
          <Button onClick={() => ts.runCompute.mutate('compute')} disabled={ts.runCompute.isPending}>
            <CalendarClock className="h-4 w-4 mr-2" />
            Apurar período
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Horas trabalhadas</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{hhmm(totals.worked)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Horas extras</CardTitle>
            <CheckCircle2 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{hhmm(totals.extra)}</div>
            <p className="text-xs text-muted-foreground">{overtimePending.length} aguardando aprovação</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Saldo do período</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${totals.balance < 0 ? 'text-destructive' : ''}`}>
              {hhmm(totals.balance)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Pendências</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{pendingIssues.length}</div>
            <p className="text-xs text-muted-foreground">{pendingCorrections.length} pedidos de ajuste</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="mirror">
        <TabsList className="flex-wrap h-auto">
          <TabsTrigger value="mirror">Espelho</TabsTrigger>
          <TabsTrigger value="overtime">Horas extras</TabsTrigger>
          <TabsTrigger value="bank">Banco de horas</TabsTrigger>
          <TabsTrigger value="corrections">Ajustes</TabsTrigger>
          <TabsTrigger value="devices">Relógios</TabsTrigger>
          <TabsTrigger value="settings">Parâmetros</TabsTrigger>
        </TabsList>

        <TabsContent value="mirror" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Espelho de ponto — {MONTHS[month - 1]}/{year}</CardTitle>
                <CardDescription>
                  {isClosed ? 'Período fechado.' : 'Período aberto — reapure sempre que houver novas batidas.'}
                </CardDescription>
              </div>
              <div className="flex gap-2">
                {isClosed ? (
                  <Button variant="outline" onClick={() => ts.runCompute.mutate('reopen')}>
                    <Unlock className="h-4 w-4 mr-2" /> Reabrir
                  </Button>
                ) : (
                  <Button variant="outline" onClick={() => ts.runCompute.mutate('close')}>
                    <Lock className="h-4 w-4 mr-2" /> Fechar período
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Data</TableHead>
                      {!selectedEmployee && <TableHead>Colaborador</TableHead>}
                      <TableHead>Entrada</TableHead>
                      <TableHead>Saída</TableHead>
                      <TableHead>Trabalhado</TableHead>
                      <TableHead>Previsto</TableHead>
                      <TableHead>Extra</TableHead>
                      <TableHead>Noturno</TableHead>
                      <TableHead>Saldo</TableHead>
                      <TableHead>Situação</TableHead>
                      <TableHead className="text-right">Ação</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {days.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={11} className="text-center text-muted-foreground py-8">
                          Nenhuma apuração para o período. Sincronize o relógio e clique em "Apurar período".
                        </TableCell>
                      </TableRow>
                    )}
                    {days.map((d) => {
                      const s = statusLabel[d.status] ?? statusLabel.ok;
                      return (
                        <TableRow key={d.id}>
                          <TableCell>{format(parseISO(d.work_date), 'dd/MM (EEE)', { locale: ptBR })}</TableCell>
                          {!selectedEmployee && <TableCell>{ts.nameOf(d.employee_id)}</TableCell>}
                          <TableCell>{timeOnly(d.first_in)}</TableCell>
                          <TableCell>{timeOnly(d.last_out)}</TableCell>
                          <TableCell>{hhmm(d.worked_hours)}</TableCell>
                          <TableCell>{hhmm(d.expected_hours)}</TableCell>
                          <TableCell>{hhmm(d.hours_extra)}</TableCell>
                          <TableCell>{hhmm(d.hours_night)}</TableCell>
                          <TableCell className={Number(d.balance_hours) < 0 ? 'text-destructive' : ''}>
                            {hhmm(d.balance_hours)}
                          </TableCell>
                          <TableCell>
                            <div className="flex items-center gap-1">
                              <Badge variant={s.variant}>{s.label}</Badge>
                              {d.manual_override && <Badge variant="outline">Ajustado</Badge>}
                            </div>
                          </TableCell>
                          <TableCell className="text-right">
                            <Button size="sm" variant="ghost" onClick={() => setEditDay(d)}>Ajustar</Button>
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="overtime">
          <Card>
            <CardHeader>
              <CardTitle>Aprovação de horas extras</CardTitle>
              <CardDescription>Só as horas aprovadas entram no banco de horas no fechamento.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Extra</TableHead>
                    <TableHead>Noturno</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(ts.overtime.data ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Nenhuma hora extra no período.
                      </TableCell>
                    </TableRow>
                  )}
                  {(ts.overtime.data ?? []).map((o) => (
                    <TableRow key={o.id}>
                      <TableCell>{format(parseISO(o.work_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{ts.nameOf(o.employee_id)}</TableCell>
                      <TableCell>{hhmm(o.hours_extra)}</TableCell>
                      <TableCell>{hhmm(o.hours_night)}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            o.status === 'approved' ? 'default' : o.status === 'rejected' ? 'destructive' : 'secondary'
                          }
                        >
                          {o.status === 'approved' ? 'Aprovada' : o.status === 'rejected' ? 'Recusada' : 'Pendente'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        {o.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => ts.decideOvertime.mutate({ ids: [o.id], approve: true })}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => ts.decideOvertime.mutate({ ids: [o.id], approve: false })}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
              {overtimePending.length > 1 && (
                <div className="pt-4">
                  <Button
                    variant="outline"
                    onClick={() =>
                      ts.decideOvertime.mutate({ ids: overtimePending.map((o) => o.id), approve: true })
                    }
                  >
                    Aprovar todas as {overtimePending.length} pendentes
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="bank">
          <Card>
            <CardHeader>
              <CardTitle>Banco de horas</CardTitle>
              <CardDescription>Créditos de horas extras aprovadas e débitos de horas devidas.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="grid gap-3 md:grid-cols-3">
                {(ts.employees.data ?? [])
                  .filter((e) => !selectedEmployee || e.id === selectedEmployee)
                  .filter((e) => ts.timeBankBalance(e.id) !== 0)
                  .map((e) => (
                    <div key={e.id} className="rounded-lg border p-3">
                      <p className="text-sm font-medium">{e.full_name}</p>
                      <p
                        className={`text-xl font-bold ${ts.timeBankBalance(e.id) < 0 ? 'text-destructive' : ''}`}
                      >
                        {hhmm(ts.timeBankBalance(e.id))}
                      </p>
                    </div>
                  ))}
              </div>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Horas</TableHead>
                    <TableHead>Expira em</TableHead>
                    <TableHead>Descrição</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(ts.timeBank.data ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                        Nenhum lançamento no banco de horas.
                      </TableCell>
                    </TableRow>
                  )}
                  {(ts.timeBank.data ?? []).map((e) => (
                    <TableRow key={e.id}>
                      <TableCell>{format(parseISO(e.entry_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{ts.nameOf(e.employee_id)}</TableCell>
                      <TableCell>
                        <Badge variant={e.kind === 'credit' ? 'default' : 'secondary'}>
                          {e.kind === 'credit' ? 'Crédito' : 'Débito'}
                        </Badge>
                      </TableCell>
                      <TableCell>{hhmm(e.hours)}</TableCell>
                      <TableCell>{e.expires_at ? format(parseISO(e.expires_at), 'dd/MM/yyyy') : '—'}</TableCell>
                      <TableCell className="text-muted-foreground">{e.description ?? '—'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="corrections">
          <Card>
            <CardHeader>
              <CardTitle>Pedidos de ajuste de ponto</CardTitle>
              <CardDescription>Solicitações enviadas pelos colaboradores no portal.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Data</TableHead>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Entrada</TableHead>
                    <TableHead>Saída</TableHead>
                    <TableHead>Motivo</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(ts.corrections.data ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                        Nenhuma solicitação de ajuste.
                      </TableCell>
                    </TableRow>
                  )}
                  {(ts.corrections.data ?? []).map((c) => (
                    <TableRow key={c.id}>
                      <TableCell>{format(parseISO(c.work_date), 'dd/MM/yyyy')}</TableCell>
                      <TableCell>{ts.nameOf(c.employee_id)}</TableCell>
                      <TableCell>{c.requested_check_in?.slice(0, 5) ?? '—'}</TableCell>
                      <TableCell>{c.requested_check_out?.slice(0, 5) ?? '—'}</TableCell>
                      <TableCell className="max-w-[280px] truncate">{c.reason}</TableCell>
                      <TableCell>
                        <Badge
                          variant={
                            c.status === 'approved' ? 'default' : c.status === 'rejected' ? 'destructive' : 'secondary'
                          }
                        >
                          {c.status === 'approved' ? 'Aprovado' : c.status === 'rejected' ? 'Recusado' : 'Pendente'}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        {c.status === 'pending' && (
                          <>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => ts.reviewCorrection.mutate({ id: c.id, approve: true })}
                            >
                              <CheckCircle2 className="h-4 w-4" />
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => ts.reviewCorrection.mutate({ id: c.id, approve: false })}
                            >
                              <XCircle className="h-4 w-4" />
                            </Button>
                          </>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="devices" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Relógios de ponto</CardTitle>
                <CardDescription>
                  Control iD (iDClass / iDAccess). A configuração da conexão é feita pelo Super Admin em
                  "API &amp; Integrações". Aqui você acompanha o status e importa as batidas.
                </CardDescription>
              </div>
              <Button variant="outline" onClick={() => ts.syncPunches.mutate(undefined)} disabled={ts.syncPunches.isPending}>
                <RefreshCw className="h-4 w-4 mr-2" /> Sincronizar batidas
              </Button>
            </CardHeader>

            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Nome</TableHead>
                    <TableHead>Endereço</TableHead>
                    <TableHead>Ativo</TableHead>
                    <TableHead>Última sincronização</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(ts.devices.data ?? []).length === 0 && (
                    <TableRow>
                      <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                        Nenhum relógio configurado. Solicite o cadastro ao Super Admin em "API &amp; Integrações".
                      </TableCell>
                    </TableRow>
                  )}
                  {(ts.devices.data ?? []).map((d) => (
                    <TableRow key={d.id}>
                      <TableCell className="font-medium">{d.name}</TableCell>
                      <TableCell className="text-muted-foreground">{d.base_url}</TableCell>
                      <TableCell>
                        <Badge variant={d.is_active ? 'default' : 'secondary'}>
                          {d.is_active ? 'Ativo' : 'Inativo'}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {d.last_sync_at ? format(new Date(d.last_sync_at), "dd/MM/yyyy HH:mm") : '—'}
                      </TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" variant="ghost" onClick={() => ts.syncPunches.mutate(d.id)} disabled={ts.syncPunches.isPending}>
                          <RefreshCw className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}

                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-4 w-4" /> Matrículas no relógio
              </CardTitle>
              <CardDescription>
                Informe o número de matrícula cadastrado no equipamento para vincular as batidas ao colaborador.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 md:grid-cols-2">
              {(ts.employees.data ?? []).map((e) => (
                <div key={e.id} className="flex items-center gap-3">
                  <span className="flex-1 text-sm truncate">{e.full_name}</span>
                  <Input
                    className="w-32"
                    defaultValue={(e as { timeclock_pin?: string }).timeclock_pin ?? ''}
                    placeholder="Matrícula"
                    onBlur={(ev) => {
                      const pin = ev.target.value.trim();
                      if (pin !== ((e as { timeclock_pin?: string }).timeclock_pin ?? '')) {
                        ts.savePin.mutate({ id: e.id, pin });
                      }
                    }}
                  />
                </div>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Histórico de sincronizações</CardTitle>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Início</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead>Lidas</TableHead>
                    <TableHead>Novas</TableHead>
                    <TableHead>Sem vínculo</TableHead>
                    <TableHead>Erro</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {(ts.syncLogs.data ?? []).map((l: Record<string, unknown>) => (
                    <TableRow key={String(l.id)}>
                      <TableCell>{format(new Date(String(l.started_at)), 'dd/MM/yyyy HH:mm')}</TableCell>
                      <TableCell>
                        <Badge variant={l.status === 'success' ? 'default' : l.status === 'error' ? 'destructive' : 'secondary'}>
                          {String(l.status)}
                        </Badge>
                      </TableCell>
                      <TableCell>{Number(l.punches_read ?? 0)}</TableCell>
                      <TableCell>{Number(l.punches_inserted ?? 0)}</TableCell>
                      <TableCell>{Number(l.punches_unmatched ?? 0)}</TableCell>
                      <TableCell className="text-destructive text-xs max-w-[260px] truncate">
                        {(l.error_message as string) ?? ''}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings">
          <JourneySettingsForm ts={ts} />
        </TabsContent>
      </Tabs>

      {/* Ajuste manual do dia */}
      <Dialog open={!!editDay} onOpenChange={(o) => !o && setEditDay(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Ajustar {editDay ? format(parseISO(editDay.work_date), 'dd/MM/yyyy') : ''}
            </DialogTitle>
          </DialogHeader>
          {editDay && (
            <form
              className="space-y-4"
              onSubmit={(e) => {
                e.preventDefault();
                const form = new FormData(e.currentTarget);
                const worked = Number(form.get('worked_hours'));
                const expected = Number(editDay.expected_hours);
                const extra = Math.max(0, worked - expected);
                ts.updateDay.mutate(
                  {
                    id: editDay.id,
                    worked_hours: worked,
                    hours_extra: extra,
                    hours_normal: Math.min(worked, expected),
                    balance_hours: worked - expected,
                    late_minutes: worked < expected ? Math.round((expected - worked) * 60) : 0,
                    status: worked >= expected ? 'ok' : 'late',
                    issues: [],
                    override_reason: String(form.get('override_reason') ?? ''),
                  },
                  { onSuccess: () => setEditDay(null) },
                );
              }}
            >
              <div className="space-y-2">
                <Label>Horas trabalhadas</Label>
                <Input
                  name="worked_hours"
                  type="number"
                  step="0.25"
                  min="0"
                  defaultValue={editDay.worked_hours}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label>Justificativa do ajuste</Label>
                <Textarea name="override_reason" defaultValue={editDay.override_reason ?? ''} required />
              </div>
              <p className="text-xs text-muted-foreground">
                Dias ajustados manualmente não são sobrescritos nas próximas apurações.
              </p>
              <div className="flex justify-end gap-2">
                <Button type="button" variant="outline" onClick={() => setEditDay(null)}>Cancelar</Button>
                <Button type="submit" disabled={ts.updateDay.isPending}>Salvar</Button>
              </div>
            </form>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
};

const JourneySettingsForm = ({ ts }: { ts: ReturnType<typeof useHRTimesheet> }) => {
  const s = ts.settings.data;
  return (
    <Card>
      <CardHeader>
        <CardTitle>Parâmetros de jornada</CardTitle>
        <CardDescription>Base de cálculo da apuração diária e do banco de horas.</CardDescription>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-4"
          onSubmit={(e) => {
            e.preventDefault();
            const f = new FormData(e.currentTarget);
            ts.saveSettings.mutate({
              daily_hours: Number(f.get('daily_hours')),
              weekly_hours: Number(f.get('weekly_hours')),
              break_minutes: Number(f.get('break_minutes')),
              tolerance_minutes: Number(f.get('tolerance_minutes')),
              night_start: String(f.get('night_start')),
              night_end: String(f.get('night_end')),
              overtime_mode: String(f.get('overtime_mode')),
              time_bank_expiry_months: Number(f.get('time_bank_expiry_months')),
              requires_overtime_approval: f.get('requires_overtime_approval') === 'on',
            });
          }}
        >
          <div className="grid gap-4 md:grid-cols-3">
            <div className="space-y-2">
              <Label>Horas por dia</Label>
              <Input name="daily_hours" type="number" step="0.5" defaultValue={s?.daily_hours ?? 8} />
            </div>
            <div className="space-y-2">
              <Label>Horas por semana</Label>
              <Input name="weekly_hours" type="number" step="0.5" defaultValue={s?.weekly_hours ?? 44} />
            </div>
            <div className="space-y-2">
              <Label>Intervalo (min)</Label>
              <Input name="break_minutes" type="number" defaultValue={s?.break_minutes ?? 60} />
            </div>
            <div className="space-y-2">
              <Label>Tolerância (min)</Label>
              <Input name="tolerance_minutes" type="number" defaultValue={s?.tolerance_minutes ?? 10} />
            </div>
            <div className="space-y-2">
              <Label>Início do adicional noturno</Label>
              <Input name="night_start" type="time" defaultValue={(s?.night_start ?? '22:00').slice(0, 5)} />
            </div>
            <div className="space-y-2">
              <Label>Fim do adicional noturno</Label>
              <Input name="night_end" type="time" defaultValue={(s?.night_end ?? '05:00').slice(0, 5)} />
            </div>
            <div className="space-y-2">
              <Label>Tratamento das horas extras</Label>
              <Select name="overtime_mode" defaultValue={s?.overtime_mode ?? 'time_bank'}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="time_bank">Banco de horas</SelectItem>
                  <SelectItem value="paid">Pagamento em folha</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Validade do banco (meses)</Label>
              <Input
                name="time_bank_expiry_months"
                type="number"
                defaultValue={s?.time_bank_expiry_months ?? 6}
              />
            </div>
            <div className="flex items-center gap-2 pt-6">
              <Switch
                name="requires_overtime_approval"
                defaultChecked={s?.requires_overtime_approval ?? true}
              />
              <Label>Exigir aprovação de horas extras</Label>
            </div>
          </div>
          <div className="flex justify-end">
            <Button type="submit" disabled={ts.saveSettings.isPending}>Salvar parâmetros</Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
};

export default HRTimesheet;
