import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle, ClipboardCheck, Search, BarChart3 } from "lucide-react";
import { useQualityNCRs } from "@/hooks/useQualityNCRs";
import { useQualityActionPlans } from "@/hooks/useQualityActionPlans";
import { useQualityAudits } from "@/hooks/useQualityAudits";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";

const QualityDashboard = () => {
  const { ncrs } = useQualityNCRs();
  const { plans } = useQualityActionPlans();
  const { audits } = useQualityAudits();

  const openNCRs = ncrs.filter((n) => !["closed", "cancelled"].includes(n.status));
  const activePlans = plans.filter((p) => !["closed", "effective", "ineffective"].includes(p.status));
  const plannedAudits = audits.filter((a) => a.status === "planned");
  const effectivePlans = plans.filter((p) => p.status === "effective");
  const totalEvaluated = plans.filter((p) => ["effective", "ineffective"].includes(p.status));
  const effectivenessRate = totalEvaluated.length > 0 ? Math.round((effectivePlans.length / totalEvaluated.length) * 100) : null;

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Qualidade</h2>
        <p className="text-muted-foreground">Sistema de Gestão da Qualidade — ISO 9001</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">RNCs Abertas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openNCRs.length}</div>
            <p className="text-xs text-muted-foreground">{ncrs.filter(n => n.severity === 'critical' && n.status !== 'closed').length} críticas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Planos de Ação</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{activePlans.length}</div>
            <p className="text-xs text-muted-foreground">em andamento</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Auditorias Planejadas</CardTitle>
            <Search className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{plannedAudits.length}</div>
            <p className="text-xs text-muted-foreground">{audits.filter(a => a.status === 'completed').length} concluídas</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eficácia Ações</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{effectivenessRate !== null ? `${effectivenessRate}%` : "—"}</div>
            <p className="text-xs text-muted-foreground">{totalEvaluated.length} avaliados</p>
          </CardContent>
        </Card>
      </div>

      {/* Itens Pendentes */}
      <Card>
        <CardHeader>
          <CardTitle>Itens Pendentes</CardTitle>
        </CardHeader>
        <CardContent>
          {openNCRs.length === 0 && activePlans.length === 0 && plannedAudits.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum item pendente.</p>
          ) : (
            <div className="space-y-3">
              {openNCRs.slice(0, 5).map((ncr) => (
                <div key={ncr.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">RNC #{ncr.ncr_number} — {ncr.title}</p>
                    <p className="text-xs text-muted-foreground">{ncr.affected_area || "Sem área"} · {ncr.deadline ? `Prazo: ${format(new Date(ncr.deadline), "dd/MM/yyyy")}` : "Sem prazo"}</p>
                  </div>
                  <Badge variant={ncr.severity === "critical" ? "destructive" : "secondary"}>
                    {ncr.severity === "critical" ? "Crítica" : ncr.severity === "major" ? "Maior" : "Menor"}
                  </Badge>
                </div>
              ))}
              {activePlans.slice(0, 3).map((plan) => (
                <div key={plan.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">Plano: {plan.title}</p>
                    <p className="text-xs text-muted-foreground">{plan.target_date ? `Alvo: ${format(new Date(plan.target_date), "dd/MM/yyyy")}` : "Sem data alvo"}</p>
                  </div>
                  <Badge variant="secondary">{plan.plan_type === "corrective" ? "Corretivo" : plan.plan_type === "preventive" ? "Preventivo" : "Melhoria"}</Badge>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default QualityDashboard;
