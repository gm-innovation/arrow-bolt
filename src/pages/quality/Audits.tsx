import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Search } from "lucide-react";
import { useQualityAudits } from "@/hooks/useQualityAudits";
import NewAuditDialog from "@/components/quality/NewAuditDialog";
import { format } from "date-fns";

const statusLabels: Record<string, string> = {
  planned: "Planejada", in_progress: "Em Andamento", completed: "Concluída", cancelled: "Cancelada",
};

const typeLabels: Record<string, string> = {
  internal: "Interna", external: "Externa", supplier: "Fornecedor", process: "Processo",
};

const QualityAudits = () => {
  const { audits, isLoading, updateAudit } = useQualityAudits();
  const [showNew, setShowNew] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Auditorias Internas</h2>
          <p className="text-muted-foreground">Planejamento e execução de auditorias ISO 9001</p>
        </div>
        <Button onClick={() => setShowNew(true)}>
          <Plus className="h-4 w-4 mr-2" /> Nova Auditoria
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Calendário de Auditorias</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Carregando...</p>
          ) : audits.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Search className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>Nenhuma auditoria agendada.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>#</TableHead>
                  <TableHead>Título</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data Planejada</TableHead>
                  <TableHead>Auditor Líder</TableHead>
                  <TableHead>Departamento</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {audits.map((audit) => (
                  <TableRow key={audit.id}>
                    <TableCell className="font-mono text-sm">{audit.audit_number}</TableCell>
                    <TableCell className="font-medium">{audit.title}</TableCell>
                    <TableCell>{typeLabels[audit.audit_type] || audit.audit_type}</TableCell>
                    <TableCell>
                      <Badge variant={audit.status === "completed" ? "default" : audit.status === "cancelled" ? "destructive" : "secondary"}>
                        {statusLabels[audit.status] || audit.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{format(new Date(audit.planned_date), "dd/MM/yyyy")}</TableCell>
                    <TableCell>{audit.lead_auditor?.full_name || "—"}</TableCell>
                    <TableCell>{audit.department || "—"}</TableCell>
                    <TableCell>
                      {audit.status === "planned" && (
                        <Button size="sm" variant="outline" onClick={() => updateAudit.mutate({ id: audit.id, status: "in_progress", actual_date: new Date().toISOString().split("T")[0] })}>
                          Iniciar
                        </Button>
                      )}
                      {audit.status === "in_progress" && (
                        <Button size="sm" variant="outline" onClick={() => updateAudit.mutate({ id: audit.id, status: "completed" })}>
                          Concluir
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

      <NewAuditDialog open={showNew} onOpenChange={setShowNew} />
    </div>
  );
};

export default QualityAudits;
