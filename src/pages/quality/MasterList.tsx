import { useState, useMemo } from "react";
import { useQualityMasterList } from "@/hooks/useQualityMasterList";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Download } from "lucide-react";

const fmt = (d?: string | null) => d ? new Date(d).toLocaleDateString("pt-BR") : "—";

export default function MasterList() {
  const { data, isLoading } = useQualityMasterList();
  const [q, setQ] = useState("");
  const [kind, setKind] = useState<"all" | "document" | "process">("all");

  const filtered = useMemo(() => {
    const rows = data ?? [];
    return rows.filter((r) =>
      (kind === "all" || r.kind === kind) &&
      (!q || `${r.code ?? ""} ${r.title}`.toLowerCase().includes(q.toLowerCase()))
    );
  }, [data, q, kind]);

  const exportCsv = () => {
    const header = ["Código", "Título", "Tipo", "Categoria", "Versão", "Status", "Última revisão", "Próxima revisão"];
    const rows = filtered.map((r) => [
      r.code ?? "", r.title, r.kind === "document" ? "Documento" : "Processo",
      r.type ?? "", r.version_label ?? "", r.status, fmt(r.last_review_at), fmt(r.next_review_at),
    ]);
    const csv = [header, ...rows].map((line) => line.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = "lista-mestre.csv"; a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-semibold">Lista Mestre</h2>
          <p className="text-sm text-muted-foreground">Informação documentada controlada do SGQ (documentos + processos).</p>
        </div>
        <Button variant="outline" onClick={exportCsv}><Download className="h-4 w-4 mr-2" />Exportar CSV</Button>
      </div>

      <div className="flex gap-2 flex-wrap">
        <Input placeholder="Buscar por código ou título…" value={q} onChange={(e) => setQ(e.target.value)} className="max-w-sm" />
        <Select value={kind} onValueChange={(v) => setKind(v as any)}>
          <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="document">Documentos</SelectItem>
            <SelectItem value="process">Processos</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? <p className="p-6 text-sm text-muted-foreground">Carregando…</p> : (
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
                  {filtered.map((r) => (
                    <tr key={`${r.kind}-${r.id}`} className="border-t">
                      <td className="px-3 py-2 font-mono text-xs">{r.code ?? "—"}</td>
                      <td className="px-3 py-2">{r.title}</td>
                      <td className="px-3 py-2"><Badge variant={r.kind === "document" ? "default" : "secondary"}>{r.kind === "document" ? "Documento" : "Processo"}</Badge></td>
                      <td className="px-3 py-2 text-muted-foreground">{r.type ?? "—"}</td>
                      <td className="px-3 py-2">{r.version_label ?? "—"}</td>
                      <td className="px-3 py-2"><Badge variant="outline">{r.status}</Badge></td>
                      <td className="px-3 py-2">{fmt(r.last_review_at)}</td>
                      <td className="px-3 py-2">{fmt(r.next_review_at)}</td>
                    </tr>
                  ))}
                  {filtered.length === 0 && (
                    <tr><td colSpan={8} className="p-6 text-center text-muted-foreground">Nada encontrado.</td></tr>
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
