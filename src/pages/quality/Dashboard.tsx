import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  ClipboardCheck,
  Search,
  BarChart3,
  FileText,
  Printer,
  Clock,
  FolderOpen,
} from "lucide-react";
import { useQualityNCRs } from "@/hooks/useQualityNCRs";
import { useQualityActionPlans } from "@/hooks/useQualityActionPlans";
import { useQualityAudits } from "@/hooks/useQualityAudits";
import { useQualityDocuments } from "@/hooks/useQualityDocuments";
import { useQualityControlledCopies } from "@/hooks/useQualityControlledCopies";
import { format, parseISO, differenceInDays } from "date-fns";
import QualityAlertsPanel from "@/components/quality/QualityAlertsPanel";

const QualityDashboard = () => {
  const { ncrs } = useQualityNCRs();
  const { plans } = useQualityActionPlans();
  const { audits } = useQualityAudits();
  const { documents } = useQualityDocuments();
  const { copies } = useQualityControlledCopies();

  const openNCRs = ncrs.filter((n) => !["closed", "cancelled"].includes(n.status));
  const activePlans = plans.filter((p) => !["closed", "effective", "ineffective"].includes(p.status));
  const plannedAudits = audits.filter((a) => a.status === "planned");
  const effectivePlans = plans.filter((p) => p.status === "effective");
  const totalEvaluated = plans.filter((p) => ["effective", "ineffective"].includes(p.status));
  const effectivenessRate =
    totalEvaluated.length > 0 ? Math.round((effectivePlans.length / totalEvaluated.length) * 100) : null;

  const pendingApproval = documents.filter((d: any) => d.status === "pending_approval");
  const expiringSoon = documents.filter((d: any) => {
    if (!d.next_review_date) return false;
    const days = differenceInDays(parseISO(d.next_review_date), new Date());
    return days <= 30;
  });
  const copiesPending = copies.filter((c: any) => c.status === "issued");

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Qualidade</h2>
        <p className="text-muted-foreground">Sistema de Gestão da Qualidade — ISO 9001</p>
      </div>

      <QualityAlertsPanel />

      {/* GED */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Link to="/quality/documents">
          <Card className="hover:bg-muted/30 transition cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Documentos publicados</CardTitle>
              <FolderOpen className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{documents.filter((d: any) => d.status === "published").length}</div>
              <p className="text-xs text-muted-foreground">{documents.length} no total</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/quality/documents">
          <Card className="hover:bg-muted/30 transition cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Aguardando aprovação</CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{pendingApproval.length}</div>
              <p className="text-xs text-muted-foreground">Pendentes do Master</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/quality/documents">
          <Card className="hover:bg-muted/30 transition cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Revisão em ≤ 30 dias</CardTitle>
              <Clock className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{expiringSoon.length}</div>
              <p className="text-xs text-muted-foreground">Próxima revisão se aproximando</p>
            </CardContent>
          </Card>
        </Link>
        <Link to="/quality/controlled-copies">
          <Card className="hover:bg-muted/30 transition cursor-pointer">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Cópias controladas ativas</CardTitle>
              <Printer className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{copiesPending.length}</div>
              <p className="text-xs text-muted-foreground">Aguardando recolhimento</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Qualidade Operacional */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">RNCs Abertas</CardTitle>
            <AlertTriangle className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{openNCRs.length}</div>
            <p className="text-xs text-muted-foreground">
              {ncrs.filter((n) => n.severity === "critical" && n.status !== "closed").length} críticas
            </p>
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
            <p className="text-xs text-muted-foreground">
              {audits.filter((a) => a.status === "completed").length} concluídas
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Eficácia Ações</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {effectivenessRate !== null ? `${effectivenessRate}%` : "—"}
            </div>
            <p className="text-xs text-muted-foreground">{totalEvaluated.length} avaliados</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Itens Pendentes</CardTitle>
        </CardHeader>
        <CardContent>
          {pendingApproval.length === 0 &&
          expiringSoon.length === 0 &&
          openNCRs.length === 0 &&
          activePlans.length === 0 ? (
            <p className="text-muted-foreground text-center py-8">Nenhum item pendente.</p>
          ) : (
            <div className="space-y-3">
              {pendingApproval.slice(0, 3).map((d: any) => (
                <Link key={d.id} to={`/quality/documents/${d.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30">
                    <div>
                      <p className="text-sm font-medium">
                        {d.code} — {d.title}
                      </p>
                      <p className="text-xs text-muted-foreground">Aguardando aprovação</p>
                    </div>
                    <Badge>Aprovação</Badge>
                  </div>
                </Link>
              ))}
              {expiringSoon.slice(0, 3).map((d: any) => (
                <Link key={d.id} to={`/quality/documents/${d.id}`}>
                  <div className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/30">
                    <div>
                      <p className="text-sm font-medium">
                        {d.code} — {d.title}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        Revisão em {format(parseISO(d.next_review_date), "dd/MM/yyyy")}
                      </p>
                    </div>
                    <Badge variant="outline">Revisão</Badge>
                  </div>
                </Link>
              ))}
              {openNCRs.slice(0, 3).map((ncr) => (
                <div key={ncr.id} className="flex items-center justify-between p-3 rounded-lg border">
                  <div>
                    <p className="text-sm font-medium">
                      RNC #{ncr.ncr_number} — {ncr.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {ncr.affected_area || "Sem área"} ·{" "}
                      {ncr.deadline ? `Prazo: ${format(parseISO(ncr.deadline), "dd/MM/yyyy")}` : "Sem prazo"}
                    </p>
                  </div>
                  <Badge variant={ncr.severity === "critical" ? "destructive" : "secondary"}>
                    {ncr.severity === "critical" ? "Crítica" : ncr.severity === "major" ? "Maior" : "Menor"}
                  </Badge>
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
