import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ArrowLeft, Pencil, Plus, AlertTriangle, CheckCircle } from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  useQualitySupplier,
  useQualitySuppliers,
  useQualitySupplierEvaluations,
  useQualitySupplierIncidents,
  type SupplierStatus,
} from "@/hooks/useQualitySuppliers";
import SupplierStatusBadge, { gradeVariant } from "@/components/quality/SupplierStatusBadge";
import SupplierFormDialog from "@/components/quality/SupplierFormDialog";
import SupplierEvaluationDrawer from "@/components/quality/SupplierEvaluationDrawer";
import SupplierIncidentDialog from "@/components/quality/SupplierIncidentDialog";
import SupplierDocumentsList from "@/components/quality/SupplierDocumentsList";

const SupplierDetailPage = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { data: supplier, isLoading } = useQualitySupplier(id);
  const { upsert } = useQualitySuppliers();
  const { items: evaluations } = useQualitySupplierEvaluations(id);
  const { items: incidents, resolve } = useQualitySupplierIncidents(id);

  const [editOpen, setEditOpen] = useState(false);
  const [evalOpen, setEvalOpen] = useState(false);
  const [incidentOpen, setIncidentOpen] = useState(false);

  if (isLoading) return <div className="p-6 text-muted-foreground">Carregando...</div>;
  if (!supplier) return <div className="p-6">Fornecedor não encontrado.</div>;

  const openIncidents = incidents.filter((i) => !i.resolved_at);

  const handleStatusChange = async (s: SupplierStatus) => {
    await upsert.mutateAsync({ id: supplier.id, name: supplier.name, status: s });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2">
        <Button variant="ghost" size="sm" onClick={() => navigate("/quality/suppliers")}>
          <ArrowLeft className="h-4 w-4 mr-1" /> Voltar
        </Button>
      </div>

      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <h2 className="text-2xl font-bold">{supplier.name}</h2>
          <div className="flex items-center gap-2 mt-1 flex-wrap">
            <SupplierStatusBadge status={supplier.status} />
            {supplier.current_grade && (
              <Badge variant={gradeVariant(supplier.current_grade) as any}>
                Conceito {supplier.current_grade} {supplier.current_score != null ? `(${supplier.current_score})` : ""}
              </Badge>
            )}
            {supplier.tax_id && <span className="text-sm text-muted-foreground">CNPJ {supplier.tax_id}</span>}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Select value={supplier.status} onValueChange={handleStatusChange}>
            <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="approved">Aprovado</SelectItem>
              <SelectItem value="conditional">Condicional</SelectItem>
              <SelectItem value="suspended">Suspenso</SelectItem>
              <SelectItem value="disqualified">Desqualificado</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={() => setEditOpen(true)}>
            <Pencil className="h-4 w-4 mr-1" /> Editar
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Categoria</CardTitle></CardHeader>
          <CardContent className="text-lg font-semibold">{supplier.category}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Criticidade</CardTitle></CardHeader>
          <CardContent className="text-lg font-semibold">{supplier.criticality}</CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Última avaliação</CardTitle></CardHeader>
          <CardContent className="text-lg font-semibold">
            {supplier.last_evaluation_at ? format(parseISO(supplier.last_evaluation_at), "dd/MM/yyyy") : "—"}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2"><CardTitle className="text-xs text-muted-foreground">Próx. reavaliação</CardTitle></CardHeader>
          <CardContent className={`text-lg font-semibold ${supplier.next_evaluation_due && new Date(supplier.next_evaluation_due) < new Date() ? "text-destructive" : ""}`}>
            {supplier.next_evaluation_due ? format(parseISO(supplier.next_evaluation_due), "dd/MM/yyyy") : "—"}
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="summary">
        <TabsList>
          <TabsTrigger value="summary">Resumo</TabsTrigger>
          <TabsTrigger value="evaluations">Avaliações ({evaluations.length})</TabsTrigger>
          <TabsTrigger value="incidents">Incidentes ({incidents.length})</TabsTrigger>
          <TabsTrigger value="documents">Documentos</TabsTrigger>
        </TabsList>

        <TabsContent value="summary" className="mt-4 space-y-4">
          <Card>
            <CardHeader><CardTitle className="text-base">Escopo de fornecimento</CardTitle></CardHeader>
            <CardContent className="text-sm whitespace-pre-wrap">
              {supplier.scope_description || <span className="text-muted-foreground">Não informado.</span>}
            </CardContent>
          </Card>
          <Card>
            <CardHeader><CardTitle className="text-base">Contato</CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              <div>{supplier.contact_name || <span className="text-muted-foreground">—</span>}</div>
              <div>{supplier.contact_email}</div>
              <div>{supplier.contact_phone}</div>
            </CardContent>
          </Card>
          {supplier.notes && (
            <Card>
              <CardHeader><CardTitle className="text-base">Notas</CardTitle></CardHeader>
              <CardContent className="text-sm whitespace-pre-wrap">{supplier.notes}</CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="evaluations" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => setEvalOpen(true)}><Plus className="h-4 w-4 mr-1" /> Nova avaliação</Button>
          </div>
          {evaluations.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">Nenhuma avaliação registrada.</CardContent></Card>
          ) : (
            <Card>
              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-sm">
                  <thead className="bg-muted/40">
                    <tr>
                      <th className="text-left p-3 font-medium">Data</th>
                      <th className="text-left p-3 font-medium">Tipo</th>
                      <th className="text-left p-3 font-medium">Nota</th>
                      <th className="text-left p-3 font-medium">Status definido</th>
                      <th className="text-left p-3 font-medium">Resumo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {evaluations.map((e) => (
                      <tr key={e.id} className="border-t">
                        <td className="p-3">{format(parseISO(e.evaluation_date), "dd/MM/yyyy")}</td>
                        <td className="p-3">{e.kind}</td>
                        <td className="p-3">
                          {e.grade ? (
                            <Badge variant={gradeVariant(e.grade) as any}>
                              {e.grade} {e.score != null ? `(${e.score})` : ""}
                            </Badge>
                          ) : "—"}
                        </td>
                        <td className="p-3">{e.status_after ?? "—"}</td>
                        <td className="p-3 text-xs">{e.summary || "—"}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="incidents" className="mt-4 space-y-3">
          <div className="flex justify-end">
            <Button onClick={() => setIncidentOpen(true)}>
              <AlertTriangle className="h-4 w-4 mr-1" /> Registrar incidente
            </Button>
          </div>
          {incidents.length === 0 ? (
            <Card><CardContent className="py-8 text-center text-muted-foreground text-sm">Nenhum incidente.</CardContent></Card>
          ) : (
            <div className="space-y-2">
              {incidents.map((i) => (
                <Card key={i.id}>
                  <CardContent className="p-3 flex items-start justify-between gap-3">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <Badge variant={i.severity === "critical" || i.severity === "high" ? "destructive" : i.severity === "medium" ? ("warning" as any) : "secondary"}>
                          {i.severity}
                        </Badge>
                        <span className="text-xs text-muted-foreground">{format(parseISO(i.incident_date), "dd/MM/yyyy")}</span>
                        {i.resolved_at && (
                          <Badge variant="success" as any>Resolvido</Badge>
                        )}
                      </div>
                      <p className="text-sm mt-1">{i.description}</p>
                      {i.linked_ncr_id && (
                        <Link to={`/quality/ncrs`} className="text-xs text-primary underline">Ver NCR vinculada</Link>
                      )}
                    </div>
                    {!i.resolved_at && (
                      <Button size="sm" variant="outline" onClick={() => resolve.mutate(i.id)}>
                        <CheckCircle className="h-4 w-4 mr-1" /> Marcar como resolvido
                      </Button>
                    )}
                  </CardContent>
                </Card>
              ))}
              {openIncidents.some((i) => i.severity === "critical") && (
                <p className="text-xs text-destructive">
                  Atenção: incidentes críticos abertos forçam status "Suspenso" na próxima avaliação.
                </p>
              )}
            </div>
          )}
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <SupplierDocumentsList supplierId={supplier.id} />
        </TabsContent>
      </Tabs>

      <SupplierFormDialog open={editOpen} onClose={() => setEditOpen(false)} supplier={supplier} />
      <SupplierEvaluationDrawer open={evalOpen} onClose={() => setEvalOpen(false)} supplierId={supplier.id} />
      <SupplierIncidentDialog open={incidentOpen} onClose={() => setIncidentOpen(false)} supplierId={supplier.id} />
    </div>
  );
};

export default SupplierDetailPage;
