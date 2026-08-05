import { useState } from 'react';
import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { Clock, Wallet, Send } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useMyTimesheet } from '@/hooks/useHRTimesheet';

const MONTHS = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
];

const hhmm = (hours: number) => {
  const sign = hours < 0 ? '-' : '';
  const abs = Math.abs(Number(hours ?? 0));
  const h = Math.floor(abs);
  const m = Math.round((abs - h) * 60);
  return `${sign}${h}h${String(m).padStart(2, '0')}`;
};
const timeOnly = (iso: string | null) => (iso ? format(new Date(iso), 'HH:mm') : '—');

const MyTimesheet = () => {
  const today = new Date();
  const [year, setYear] = useState(today.getFullYear());
  const [month, setMonth] = useState(today.getMonth() + 1);
  const [requestDate, setRequestDate] = useState<string | null>(null);
  const { days, balance, requests, requestCorrection } = useMyTimesheet(year, month);

  const rows = days.data ?? [];
  const worked = rows.reduce((a, d) => a + Number(d.worked_hours ?? 0), 0);
  const periodBalance = rows.reduce((a, d) => a + Number(d.balance_hours ?? 0), 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Meu Ponto</h1>
          <p className="text-muted-foreground">Espelho de ponto, banco de horas e pedidos de ajuste.</p>
        </div>
        <div className="flex items-end gap-2">
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
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Trabalhado no mês</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent><div className="text-2xl font-bold">{hhmm(worked)}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Saldo do mês</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${periodBalance < 0 ? 'text-destructive' : ''}`}>
              {hhmm(periodBalance)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2 flex flex-row items-center justify-between">
            <CardTitle className="text-sm font-medium">Banco de horas</CardTitle>
            <Wallet className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className={`text-2xl font-bold ${balance < 0 ? 'text-destructive' : ''}`}>{hhmm(balance)}</div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Espelho de {MONTHS[month - 1]}/{year}</CardTitle>
          <CardDescription>Se algum dia estiver errado, solicite o ajuste ao RH.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Data</TableHead>
                  <TableHead>Entrada</TableHead>
                  <TableHead>Saída</TableHead>
                  <TableHead>Trabalhado</TableHead>
                  <TableHead>Previsto</TableHead>
                  <TableHead>Saldo</TableHead>
                  <TableHead className="text-right">Ação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center text-muted-foreground py-8">
                      Nenhuma apuração disponível para este mês.
                    </TableCell>
                  </TableRow>
                )}
                {rows.map((d) => (
                  <TableRow key={d.id}>
                    <TableCell>{format(parseISO(d.work_date), 'dd/MM (EEE)', { locale: ptBR })}</TableCell>
                    <TableCell>{timeOnly(d.first_in)}</TableCell>
                    <TableCell>{timeOnly(d.last_out)}</TableCell>
                    <TableCell>{hhmm(d.worked_hours)}</TableCell>
                    <TableCell>{hhmm(d.expected_hours)}</TableCell>
                    <TableCell className={Number(d.balance_hours) < 0 ? 'text-destructive' : ''}>
                      {hhmm(d.balance_hours)}
                    </TableCell>
                    <TableCell className="text-right">
                      <Button size="sm" variant="ghost" onClick={() => setRequestDate(d.work_date)}>
                        Solicitar ajuste
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Minhas solicitações de ajuste</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Data</TableHead>
                <TableHead>Entrada</TableHead>
                <TableHead>Saída</TableHead>
                <TableHead>Motivo</TableHead>
                <TableHead>Situação</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(requests.data ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="text-center text-muted-foreground py-8">
                    Nenhuma solicitação enviada.
                  </TableCell>
                </TableRow>
              )}
              {(requests.data ?? []).map((r) => (
                <TableRow key={r.id}>
                  <TableCell>{format(parseISO(r.work_date), 'dd/MM/yyyy')}</TableCell>
                  <TableCell>{r.requested_check_in?.slice(0, 5) ?? '—'}</TableCell>
                  <TableCell>{r.requested_check_out?.slice(0, 5) ?? '—'}</TableCell>
                  <TableCell className="max-w-[280px] truncate">{r.reason}</TableCell>
                  <TableCell>
                    <Badge
                      variant={
                        r.status === 'approved' ? 'default' : r.status === 'rejected' ? 'destructive' : 'secondary'
                      }
                    >
                      {r.status === 'approved' ? 'Aprovado' : r.status === 'rejected' ? 'Recusado' : 'Pendente'}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <Dialog open={!!requestDate} onOpenChange={(o) => !o && setRequestDate(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              Solicitar ajuste — {requestDate ? format(parseISO(requestDate), 'dd/MM/yyyy') : ''}
            </DialogTitle>
          </DialogHeader>
          <form
            className="space-y-4"
            onSubmit={(e) => {
              e.preventDefault();
              const f = new FormData(e.currentTarget);
              requestCorrection.mutate(
                {
                  work_date: requestDate!,
                  requested_check_in: String(f.get('in') ?? ''),
                  requested_check_out: String(f.get('out') ?? ''),
                  reason: String(f.get('reason')),
                },
                { onSuccess: () => setRequestDate(null) },
              );
            }}
          >
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Entrada correta</Label>
                <Input name="in" type="time" />
              </div>
              <div className="space-y-2">
                <Label>Saída correta</Label>
                <Input name="out" type="time" />
              </div>
            </div>
            <div className="space-y-2">
              <Label>Motivo</Label>
              <Textarea name="reason" required placeholder="Explique o que aconteceu neste dia" />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="outline" onClick={() => setRequestDate(null)}>Cancelar</Button>
              <Button type="submit" disabled={requestCorrection.isPending}>
                <Send className="h-4 w-4 mr-2" /> Enviar
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MyTimesheet;
