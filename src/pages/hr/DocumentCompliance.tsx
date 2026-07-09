import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
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
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ShieldCheck, AlertTriangle, Clock, FileWarning, Upload, FileCheck2 } from "lucide-react";
import {
  ComplianceRow,
  ComplianceStatus,
  EmployeeAggregate,
  statusLabel,
  statusVariant,
  useComplianceOverview,
  useUploadEmployeeDocument,
} from "@/hooks/useHRDocumentCompliance";

const responsibleLabel: Record<string, string> = {
  hr: "RH",
  direct_manager: "Gestor direto",
  both: "Ambos",
};

const UploadDialog = ({ row }: { row: ComplianceRow }) => {
  const [open, setOpen] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [issueDate, setIssueDate] = useState<string>("");
  const upload = useUploadEmployeeDocument();

  const submit = async () => {
    if (!file) return;
    await upload.mutateAsync({
      employee_id: row.employee_id,
      catalog_id: row.catalog_id,
      file,
      issue_date: issueDate || null,
    });
    setOpen(false);
    setFile(null);
    setIssueDate("");
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline" className="gap-1">
          <Upload className="h-3.5 w-3.5" />
          {row.document_id ? "Substituir" : "Enviar"}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{row.catalog_name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Arquivo</Label>
            <Input type="file" onChange={(e) => setFile(e.target.files?.[0] ?? null)} />
          </div>
          <div>
            <Label>Data de emissão (opcional)</Label>
            <Input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)} />
            <p className="text-xs text-muted-foreground mt-1">
              Usada para calcular a validade quando o catálogo tem prazo.
            </p>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={!file || upload.isPending}>
            {upload.isPending ? "Enviando..." : "Enviar"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

const EmployeeDrawer = ({
  agg,
  open,
  onOpenChange,
}: {
  agg: EmployeeAggregate | null;
  open: boolean;
  onOpenChange: (v: boolean) => void;
}) => {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{agg?.employee_name}</SheetTitle>
          <p className="text-sm text-muted-foreground">
            {agg?.employee_position ?? "Sem cargo definido"}
          </p>
        </SheetHeader>
        {agg && (
          <div className="mt-6 space-y-2">
            {agg.rows.map((r) => (
              <div
                key={r.catalog_id}
                className="flex items-center justify-between gap-3 rounded-md border p-3"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">{r.catalog_name}</span>
                    <Badge variant={statusVariant(r.status)}>{statusLabel(r.status)}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1 flex flex-wrap gap-x-3">
                    <span>Categoria: {r.catalog_category}</span>
                    <span>Resp.: {responsibleLabel[r.responsible_role] ?? r.responsible_role}</span>
                    {r.expiry_date && (
                      <span>
                        Validade: {formatLocalDate(r.expiry_date)}
                        {r.due_in_days != null &&
                          ` (${r.due_in_days >= 0 ? `${r.due_in_days}d restantes` : `${Math.abs(r.due_in_days)}d vencido`})`}
                      </span>
                    )}
                  </div>
                </div>
                <UploadDialog row={r} />
              </div>
            ))}
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

const DocumentCompliance = () => {
  const { data, isLoading } = useComplianceOverview();
  const [positionFilter, setPositionFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<EmployeeAggregate | null>(null);

  const positions = useMemo(() => {
    const set = new Set<string>();
    (data?.byEmployee ?? []).forEach((e) => {
      if (e.employee_position) set.add(e.employee_position);
    });
    return [...set].sort((a, b) => a.localeCompare(b, "pt-BR"));
  }, [data]);

  const filtered = useMemo(() => {
    return (data?.byEmployee ?? []).filter((e) => {
      if (positionFilter !== "all" && (e.employee_position ?? "") !== positionFilter) return false;
      if (statusFilter !== "all") {
        const count = (e as any)[statusFilter] as number | undefined;
        if (!count || count === 0) return false;
      }
      if (search && !e.employee_name.toLowerCase().includes(search.toLowerCase())) return false;
      return true;
    });
  }, [data, positionFilter, statusFilter, search]);

  const overview = useMemo(() => {
    const list = data?.byEmployee ?? [];
    const totalEmployees = list.length;
    const fullyCompliant = list.filter(
      (e) => e.missing === 0 && e.pending_review === 0 && e.expiring_soon === 0 && e.expired === 0,
    ).length;
    const sums = list.reduce(
      (acc, e) => ({
        missing: acc.missing + e.missing,
        pending_review: acc.pending_review + e.pending_review,
        expiring_soon: acc.expiring_soon + e.expiring_soon,
        expired: acc.expired + e.expired,
      }),
      { missing: 0, pending_review: 0, expiring_soon: 0, expired: 0 },
    );
    const pct = totalEmployees ? Math.round((fullyCompliant / totalEmployees) * 100) : 0;
    return { totalEmployees, pct, ...sums };
  }, [data]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Conformidade Documental</h1>
          <p className="text-sm text-muted-foreground">
            Documentos exigidos por cargo, calculados a partir do catálogo do RH.
          </p>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><ShieldCheck className="h-4 w-4" />Conformes</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{overview.pct}%</div><div className="text-xs text-muted-foreground">{overview.totalEmployees} colaboradores</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileWarning className="h-4 w-4" />Faltando</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{overview.missing}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><FileCheck2 className="h-4 w-4" />Aguardando revisão</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{overview.pending_review}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><Clock className="h-4 w-4" />A vencer</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{overview.expiring_soon}</div></CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-sm flex items-center gap-2"><AlertTriangle className="h-4 w-4" />Vencidos</CardTitle></CardHeader>
          <CardContent><div className="text-2xl font-semibold">{overview.expired}</div></CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
            <div className="flex-1 max-w-sm">
              <Label>Buscar</Label>
              <Input
                placeholder="Nome do colaborador"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Label>Cargo</Label>
                <Select value={positionFilter} onValueChange={setPositionFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    {positions.map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Status</Label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos</SelectItem>
                    <SelectItem value="missing">Faltando</SelectItem>
                    <SelectItem value="pending_review">Aguardando revisão</SelectItem>
                    <SelectItem value="expiring_soon">A vencer</SelectItem>
                    <SelectItem value="expired">Vencido</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Colaborador</TableHead>
                <TableHead>Cargo</TableHead>
                <TableHead className="text-center">Conformes</TableHead>
                <TableHead className="text-center">Faltando</TableHead>
                <TableHead className="text-center">Revisar</TableHead>
                <TableHead className="text-center">A vencer</TableHead>
                <TableHead className="text-center">Vencidos</TableHead>
                <TableHead className="text-right">Pior status</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Carregando...</TableCell></TableRow>
              )}
              {!isLoading && filtered.length === 0 && (
                <TableRow><TableCell colSpan={8} className="text-center text-muted-foreground">Nenhum colaborador encontrado.</TableCell></TableRow>
              )}
              {filtered.map((e) => (
                <TableRow
                  key={e.employee_id}
                  className="cursor-pointer hover:bg-muted/50"
                  onClick={() => setSelected(e)}
                >
                  <TableCell className="font-medium">{e.employee_name}</TableCell>
                  <TableCell className="text-muted-foreground">{e.employee_position ?? "—"}</TableCell>
                  <TableCell className="text-center">{e.valid}/{e.total}</TableCell>
                  <TableCell className="text-center">{e.missing || "—"}</TableCell>
                  <TableCell className="text-center">{e.pending_review || "—"}</TableCell>
                  <TableCell className="text-center">{e.expiring_soon || "—"}</TableCell>
                  <TableCell className="text-center">{e.expired || "—"}</TableCell>
                  <TableCell className="text-right">
                    <Badge variant={statusVariant(e.worstStatus as ComplianceStatus)}>
                      {statusLabel(e.worstStatus as ComplianceStatus)}
                    </Badge>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <EmployeeDrawer
        agg={selected}
        open={!!selected}
        onOpenChange={(v) => !v && setSelected(null)}
      />
    </div>
  );
};

export default DocumentCompliance;
