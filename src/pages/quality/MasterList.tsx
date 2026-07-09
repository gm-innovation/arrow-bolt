import { useMemo, useState } from "react";
import { useQualityMasterList } from "@/hooks/useQualityMasterList";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download, FileSpreadsheet } from "lucide-react";
import * as XLSX from "xlsx";
import { differenceInDays, parseISO } from "date-fns";
import { formatLocalDate } from "@/lib/utils";

const fmt = (d?: string | null) => (d ? formatLocalDate(d) : "—");

type ReviewBucket = "all" | "overdue" | "soon" | "ok" | "no_cycle";

export default function MasterList() {
  const { data, isLoading } = useQualityMasterList();
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"all" | "document" | "process">("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [reviewBucket, setReviewBucket] = useState<ReviewBucket>("all");

  const rows = data ?? [];

  const statusOptions = useMemo(() => {
    const s = new Set<string>();
    rows.forEach((r) => r.status && s.add(r.status));
    return Array.from(s).sort();
  }, [rows]);

  const reviewBucketOf = (r: (typeof rows)[number]): ReviewBucket => {
    if (!r.next_review_at) return "no_cycle";
    const days = differenceInDays(parseISO(r.next_review_at), new Date());
    if (days < 0) return "overdue";
    if (days <= 30) return "soon";
    return "ok";
  };

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (kind !== "all" && r.kind !== kind) return false;
      if (statusFilter !== "all" && r.status !== statusFilter) return false;
      if (reviewBucket !== "all" && reviewBucketOf(r) !== reviewBucket) return false;
      if (q && !`${r.code ?? ""} ${r.title}`.toLowerCase().includes(q.toLowerCase())) return false;
      return true;
    });
  }, [rows, q, kind, statusFilter, reviewBucket]);

  const counters = useMemo(() => {
    return {
      overdue: filtered.filter((r) => reviewBucketOf(r) === "overdue").length,
      soon: filtered.filter((r) => reviewBucketOf(r) === "soon").length,
    };
  }, [filtered]);

  const exportRows = () =>
    filtered.map((r) => ({
      Código: r.code ?? "",
      Título: r.title,
      Tipo: r.kind === "document" ? "Documento" : "Processo",
      Categoria: r.type ?? "",
      Versão: r.version_label ?? "",
      Status: r.status,
      "Última revisão": fmt(r.last_review_at),
      "Próxima revisão": fmt(r.next_review_at),
      "Janela de revisão":
        reviewBucketOf(r) === "overdue"
          ? "Atrasada"
          : reviewBucketOf(r) === "soon"
            ? "≤ 30 dias"
            : reviewBucketOf(r) === "ok"
              ? "Em dia"
              : "Sem ciclo",
    }));

  const exportCsv = () => {
    const data = exportRows();
    const header = Object.keys(data[0] ?? { Código: "" });
    const csv = [
      header.join(","),
      ...data.map((row) => header.map((h) => `"${String((row as any)[h] ?? "").replace(/"/g, '""')}"`).join(",")),
    ].join("\n");
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `lista-mestre-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const exportXlsx = () => {
    const data = exportRows();
    const ws = XLSX.utils.json_to_sheet(data);
    ws["!cols"] = [
      { wch: 14 },
      { wch: 48 },
      { wch: 12 },
      { wch: 18 },
      { wch: 10 },
      { wch: 14 },
      { wch: 14 },
      { wch: 14 },
      { wch: 16 },
    ];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Lista Mestre");
    XLSX.writeFile(wb, `lista-mestre-${new Date().toISOString().slice(0, 10)}.xlsx`);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-semibold">Lista Mestra</h2>
          <p className="text-sm text-muted-foreground">
            Informação documentada controlada do SGQ (documentos + processos).
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv} disabled={filtered.length === 0}>
            <Download className="h-4 w-4 mr-2" />
            Exportar CSV
          </Button>
          <Button onClick={exportXlsx} disabled={filtered.length === 0}>
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            Exportar XLSX
          </Button>
        </div>
      </div>

      <div className="flex gap-2 flex-wrap items-center">
        <Input
          placeholder="Buscar por código ou título…"
          value={q}
          onChange={(e) => setQ(e.target.value)}
          className="max-w-sm"
        />
        <Select value={kind} onValueChange={(v) => setKind(v as any)}>
          <SelectTrigger className="w-40">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os tipos</SelectItem>
            <SelectItem value="document">Documentos</SelectItem>
            <SelectItem value="process">Processos</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-44">
            <SelectValue placeholder="Status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {statusOptions.map((s) => (
              <SelectItem key={s} value={s}>
                {s}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Select value={reviewBucket} onValueChange={(v) => setReviewBucket(v as ReviewBucket)}>
          <SelectTrigger className="w-52">
            <SelectValue placeholder="Revisão" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Qualquer ciclo de revisão</SelectItem>
            <SelectItem value="overdue">Atrasadas</SelectItem>
            <SelectItem value="soon">Próximas (≤ 30 dias)</SelectItem>
            <SelectItem value="ok">Em dia</SelectItem>
            <SelectItem value="no_cycle">Sem ciclo definido</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-2 ml-auto text-xs">
          <Badge variant="destructive">{counters.overdue} atrasada(s)</Badge>
          <Badge variant="outline">{counters.soon} próxima(s)</Badge>
          <Badge variant="secondary">{filtered.length} total</Badge>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <p className="p-6 text-sm text-muted-foreground">Carregando…</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-muted/50">
                  <tr className="text-left">
                    <th className="px-3 py-2">Código</th>
                    <th className="px-3 py-2">Título</th>
                    <th className="px-3 py-2">Tipo</th>
                    <th className="px-3 py-2">Categoria</th>
                    <th className="px-3 py-2">Versão</th>
                    <th className="px-3 py-2">Status</th>
                    <th className="px-3 py-2">Última revisão</th>
                    <th className="px-3 py-2">Próxima revisão</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((r) => {
                    const bucket = reviewBucketOf(r);
                    return (
                      <tr key={`${r.kind}-${r.id}`} className="border-t">
                        <td className="px-3 py-2 font-mono text-xs">{r.code ?? "—"}</td>
                        <td className="px-3 py-2">{r.title}</td>
                        <td className="px-3 py-2">
                          <Badge variant={r.kind === "document" ? "default" : "secondary"}>
                            {r.kind === "document" ? "Documento" : "Processo"}
                          </Badge>
                        </td>
                        <td className="px-3 py-2 text-muted-foreground">{r.type ?? "—"}</td>
                        <td className="px-3 py-2">{r.version_label ?? "—"}</td>
                        <td className="px-3 py-2">
                          <Badge variant="outline">{r.status}</Badge>
                        </td>
                        <td className="px-3 py-2">{fmt(r.last_review_at)}</td>
                        <td className="px-3 py-2">
                          <span
                            className={
                              bucket === "overdue"
                                ? "text-destructive font-medium"
                                : bucket === "soon"
                                  ? "text-amber-700 font-medium"
                                  : ""
                            }
                          >
                            {fmt(r.next_review_at)}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                  {filtered.length === 0 && (
                    <tr>
                      <td colSpan={8} className="p-6 text-center text-muted-foreground">
                        Nada encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
