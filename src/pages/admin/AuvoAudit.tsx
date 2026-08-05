import { Fragment, useMemo, useState } from "react";
import { format, parseISO, startOfYear } from "date-fns";
import { ptBR } from "date-fns/locale";
import {
  AlertTriangle,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  ClipboardList,
  FileText,
  Link2Off,
  PackageX,
  RefreshCw,
  Scale,
  Search,
} from "lucide-react";


import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AuvoInsightsPanel } from "@/components/admin/auvo/AuvoInsightsPanel";
import { AuvoServiceReportTabs } from "@/components/admin/auvo/AuvoServiceReportTabs";
import { useAuvoServiceGroups } from "@/hooks/useAuvoServiceGroups";
import {
  useAuvoIntegration,
  type AuvoDiscrepancy,
  type AuvoTaskRow,
  type DiscrepancyClassification,
} from "@/hooks/useAuvoIntegration";


const CLASSIFICATION_LABEL: Record<DiscrepancyClassification, string> = {
  match: "Conforme",
  quantity_mismatch: "Quantidade divergente",
  stock_not_reported: "Baixado do estoque, sem relato",
  reported_not_in_stock: "Relatado, sem baixa no estoque",
  unidentified: "Menção não identificada",
};

const REVIEW_LABEL: Record<string, string> = {
  pending: "Pendente",
  confirmed: "Divergência confirmada",
  justified: "Justificada",
  dismissed: "Descartada",
};

const currency = (value: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(value || 0);

const formatDate = (value?: string | null) =>
  value ? format(parseISO(value), "dd/MM/yyyy", { locale: ptBR }) : "—";

const severityVariant = (severity: string) =>
  severity === "high" ? "destructive" : severity === "medium" ? "default" : "secondary";

export default function AuvoAudit() {
  const [onlyDivergent, setOnlyDivergent] = useState(true);
  const [search, setSearch] = useState("");
  const [classification, setClassification] = useState<string>("all");
  const [reviewTarget, setReviewTarget] = useState<AuvoDiscrepancy | null>(null);
  const [reviewStatus, setReviewStatus] = useState<"confirmed" | "justified" | "dismissed">(
    "confirmed",
  );
  const [reviewNotes, setReviewNotes] = useState("");
  const [promoteTarget, setPromoteTarget] = useState<AuvoTaskRow | null>(null);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const toggleExpanded = (uid: string) =>
    setExpanded((prev) => {
      const next = new Set(prev);
      next.has(uid) ? next.delete(uid) : next.add(uid);
      return next;
    });


  // OS podem ficar meses abertas: por padrão auditamos o ano corrente inteiro.
  const [periodStart, setPeriodStart] = useState(
    format(startOfYear(new Date()), "yyyy-MM-dd"),
  );
  const [periodEnd, setPeriodEnd] = useState(format(new Date(), "yyyy-MM-dd"));

  const {
    discrepancies,
    stats,
    runs,
    tasks,
    isLoading,
    runSync,
    reanalyzeTask,
    reviewDiscrepancy,
    promoteToOS,
  } = useAuvoIntegration({ onlyDivergent });

  const {
    groups,
    membersByGroup,
    unlinkTask,
    linkTaskToGroup,
    reanalyzeService,
  } = useAuvoServiceGroups();

  const groupById = useMemo(() => new Map(groups.map((g) => [g.id, g])), [groups]);


  const filtered = useMemo(() => {
    const term = search.trim().toLowerCase();
    const rows = discrepancies.filter((d) => {
      if (classification !== "all" && d.classification !== classification) return false;
      if (!term) return true;
      return [
        d.order_number,
        d.item_name,
        d.external_product_code,
        d.auvo_tasks?.customer_name,
        d.auvo_tasks?.technician_name,
      ]
        .filter(Boolean)
        .some((field) => String(field).toLowerCase().includes(term));
    });
    // Baixa de estoque sem relato é o caso mais grave: sempre no topo da lista.
    const weight = (c: string) =>
      c === "stock_not_reported" ? 0 : c === "quantity_mismatch" ? 1 : c === "reported_not_in_stock" ? 2 : 3;
    return [...rows].sort(
      (a, b) =>
        weight(a.classification) - weight(b.classification) ||
        Number(b.value_at_risk ?? 0) - Number(a.value_at_risk ?? 0),
    );
  }, [discrepancies, search, classification]);

  // Uma linha por SERVIÇO: todos os atendimentos e relatórios do mesmo trabalho juntos.
  const grouped = useMemo(() => {
    const map = new Map<
      string,
      {
        key: string;
        serviceGroupId: string | null;
        taskUid: string;
        orderLabel: string;
        firstDate?: string | null;
        lastDate?: string | null;
        customerName?: string | null;
        vesselName?: string | null;
        technicians: Set<string>;
        attendances: number;
        reports: number;
        isSimilarityGrouped: boolean;
        groupingReason?: string | null;
        items: AuvoDiscrepancy[];
        totalRisk: number;
        pending: number;
        stockNotReported: number;
        worstWeight: number;
      }
    >();

    const weight = (c: string) =>
      c === "stock_not_reported" ? 0 : c === "quantity_mismatch" ? 1 : c === "reported_not_in_stock" ? 2 : 3;

    for (const d of filtered) {
      const key = d.service_group_id ?? d.auvo_task_uid;
      const sg = d.service_group_id ? groupById.get(d.service_group_id) : undefined;
      const members = d.service_group_id ? membersByGroup.get(d.service_group_id) ?? [] : [];

      let group = map.get(key);
      if (!group) {
        const orderNumbers = sg?.order_numbers?.length
          ? sg.order_numbers
          : [d.order_number].filter(Boolean) as string[];
        group = {
          key,
          serviceGroupId: d.service_group_id ?? null,
          taskUid: d.auvo_task_uid,
          orderLabel: orderNumbers.length ? orderNumbers.join(" / ") : "—",
          firstDate: sg?.first_task_date ?? d.auvo_tasks?.task_date,
          lastDate: sg?.last_task_date ?? d.auvo_tasks?.task_date,
          customerName: sg?.customer_name ?? d.auvo_tasks?.customer_name,
          vesselName: sg?.vessel_name ?? null,
          technicians: new Set<string>(),
          attendances: members.length || 1,
          reports: members.filter((m) => m.hasReport).length,
          isSimilarityGrouped: sg?.is_similarity_grouped ?? false,
          groupingReason: sg?.grouping_reason ?? null,
          items: [],
          totalRisk: 0,
          pending: 0,
          stockNotReported: 0,
          worstWeight: 99,
        };
        for (const m of members) if (m.technician_name) group.technicians.add(m.technician_name);
        if (group.technicians.size === 0 && d.auvo_tasks?.technician_name) {
          group.technicians.add(d.auvo_tasks.technician_name);
        }
        map.set(key, group);
      }
      group.items.push(d);
      group.totalRisk += Number(d.value_at_risk ?? 0);
      if (d.review_status === "pending") group.pending += 1;
      if (d.classification === "stock_not_reported") group.stockNotReported += 1;
      group.worstWeight = Math.min(group.worstWeight, weight(d.classification));
    }

    return Array.from(map.values()).sort(
      (a, b) => a.worstWeight - b.worstWeight || b.totalRisk - a.totalRisk,
    );
  }, [filtered, groupById, membersByGroup]);

  const reviewMembers = useMemo(() => {
    if (!reviewTarget) return [];
    const members = reviewTarget.service_group_id
      ? membersByGroup.get(reviewTarget.service_group_id) ?? []
      : [];
    if (members.length > 0) return members;
    return [
      {
        id: reviewTarget.auvo_task_uid,
        auvo_task_id: reviewTarget.auvo_tasks?.auvo_task_id ?? "",
        order_number: reviewTarget.order_number,
        auvo_task_type: reviewTarget.auvo_tasks?.auvo_task_type ?? null,
        task_date: reviewTarget.auvo_tasks?.task_date ?? null,
        technician_name: reviewTarget.auvo_tasks?.technician_name ?? null,
        customer_name: null,
        vessel_name: null,
        service_group_id: null,

        unlinked_from_group: false,
        hasReport: true,
      },
    ];
  }, [reviewTarget, membersByGroup]);



  const lastRun = runs[0];

  const submitReview = () => {
    if (!reviewTarget) return;
    reviewDiscrepancy.mutate(
      { id: reviewTarget.id, review_status: reviewStatus, review_notes: reviewNotes || undefined },
      {
        onSuccess: () => {
          setReviewTarget(null);
          setReviewNotes("");
        },
      },
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Auditoria Auvo × Estoque</h1>
          <p className="text-muted-foreground">
            Cruza os relatórios dos técnicos no Auvo com os materiais liberados pelo estoque (EVA).
          </p>
        </div>
        <div className="flex flex-wrap items-end gap-2">
          <div className="space-y-1">
            <Label htmlFor="periodo-inicio" className="text-xs">Início</Label>
            <Input
              id="periodo-inicio"
              type="date"
              value={periodStart}
              onChange={(e) => setPeriodStart(e.target.value)}
              className="w-[150px]"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="periodo-fim" className="text-xs">Fim</Label>
            <Input
              id="periodo-fim"
              type="date"
              value={periodEnd}
              onChange={(e) => setPeriodEnd(e.target.value)}
              className="w-[150px]"
            />
          </div>
          <Button
            onClick={() => runSync.mutate({ period_start: periodStart, period_end: periodEnd })}
            disabled={runSync.isPending}
          >
            <RefreshCw className={`mr-2 h-4 w-4 ${runSync.isPending ? "animate-spin" : ""}`} />
            {runSync.isPending ? "Sincronizando..." : "Sincronizar Auvo"}
          </Button>
        </div>
      </div>

      {lastRun && (
        <p className="text-xs text-muted-foreground">
          Última sincronização {formatDate(lastRun.started_at)} ·{" "}
          {lastRun.status === "success" ? "concluída" : lastRun.status} · {lastRun.tasks_fetched}{" "}
          atendimentos · {lastRun.discrepancies_found} divergências
          {lastRun.error_message ? ` · ${lastRun.error_message}` : ""}
        </p>
      )}

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">OS auditadas</CardTitle>
            <ClipboardList className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.auditedOrders}</div>
            <p className="text-xs text-muted-foreground">{stats.totalItems} itens analisados</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Divergências</CardTitle>
            <AlertTriangle className="h-4 w-4 text-destructive" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.divergentItems}</div>
            <p className="text-xs text-muted-foreground">{stats.pendingReview} sem revisão</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Valor em risco</CardTitle>
            <Scale className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{currency(stats.valueAtRisk)}</div>
            <p className="text-xs text-muted-foreground">material sem confirmação no relatório</p>
          </CardContent>
        </Card>
        <Card
          role="button"
          tabIndex={0}
          onClick={() => setClassification("stock_not_reported")}
          onKeyDown={(e) => e.key === "Enter" && setClassification("stock_not_reported")}
          className={`cursor-pointer transition-colors ${
            stats.stockNotReported > 0
              ? "border-destructive/60 bg-destructive/5 hover:bg-destructive/10"
              : "hover:bg-muted/50"
          }`}
        >
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">
              Baixado do estoque, sem relato
            </CardTitle>
            <PackageX
              className={`h-4 w-4 ${
                stats.stockNotReported > 0 ? "text-destructive" : "text-muted-foreground"
              }`}
            />
          </CardHeader>
          <CardContent>
            <div
              className={`text-2xl font-bold ${
                stats.stockNotReported > 0 ? "text-destructive" : ""
              }`}
            >
              {stats.stockNotReported}
            </div>
            <p className="text-xs text-muted-foreground">
              material saiu do estoque e o técnico não citou · {stats.quantityMismatch} qtd.
              divergente · {stats.reportedNotInStock} relatado sem baixa
            </p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="divergencias">
        <TabsList>
          <TabsTrigger value="divergencias">Divergências</TabsTrigger>
          <TabsTrigger value="indicadores">Indicadores</TabsTrigger>
          <TabsTrigger value="atendimentos">Atendimentos importados</TabsTrigger>
          <TabsTrigger value="execucoes">Execuções</TabsTrigger>
        </TabsList>

        <TabsContent value="indicadores">
          <AuvoInsightsPanel />
        </TabsContent>

        <TabsContent value="divergencias" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="relative w-full md:max-w-sm">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="OS, material, cliente ou técnico"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-9"
                />
              </div>
              <div className="flex flex-wrap items-center gap-4">
                <Select value={classification} onValueChange={setClassification}>
                  <SelectTrigger className="w-[240px]">
                    <SelectValue placeholder="Tipo de divergência" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Todos os tipos</SelectItem>
                    {Object.entries(CLASSIFICATION_LABEL).map(([value, label]) => (
                      <SelectItem key={value} value={value}>
                        {label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <div className="flex items-center gap-2">
                  <Switch
                    id="only-divergent"
                    checked={onlyDivergent}
                    onCheckedChange={setOnlyDivergent}
                  />
                  <Label htmlFor="only-divergent" className="text-sm">Só divergentes</Label>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="space-y-2">
                  {[...Array(5)].map((_, i) => (
                    <Skeleton key={i} className="h-12 w-full" />
                  ))}
                </div>
              ) : filtered.length === 0 ? (
                <div className="flex flex-col items-center gap-2 py-12 text-center">
                  <CheckCircle2 className="h-8 w-8 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    Nenhuma divergência encontrada para os filtros atuais.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[40px]" />
                        <TableHead>Serviço (OS)</TableHead>
                        <TableHead>Cliente / Embarcação / Técnicos</TableHead>
                        <TableHead className="text-center">Divergências</TableHead>
                        <TableHead className="text-right">Risco total</TableHead>
                        <TableHead>Revisão</TableHead>
                        <TableHead className="text-right">Ações</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {grouped.map((g) => {
                        const isOpen = expanded.has(g.key);
                        const members = g.serviceGroupId
                          ? membersByGroup.get(g.serviceGroupId) ?? []
                          : [];
                        const period =
                          g.firstDate && g.lastDate && g.firstDate !== g.lastDate
                            ? `${formatDate(g.firstDate)} – ${formatDate(g.lastDate)}`
                            : formatDate(g.lastDate ?? g.firstDate);
                        return (
                          <Fragment key={g.key}>
                            <TableRow
                              className={`cursor-pointer ${
                                g.stockNotReported > 0
                                  ? "bg-destructive/5 hover:bg-destructive/10"
                                  : ""
                              }`}
                              onClick={() => toggleExpanded(g.key)}
                            >
                              <TableCell>
                                {isOpen ? (
                                  <ChevronDown className="h-4 w-4 text-muted-foreground" />
                                ) : (
                                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                                )}
                              </TableCell>
                              <TableCell className="font-medium">
                                {g.orderLabel}
                                <div className="text-xs text-muted-foreground">{period}</div>
                                <div className="mt-1 flex flex-wrap items-center gap-1">
                                  <Badge variant="outline" className="gap-1 text-[10px]">
                                    <FileText className="h-3 w-3" />
                                    {g.attendances} atend. · {g.reports} relat.
                                  </Badge>
                                  {g.isSimilarityGrouped && (
                                    <Badge
                                      variant="secondary"
                                      className="text-[10px]"
                                      title={g.groupingReason ?? undefined}
                                    >
                                      agrupado por similaridade
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="max-w-[240px]">
                                <div className="truncate">{g.customerName ?? "—"}</div>
                                <div className="truncate text-xs text-muted-foreground">
                                  {g.vesselName ?? "—"}
                                </div>
                                <div className="truncate text-xs text-muted-foreground">
                                  {g.technicians.size > 0
                                    ? Array.from(g.technicians).join(", ")
                                    : "—"}
                                </div>
                              </TableCell>
                              <TableCell className="text-center">
                                <div className="flex flex-wrap items-center justify-center gap-1">
                                  <Badge variant="secondary">{g.items.length} itens</Badge>
                                  {g.stockNotReported > 0 && (
                                    <Badge variant="destructive">
                                      {g.stockNotReported} sem relato
                                    </Badge>
                                  )}
                                </div>
                              </TableCell>
                              <TableCell className="text-right">
                                {g.totalRisk > 0 ? currency(g.totalRisk) : "—"}
                              </TableCell>
                              <TableCell>
                                <span className="text-sm text-muted-foreground">
                                  {g.pending} pendentes · {g.items.length - g.pending} tratadas
                                </span>
                              </TableCell>
                              <TableCell className="text-right">
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    if (g.serviceGroupId) {
                                      reanalyzeService.mutate(g.serviceGroupId);
                                    } else {
                                      reanalyzeTask.mutate(g.taskUid);
                                    }
                                  }}
                                  disabled={reanalyzeTask.isPending || reanalyzeService.isPending}
                                >
                                  Reanalisar serviço
                                </Button>
                              </TableCell>
                            </TableRow>

                            {isOpen && members.length > 0 && (
                              <TableRow className="hover:bg-transparent">
                                <TableCell colSpan={7} className="bg-muted/20">
                                  <p className="mb-2 text-xs font-medium text-muted-foreground">
                                    Atendimentos deste serviço
                                  </p>
                                  <div className="flex flex-wrap gap-2">
                                    {members.map((m) => (
                                      <div
                                        key={m.id}
                                        className="flex items-center gap-2 rounded-md border bg-background px-2 py-1 text-xs"
                                      >
                                        <span className="font-medium">
                                          {m.order_number ?? `AUVO-${m.auvo_task_id}`}
                                        </span>
                                        <span className="text-muted-foreground">
                                          {formatDate(m.task_date)} · {m.technician_name ?? "—"}
                                        </span>
                                        <Badge
                                          variant={m.hasReport ? "secondary" : "outline"}
                                          className="text-[10px]"
                                        >
                                          {m.hasReport ? "com relatório" : "sem relatório"}
                                        </Badge>
                                        <Button
                                          variant="ghost"
                                          size="sm"
                                          className="h-6 gap-1 px-1 text-[11px]"
                                          title="Desvincular deste serviço"
                                          onClick={() => unlinkTask.mutate(m.id)}
                                          disabled={unlinkTask.isPending}
                                        >
                                          <Link2Off className="h-3 w-3" />
                                          Desvincular
                                        </Button>
                                      </div>
                                    ))}
                                  </div>
                                </TableCell>
                              </TableRow>
                            )}


                            {isOpen && (
                              <TableRow className="hover:bg-transparent">
                                <TableCell colSpan={7} className="bg-muted/30 p-0">
                                  <Table>
                                    <TableHeader>
                                      <TableRow>
                                        <TableHead>Material</TableHead>
                                        <TableHead className="text-right">Estoque</TableHead>
                                        <TableHead className="text-right">Relatório</TableHead>
                                        <TableHead className="text-right">Risco</TableHead>
                                        <TableHead>Classificação</TableHead>
                                        <TableHead>Revisão</TableHead>
                                        <TableHead className="text-right">Ações</TableHead>
                                      </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                      {g.items.map((d) => (
                                        <TableRow key={d.id}>
                                          <TableCell className="max-w-[280px]">
                                            <div className="truncate" title={d.item_name}>
                                              {d.item_name}
                                            </div>
                                            {d.external_product_code && (
                                              <div className="text-xs text-muted-foreground">
                                                {d.external_product_code}
                                              </div>
                                            )}
                                          </TableCell>
                                          <TableCell className="text-right">
                                            {Number(d.stock_quantity)}
                                          </TableCell>
                                          <TableCell className="text-right">
                                            {d.reported_quantity === null
                                              ? "—"
                                              : Number(d.reported_quantity)}
                                          </TableCell>
                                          <TableCell className="text-right">
                                            {d.value_at_risk > 0
                                              ? currency(Number(d.value_at_risk))
                                              : "—"}
                                          </TableCell>
                                          <TableCell>
                                            <Badge variant={severityVariant(d.severity)}>
                                              {CLASSIFICATION_LABEL[d.classification]}
                                            </Badge>
                                            {d.ai_notes && (
                                              <p className="mt-1 max-w-[260px] text-xs text-muted-foreground">
                                                {d.ai_notes}
                                              </p>
                                            )}
                                          </TableCell>
                                          <TableCell>
                                            <Badge
                                              variant={
                                                d.review_status === "pending"
                                                  ? "outline"
                                                  : "secondary"
                                              }
                                            >
                                              {REVIEW_LABEL[d.review_status] ?? d.review_status}
                                            </Badge>
                                          </TableCell>
                                          <TableCell className="text-right">
                                            <Button
                                              variant="outline"
                                              size="sm"
                                              onClick={() => {
                                                setReviewTarget(d);
                                                setReviewStatus("confirmed");
                                                setReviewNotes(d.review_notes ?? "");
                                              }}
                                            >
                                              Revisar
                                            </Button>
                                          </TableCell>
                                        </TableRow>
                                      ))}
                                    </TableBody>
                                  </Table>
                                </TableCell>
                              </TableRow>
                            )}
                          </Fragment>
                        );
                      })}
                    </TableBody>
                  </Table>

                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="atendimentos">
          <Card>
            <CardHeader>
              <CardTitle>Atendimentos importados do Auvo</CardTitle>
              <CardDescription>
                Base espelhada do Auvo. Promova para OS do Arrow quando o cliente migrar.
              </CardDescription>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>OS</TableHead>
                    <TableHead>Tipo</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Embarcação</TableHead>
                    <TableHead>Técnico</TableHead>
                    <TableHead>Data</TableHead>
                    <TableHead>Check-in / out</TableHead>
                    <TableHead>Serviço</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {tasks.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="py-10 text-center text-muted-foreground">
                        Nenhum atendimento importado ainda.
                      </TableCell>
                    </TableRow>
                  ) : (
                    tasks.map((t) => (
                      <TableRow key={t.id}>
                        <TableCell className="font-medium">{t.order_number ?? "—"}</TableCell>
                        <TableCell>{t.auvo_task_type ?? "—"}</TableCell>
                        <TableCell className="max-w-[220px] truncate">
                          {t.customer_name ?? "—"}
                        </TableCell>
                        <TableCell className="max-w-[160px] truncate">
                          {t.vessel_name ?? "—"}
                        </TableCell>
                        <TableCell>{t.technician_name ?? "—"}</TableCell>
                        <TableCell>{formatDate(t.task_date)}</TableCell>
                        <TableCell className="text-xs text-muted-foreground">
                          {t.checkin_at ? format(parseISO(t.checkin_at), "dd/MM HH:mm") : "—"} ·{" "}
                          {t.checkout_at ? format(parseISO(t.checkout_at), "dd/MM HH:mm") : "—"}
                        </TableCell>
                        <TableCell>
                          <Select
                            value={t.service_group_id ?? "none"}
                            onValueChange={(value) => {
                              if (value === "none") {
                                unlinkTask.mutate(t.id);
                              } else {
                                linkTaskToGroup.mutate({ taskId: t.id, groupId: value });
                              }
                            }}
                          >
                            <SelectTrigger className="h-8 w-[190px] text-xs">
                              <SelectValue placeholder="Sem serviço" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="none">Sem serviço</SelectItem>
                              {groups.slice(0, 200).map((g) => (
                                <SelectItem key={g.id} value={g.id}>
                                  {(g.primary_order_number ?? g.service_key) +
                                    (g.customer_name ? ` · ${g.customer_name}` : "")}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </TableCell>
                        <TableCell className="text-right">
                          {t.service_order_id ? (
                            <Badge variant="secondary" className="gap-1">
                              <CheckCircle2 className="h-3 w-3" />
                              Promovido
                            </Badge>
                          ) : (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => setPromoteTarget(t)}
                              disabled={promoteToOS.isPending}
                            >
                              Promover para OS
                            </Button>
                          )}
                        </TableCell>

                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>

            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="execucoes">
          <Card>
            <CardHeader>
              <CardTitle>Histórico de sincronizações</CardTitle>
            </CardHeader>
            <CardContent className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Início</TableHead>
                    <TableHead>Período</TableHead>
                    <TableHead>Origem</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Atendimentos</TableHead>
                    <TableHead className="text-right">Relatórios</TableHead>
                    <TableHead className="text-right">Divergências</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                        Nenhuma execução registrada.
                      </TableCell>
                    </TableRow>
                  ) : (
                    runs.map((r) => (
                      <TableRow key={r.id}>
                        <TableCell>
                          {format(parseISO(r.started_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}
                        </TableCell>
                        <TableCell>
                          {formatDate(r.period_start)} – {formatDate(r.period_end)}
                        </TableCell>
                        <TableCell>{r.trigger_source === "manual" ? "Manual" : "Agendada"}</TableCell>
                        <TableCell>
                          <Badge variant={r.status === "success" ? "secondary" : r.status === "error" ? "destructive" : "outline"}>
                            {r.status}
                          </Badge>
                          {r.error_message && (
                            <p className="mt-1 max-w-[280px] text-xs text-destructive">
                              {r.error_message}
                            </p>
                          )}
                        </TableCell>
                        <TableCell className="text-right">{r.tasks_fetched}</TableCell>
                        <TableCell className="text-right">{r.reports_fetched}</TableCell>
                        <TableCell className="text-right">{r.discrepancies_found}</TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <Dialog open={!!reviewTarget} onOpenChange={(open) => !open && setReviewTarget(null)}>
        <DialogContent className="max-w-5xl max-h-[92vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Revisar divergência</DialogTitle>
            <DialogDescription>
              {reviewTarget?.item_name} · OS {reviewTarget?.order_number ?? "—"}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-6 md:grid-cols-[1.4fr_1fr]">
            <div>
              <AuvoServiceReportTabs
                members={reviewMembers}
                initialTaskUid={reviewTarget?.auvo_task_uid}
              />

            </div>
            <div className="space-y-4">
              {reviewTarget && (
                <div className="rounded-md border p-3 text-sm space-y-1">
                  <p className="font-medium">{reviewTarget.item_name}</p>
                  <p className="text-muted-foreground">
                    Baixa no estoque: {reviewTarget.stock_quantity ?? 0} · Relatado:{" "}
                    {reviewTarget.reported_quantity ?? "—"}
                  </p>
                  <p className="text-muted-foreground">
                    Classificação: {CLASSIFICATION_LABEL[reviewTarget.classification] ??
                      reviewTarget.classification}
                  </p>
                  <p className="text-muted-foreground">
                    Valor em risco: {currency(Number(reviewTarget.value_at_risk ?? 0))}
                  </p>
                </div>
              )}
              {reviewTarget?.ai_notes && (
                <p className="rounded-md bg-muted p-3 text-sm text-muted-foreground">
                  {reviewTarget.ai_notes}
                </p>
              )}
              <div className="space-y-2">
                <Label>Conclusão</Label>
                <Select value={reviewStatus} onValueChange={(v) => setReviewStatus(v as typeof reviewStatus)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="confirmed">Divergência confirmada</SelectItem>
                    <SelectItem value="justified">Justificada pelo técnico</SelectItem>
                    <SelectItem value="dismissed">Descartar (falso positivo)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="review-notes">Observações</Label>
                <Textarea
                  id="review-notes"
                  value={reviewNotes}
                  onChange={(e) => setReviewNotes(e.target.value)}
                  placeholder="Registre o que foi apurado com o técnico ou com o estoque"
                />
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setReviewTarget(null)}>
              Cancelar
            </Button>
            <Button onClick={submitReview} disabled={reviewDiscrepancy.isPending}>
              Salvar revisão
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={!!promoteTarget} onOpenChange={(open) => !open && setPromoteTarget(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Promover atendimento para OS do Arrow</DialogTitle>
            <DialogDescription>
              Será criada uma OS nativa com os dados do Auvo. Cliente e embarcação são
              reaproveitados quando já existem no Arrow.
            </DialogDescription>
          </DialogHeader>
          {promoteTarget && (
            <div className="space-y-2 rounded-md bg-muted p-3 text-sm">
              <p>
                <span className="text-muted-foreground">OS: </span>
                {promoteTarget.order_number ?? `AUVO-${promoteTarget.auvo_task_id}`}
              </p>
              <p>
                <span className="text-muted-foreground">Cliente: </span>
                {promoteTarget.customer_name ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Embarcação: </span>
                {promoteTarget.vessel_name ?? "—"}
              </p>
              <p>
                <span className="text-muted-foreground">Data: </span>
                {formatDate(promoteTarget.task_date)}
              </p>
              <p className="text-xs text-muted-foreground">
                Status inicial: {promoteTarget.checkout_at ? "concluída" : "pendente"}
              </p>
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setPromoteTarget(null)}>
              Cancelar
            </Button>
            <Button
              disabled={promoteToOS.isPending}
              onClick={() => {
                if (!promoteTarget) return;
                promoteToOS.mutate(promoteTarget, {
                  onSuccess: () => setPromoteTarget(null),
                });
              }}
            >
              {promoteToOS.isPending ? "Criando..." : "Criar OS no Arrow"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

