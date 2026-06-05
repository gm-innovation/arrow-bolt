import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
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
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { HardHat, Plus, AlertTriangle, Clock, ShieldCheck, FileQuestion } from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  useQualitySafetyDocuments,
  SAFETY_TYPE_PREFIXES,
} from "@/hooks/useQualitySafetyDocuments";
import NewDocumentDialog from "@/components/quality/NewDocumentDialog";

const STATUS_LABEL: Record<string, string> = {
  ok: "Vigente",
  expiring: "Vencendo",
  expired: "Vencido",
  none: "Sem prazo",
};

const STATUS_VARIANT: Record<string, "default" | "destructive" | "outline" | "secondary"> = {
  ok: "secondary",
  expiring: "default",
  expired: "destructive",
  none: "outline",
};

const QualitySafety = () => {
  const navigate = useNavigate();
  const {
    documents,
    types,
    hasSafetyTypes,
    seedTypes,
    expired,
    expiringSoon,
    active,
    noDate,
    isLoading,
  } = useQualitySafetyDocuments();

  const [openDialog, setOpenDialog] = useState(false);
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    return documents.filter((d: any) => {
      if (typeFilter !== "all" && d.document_type?.code_prefix !== typeFilter) return false;
      if (statusFilter !== "all" && d.computed_status !== statusFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        if (!`${d.code} ${d.title}`.toLowerCase().includes(s)) return false;
      }
      return true;
    });
  }, [documents, typeFilter, statusFilter, search]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <HardHat className="h-6 w-6" /> Saúde e Segurança
          </h2>
          <p className="text-muted-foreground">
            Documentos de S&S controlados via GED (PCMSO, PGR, LTCAT, NR-01, etc.)
          </p>
        </div>
        <Button onClick={() => setOpenDialog(true)} disabled={!hasSafetyTypes}>
          <Plus className="h-4 w-4 mr-2" /> Novo documento de S&S
        </Button>
      </div>

      {!hasSafetyTypes && (
        <Alert>
          <AlertTitle>Configurar tipos padrão de S&S</AlertTitle>
          <AlertDescription className="flex items-center justify-between gap-4">
            <span>
              Cadastre automaticamente os 7 tipos padrão (PCMSO, PGR, LTCAT, NR-01, Ficha de EPI,
              ASO, Laudo SST) para começar a controlar os documentos.
            </span>
            <Button
              size="sm"
              onClick={() => seedTypes.mutate()}
              disabled={seedTypes.isPending}
            >
              {seedTypes.isPending ? "Cadastrando..." : "Cadastrar tipos"}
            </Button>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Ativos</CardTitle>
            <ShieldCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{active.length}</div>
            <p className="text-xs text-muted-foreground">Documentos vigentes</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencendo em ≤30d</CardTitle>
            <Clock className="h-4 w-4 text-yellow-600" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{expiringSoon.length}</div>
            <p className="text-xs text-muted-foreground">Renovar com antecedência</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vencidos</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-destructive">{expired.length}</div>
            <p className="text-xs text-muted-foreground">Não-conformidade em auditoria</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Sem prazo</CardTitle>
            <FileQuestion className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{noDate.length}</div>
            <p className="text-xs text-muted-foreground">Definir validade</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Documentos de Saúde e Segurança</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid gap-3 md:grid-cols-4">
            <Input
              placeholder="Buscar por código ou título..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {types.map((t: any) => (
                  <SelectItem key={t.id} value={t.code_prefix}>
                    {t.code_prefix} — {t.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="ok">Vigente</SelectItem>
                <SelectItem value="expiring">Vencendo (≤30d)</SelectItem>
                <SelectItem value="expired">Vencido</SelectItem>
                <SelectItem value="none">Sem prazo</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Código</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Validade</TableHead>
                  <TableHead>Status</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">
                      Carregando...
                    </TableCell>
                  </TableRow>
                ) : filtered.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={5} className="text-center text-sm text-muted-foreground py-6">
                      Nenhum documento de S&S encontrado.
                    </TableCell>
                  </TableRow>
                ) : (
                  filtered.map((d: any) => (
                    <TableRow
                      key={d.id}
                      className="cursor-pointer"
                      onClick={() => navigate(`/quality/documents/${d.id}`)}
                    >
                      <TableCell>
                        <Badge variant="outline">{d.document_type?.code_prefix ?? "—"}</Badge>
                      </TableCell>
                      <TableCell className="font-mono text-sm">{d.code}</TableCell>
                      <TableCell className="font-medium">{d.title}</TableCell>
                      <TableCell className="text-sm">
                        {d.due_date ? format(parseISO(d.due_date), "dd/MM/yyyy") : "—"}
                        {d.days_remaining !== null && (
                          <span className="text-xs text-muted-foreground ml-2">
                            {d.days_remaining < 0
                              ? `venceu há ${Math.abs(d.days_remaining)}d`
                              : `em ${d.days_remaining}d`}
                          </span>
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={STATUS_VARIANT[d.computed_status]}>
                          {STATUS_LABEL[d.computed_status]}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      <NewDocumentDialog
        open={openDialog}
        onOpenChange={setOpenDialog}
        lockedOrigin="safety"
        typeCodePrefixes={SAFETY_TYPE_PREFIXES}
        title="Novo documento de Saúde e Segurança"
        onCreated={(id) => navigate(`/quality/documents/${id}`)}
      />
    </div>
  );
};

export default QualitySafety;
