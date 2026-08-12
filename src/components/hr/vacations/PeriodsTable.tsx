import { useMemo, useState } from "react";
import { format, parseISO } from "date-fns";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { deadlineSeverity, VacationPeriod, VacationPeriodStatus } from "@/hooks/useVacations";
import { cn } from "@/lib/utils";

const PAGE_SIZE = 25;

const statusLabel: Record<VacationPeriodStatus, string> = {
  open: "Aberto",
  partially_used: "Parcialmente usado",
  fully_used: "Totalmente usado",
  expired: "Vencido",
};

export function PeriodsTable({
  periods,
  isLoading,
}: {
  periods: VacationPeriod[];
  isLoading?: boolean;
}) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [page, setPage] = useState(0);

  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    return periods.filter((p) => {
      if (status !== "all" && p.status !== status) return false;
      
      if (!term) return true;
      return (p.employee?.full_name ?? "").toLowerCase().includes(term);
    });
  }, [periods, search, status]);

  const pages = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE));
  const current = Math.min(page, pages - 1);
  const rows = filtered.slice(current * PAGE_SIZE, current * PAGE_SIZE + PAGE_SIZE);

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap gap-2">
        <Input
          placeholder="Buscar colaborador..."
          value={search}
          onChange={(e) => {
            setSearch(e.target.value);
            setPage(0);
          }}
          className="max-w-xs"
        />
        <Select
          value={status}
          onValueChange={(v) => {
            setStatus(v);
            setPage(0);
          }}
        >
          <SelectTrigger className="w-56">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todas as situações</SelectItem>
            {(Object.keys(statusLabel) as VacationPeriodStatus[]).map((s) => (
              <SelectItem key={s} value={s}>
                {statusLabel[s]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Colaborador</TableHead>
            <TableHead>Período Aquisitivo</TableHead>
            <TableHead className="text-center">Prop.</TableHead>
            <TableHead className="text-center">Direito</TableHead>
            <TableHead className="text-center">Usados</TableHead>
            <TableHead className="text-center">Abono</TableHead>
            <TableHead className="text-center">Saldo</TableHead>
            <TableHead>Limite de Gozo (23m)</TableHead>
            <TableHead>Situação</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {isLoading && (
            <TableRow>
              <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                Carregando...
              </TableCell>
            </TableRow>
          )}
          {!isLoading && rows.length === 0 && (
            <TableRow>
              <TableCell colSpan={9} className="py-8 text-center text-muted-foreground">
                Nenhum período encontrado.
              </TableCell>
            </TableRow>
          )}
          {rows.map((p) => {
            const balance = p.entitled_days - p.used_days - p.sold_days;
            const sev = deadlineSeverity(p.concession_deadline);
            return (
              <TableRow key={p.id}>
                <TableCell className="font-medium">
                  {p.employee?.full_name ?? "—"}
                  {p.employee?.position && (
                    <div className="text-xs text-muted-foreground">{p.employee.position}</div>
                  )}
                </TableCell>
                <TableCell className="text-sm">
                  {format(parseISO(p.period_start), "dd/MM/yy")} → {format(parseISO(p.period_end), "dd/MM/yy")}
                </TableCell>
                <TableCell className="text-center text-sm">
                  {p.proporcional_meses != null ? `${p.proporcional_meses}/12` : "—"}
                </TableCell>
                <TableCell className="text-center">{p.entitled_days}</TableCell>
                <TableCell className="text-center">{p.used_days}</TableCell>
                <TableCell className="text-center">{p.sold_days}</TableCell>
                <TableCell className="text-center font-medium">{balance}</TableCell>
                <TableCell>
                  <span
                    className={cn(
                      "text-sm",
                      sev === "expired" && "font-semibold text-destructive",
                      sev === "critical" && "font-medium text-destructive",
                      sev === "warning" && "text-amber-600"
                    )}
                  >
                    {format(parseISO(p.concession_deadline), "dd/MM/yyyy")}
                  </span>
                </TableCell>
                <TableCell className="space-x-1 whitespace-nowrap">
                  <Badge
                    variant={
                      p.status === "expired"
                        ? "destructive"
                        : p.status === "fully_used"
                        ? "secondary"
                        : "default"
                    }
                  >
                    {statusLabel[p.status]}
                  </Badge>
                  {p.ferias_vencidas && <Badge variant="destructive">Vencidas</Badge>}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>

      {pages > 1 && (
        <div className="flex items-center justify-between text-sm text-muted-foreground">
          <span>
            {filtered.length} período(s) · página {current + 1} de {pages}
          </span>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" disabled={current === 0} onClick={() => setPage(current - 1)}>
              Anterior
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={current >= pages - 1}
              onClick={() => setPage(current + 1)}
            >
              Próxima
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
