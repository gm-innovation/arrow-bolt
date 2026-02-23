import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, ClipboardCheck } from "lucide-react";
import { useQualityActionPlans } from "@/hooks/useQualityActionPlans";
import NewActionPlanDialog from "@/components/quality/NewActionPlanDialog";
import { format } from "date-fns";

const statusLabels: Record<string, string> = {
  draft: "Rascunho", in_progress: "Em Andamento", verification: "Verificação",
  effective: "Eficaz", ineffective: "Ineficaz", closed: "Encerrado",
};

const typeLabels: Record<string, string> = {
  corrective: "Corretivo", preventive: "Preventivo", improvement: "Melhoria",
};

const QualityActionPlans = () => {
  const { plans, isLoading, updatePlan } = useQualityActionPlans();
  const [showNew, setShowNew] = useState(false);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Planos de Ação</h2>
          <p className="text-muted-foreground">PDCA / 5W2H — Ações corretivas e preventivas</p>
        </div>
        <Button onClick={() => setShowNew(true)}>
          <Plus className="h-4 w-4 mr-2" /> Novo Plano
        </Button>
      </div>

      <Card>
        <CardHeader><CardTitle>Listagem</CardTitle></CardHeader>
        <CardContent>
          {isLoading ? (
            <p className="text-muted-foreground text-center py-8">Carregando...</p>
          ) : plans.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <ClipboardCheck className="h-12 w-12 mx-auto mb-2 opacity-30" />
              <p>Nenhum plano de ação encontrado.</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Título</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>RNC Vinculada</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Responsável</TableHead>
                  <TableHead>Data Alvo</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {plans.map((plan) => (
                  <TableRow key={plan.id}>
                    <TableCell className="font-medium">{plan.title}</TableCell>
                    <TableCell>{typeLabels[plan.plan_type] || plan.plan_type}</TableCell>
                    <TableCell>
                      {plan.ncr ? (
                        <span className="text-sm">RNC #{plan.ncr.ncr_number}</span>
                      ) : "—"}
                    </TableCell>
                    <TableCell>
                      <Badge variant={plan.status === "effective" ? "default" : plan.status === "ineffective" ? "destructive" : "secondary"}>
                        {statusLabels[plan.status] || plan.status}
                      </Badge>
                    </TableCell>
                    <TableCell>{plan.responsible?.full_name || "—"}</TableCell>
                    <TableCell>{plan.target_date ? format(new Date(plan.target_date), "dd/MM/yyyy") : "—"}</TableCell>
                    <TableCell>
                      {plan.status === "draft" && (
                        <Button size="sm" variant="outline" onClick={() => updatePlan.mutate({ id: plan.id, status: "in_progress" })}>
                          Iniciar
                        </Button>
                      )}
                      {plan.status === "in_progress" && (
                        <Button size="sm" variant="outline" onClick={() => updatePlan.mutate({ id: plan.id, status: "verification" })}>
                          Verificar
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

      <NewActionPlanDialog open={showNew} onOpenChange={setShowNew} />
    </div>
  );
};

export default QualityActionPlans;
