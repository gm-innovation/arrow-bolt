import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search, AlertTriangle } from "lucide-react";
import { useQualityNCRs } from "@/hooks/useQualityNCRs";
import NewNCRDialog from "@/components/quality/NewNCRDialog";
import { format } from "date-fns";

const statusLabels: Record<string, string> = {
  open: "Aberta", analysis: "Em Análise", action_plan: "Plano de Ação",
  verification: "Verificação", closed: "Encerrada", cancelled: "Cancelada",
};

const statusColors: Record<string, string> = {
  open: "destructive", analysis: "default", action_plan: "default",
  verification: "secondary", closed: "outline", cancelled: "outline",
};

const typeLabels: Record<string, string> = {
  internal: "Interna", external: "Externa", supplier: "Fornecedor", process: "Processo",
};

const severityLabels: Record<string, string> = { minor: "Menor", major: "Maior", critical: "Crítica" };

const QualityNCRs = () => {
  const { ncrs, isLoading, updateNCR } = useQualityNCRs();
  const [showNew, setShowNew] = useState(false);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  const filtered = ncrs.filter((n) => {
    const matchSearch = n.title.toLowerCase().includes(search.toLowerCase());
    const matchStatus = statusFilter === "all" || n.status === statusFilter;
    return matchSearch && matchStatus;
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Não-Conformidades (RNC)</h2>
          <p className="text-muted-foreground">Registro e acompanhamento de não-conformidades</p>
        </div>
        <Button onClick={() => setShowNew(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nova RNC
        </Button>
      </div>

      <div className="flex gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" />
          <Input className="pl-9" placeholder="Buscar RNC..." value={search} onChange={(e) => setSearch(e.target.value)} />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48"><SelectValue placeholder="Status" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="open">Aberta</SelectItem>
            <SelectItem value="analysis">Em Análise</SelectItem>
            <SelectItem value="action_plan">Plano de Ação</SelectItem>
            <SelectItem value="verification">Verificação</SelectItem>
            <SelectItem value="closed">Encerrada</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <Card>
        <CardHeader><CardTitle>Listagem de RNCs</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Carregando...</p>
          ) : filtered.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <AlertTriangle className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>Nenhuma RNC encontrada.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Severidade</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Prazo</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((ncr) => (
                  <TableRow key={ncr.id}>
                    <TableCell className="font-mono text-sm">{ncr.ncr_number}</TableCell>
                    <TableCell className="font-medium">{ncr.title}</TableCell>
                    <TableCell>{typeLabels[ncr.ncr_type] || ncr.ncr_type}</TableCell>
                    <TableCell>
                      <Badge variant={ncr.severity === "critical" ? "destructive" : ncr.severity === "major" ? "default" : "secondary"}>
                        {severityLabels[ncr.severity] || ncr.severity}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Badge variant={statusColors[ncr.status] as "destructive" | "default" | "secondary" | "outline"}>
                        {statusLabels[ncr.status] || ncr.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{ncr.responsible?.full_name || "—"}</TableCell>
                    <TableCell>{ncr.deadline ? format(new Date(ncr.deadline), "dd/MM/yyyy") : "—"}</TableCell>
                    <TableCell>
                      {ncr.status === "open" && (
                        <Button size="sm" variant="outline" onClick={() => updateNCR.mutate({ id: ncr.id, status: "analysis" })}>
                          Analisar
                        </Button>
                      )}
                      {ncr.status === "verification" && (
                        <Button size="sm" variant="outline" onClick={() => updateNCR.mutate({ id: ncr.id, status: "closed" })}>
                          Encerrar
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <NewNCRDialog open={showNew} onOpenChange={setShowNew} />
    </div>
  );
};

export default QualityNCRs;
