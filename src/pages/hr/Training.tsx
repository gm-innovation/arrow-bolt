import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Progress } from "@/components/ui/progress";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  AlertTriangle,
  GraduationCap,
  Pencil,
  Sparkles,
  Target,
  Users,
} from "lucide-react";
import { format, parseISO } from "date-fns";
import {
  useHRTrainingOverview,
  useHRCompetencies,
  useHRTrainingActions,
  trainingPlanStatusLabel,
  competencyLevelLabel,
  isPlanLate,
  type EmployeeTrainingSummary,
} from "@/hooks/useHRTraining";
const roleLabels: Record<string, string> = {
  super_admin: "Super Admin",
  admin: "Coordenador",
  coordinator: "Coordenador",
  manager: "Coordenador",
  director: "Diretoria",
  technician: "Técnico",
  hr: "RH",
  commercial: "Comercial",
  marketing: "Marketing",
  compras: "Suprimentos",
  qualidade: "Qualidade",
  financeiro: "Financeiro",
};

import HRTrainingPlanDialog from "@/components/hr/training/HRTrainingPlanDialog";
import type { TrainingPlan } from "@/hooks/useQualityTrainingPlans";

const statusVariant = (s: string) =>
  s === "completed" ? "success" : s === "in_progress" ? "default" : s === "cancelled" ? "outline" : "secondary";

const fmt = (d?: string | null) => (d ? format(parseISO(d), "dd/MM/yyyy") : "—");

const HRTraining = () => {
  const { employees, kpis, isLoading } = useHRTrainingOverview();
  const { data: competencies = [] } = useHRCompetencies();
  const { generatePlans } = useHRTrainingActions();

  const [search, setSearch] = useState("");
  const [onlyGaps, setOnlyGaps] = useState(false);
  const [statusFilter, setStatusFilter] = useState("open");
  const [detail, setDetail] = useState<EmployeeTrainingSummary | null>(null);
  const [editPlan, setEditPlan] = useState<{ plan: TrainingPlan; employee: string } | null>(null);

  const compMap = useMemo(
    () => Object.fromEntries(competencies.map((c) => [c.id, c.name])),
    [competencies],
  );

  const filteredEmployees = useMemo(
    () =>
      employees.filter((e) => {
        if (onlyGaps && e.gaps === 0) return false;
        if (search && !e.full_name.toLowerCase().includes(search.toLowerCase())) return false;
        return true;
      }),
    [employees, search, onlyGaps],
  );

  const allPlans = useMemo(() => {
    const rows = employees.flatMap((e) => e.plans.map((p) => ({ plan: p, employee: e.full_name })));
    return rows
      .filter(({ plan, employee }) => {
        if (statusFilter === "open" && !["proposed", "in_progress"].includes(plan.status)) return false;
        if (statusFilter === "late" && !isPlanLate(plan)) return false;
        if (!["all", "open", "late"].includes(statusFilter) && plan.status !== statusFilter) return false;
        if (search) {
          const s = search.toLowerCase();
          const comp = (compMap[plan.competency_id] || "").toLowerCase();
          if (!employee.toLowerCase().includes(s) && !comp.includes(s)) return false;
        }
        return true;
      })
      .sort((a, b) => (a.plan.due_date || a.plan.planned_date || "9999") .localeCompare(b.plan.due_date || b.plan.planned_date || "9999"));
  }, [employees, statusFilter, search, compMap]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <GraduationCap className="h-6 w-6" /> Treinamentos e Competências
        </h1>
        <p className="text-sm text-muted-foreground">
          Lacunas de competência por colaborador, planos de capacitação e execução dos treinamentos.
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Users className="h-3.5 w-3.5" /> Colaboradores mapeados
            </p>
            <p className="text-2xl font-bold">{kpis.employees}</p>
            <p className="text-xs text-muted-foreground">{kpis.employeesWithGaps} com lacunas</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <Target className="h-3.5 w-3.5" /> Cobertura média
            </p>
            <p className="text-2xl font-bold">{kpis.avgCoverage}%</p>
            <Progress value={kpis.avgCoverage} className="mt-2" />
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <AlertTriangle className="h-3.5 w-3.5" /> Lacunas obrigatórias
            </p>
            <p className="text-2xl font-bold text-destructive">{kpis.mandatoryGaps}</p>
            <p className="text-xs text-muted-foreground">{kpis.latePlans} plano(s) atrasado(s)</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-xs text-muted-foreground flex items-center gap-1">
              <GraduationCap className="h-3.5 w-3.5" /> Planos
            </p>
            <p className="text-2xl font-bold">{kpis.openPlans}</p>
            <p className="text-xs text-muted-foreground">
              {kpis.completedThisYear} concluídos em {new Date().getFullYear()}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Buscar colaborador ou competência..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="max-w-xs"
            />
            <Button variant={onlyGaps ? "default" : "outline"} size="sm" onClick={() => setOnlyGaps((v) => !v)}>
              Apenas com lacunas
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="overview">
            <TabsList>
              <TabsTrigger value="overview">Panorama por colaborador</TabsTrigger>
              <TabsTrigger value="plans">Planos de capacitação</TabsTrigger>
            </TabsList>

            <TabsContent value="overview" className="mt-4">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Papel</TableHead>
                    <TableHead className="text-center">Requisitos</TableHead>
                    <TableHead className="text-center">Lacunas</TableHead>
                    <TableHead className="w-40">Cobertura</TableHead>
                    <TableHead className="text-center">Planos abertos</TableHead>
                    <TableHead>Próximo prazo</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {isLoading && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        Carregando...
                      </TableCell>
                    </TableRow>
                  )}
                  {!isLoading && filteredEmployees.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        Nenhum colaborador encontrado. A matriz é definida pelos requisitos por cargo no módulo de
                        Qualidade.
                      </TableCell>
                    </TableRow>
                  )}
                  {filteredEmployees.map((e) => (
                    <TableRow key={e.user_id}>
                      <TableCell className="font-medium">{e.full_name}</TableCell>
                      <TableCell>{roleLabels[e.role] ?? e.role ?? "—"}</TableCell>
                      <TableCell className="text-center">{e.requirements}</TableCell>
                      <TableCell className="text-center">
                        {e.gaps > 0 ? (
                          <Badge variant={e.mandatoryGaps > 0 ? "destructive" : "warning"}>
                            {e.gaps}
                            {e.mandatoryGaps > 0 ? ` (${e.mandatoryGaps} obrig.)` : ""}
                          </Badge>
                        ) : (
                          <Badge variant="success">0</Badge>
                        )}
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Progress value={e.coverage} className="w-20" />
                          <span className="text-xs">{e.coverage}%</span>
                        </div>
                      </TableCell>
                      <TableCell className="text-center">
                        {e.openPlans}
                        {e.latePlans > 0 && (
                          <Badge variant="destructive" className="ml-1">
                            {e.latePlans} atrasado(s)
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{fmt(e.nextDueDate)}</TableCell>
                      <TableCell className="text-right space-x-1">
                        <Button size="sm" variant="outline" onClick={() => setDetail(e)}>
                          Detalhes
                        </Button>
                        <Button
                          size="sm"
                          variant="secondary"
                          disabled={generatePlans.isPending || e.gaps === 0}
                          onClick={() => generatePlans.mutate(e.user_id)}
                        >
                          <Sparkles className="h-3.5 w-3.5 mr-1" /> Gerar planos
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>

            <TabsContent value="plans" className="mt-4 space-y-3">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-56">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="open">Em aberto</SelectItem>
                  <SelectItem value="late">Atrasados</SelectItem>
                  <SelectItem value="completed">Concluídos</SelectItem>
                  <SelectItem value="cancelled">Cancelados</SelectItem>
                  <SelectItem value="all">Todos</SelectItem>
                </SelectContent>
              </Select>

              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Colaborador</TableHead>
                    <TableHead>Competência</TableHead>
                    <TableHead>Nível atual → alvo</TableHead>
                    <TableHead>Situação</TableHead>
                    <TableHead>Previsto</TableHead>
                    <TableHead>Prazo</TableHead>
                    <TableHead>Realizado</TableHead>
                    <TableHead className="text-right">Ações</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {allPlans.length === 0 && (
                    <TableRow>
                      <TableCell colSpan={8} className="text-center text-muted-foreground">
                        Nenhum plano nesse filtro.
                      </TableCell>
                    </TableRow>
                  )}
                  {allPlans.map(({ plan, employee }) => (
                    <TableRow key={plan.id}>
                      <TableCell className="font-medium">{employee}</TableCell>
                      <TableCell>{compMap[plan.competency_id] ?? "—"}</TableCell>
                      <TableCell className="text-sm">
                        {competencyLevelLabel[plan.current_level] ?? plan.current_level} →{" "}
                        {competencyLevelLabel[plan.target_level] ?? plan.target_level}
                      </TableCell>
                      <TableCell>
                        <Badge variant={statusVariant(plan.status) as any}>
                          {trainingPlanStatusLabel[plan.status]}
                        </Badge>
                        {isPlanLate(plan) && (
                          <Badge variant="destructive" className="ml-1">
                            Atrasado
                          </Badge>
                        )}
                      </TableCell>
                      <TableCell>{fmt(plan.planned_date)}</TableCell>
                      <TableCell>{fmt(plan.due_date)}</TableCell>
                      <TableCell>{fmt(plan.executed_date)}</TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => setEditPlan({ plan, employee })}>
                          <Pencil className="h-3.5 w-3.5 mr-1" /> Editar
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={!!detail} onOpenChange={(o) => !o && setDetail(null)}>
        <DialogContent className="max-w-2xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{detail?.full_name}</DialogTitle>
            <p className="text-sm text-muted-foreground">
              Cobertura de {detail?.coverage}% — {detail?.gaps} lacuna(s) em {detail?.requirements} requisito(s).
            </p>
          </DialogHeader>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Competência</TableHead>
                <TableHead>Exigido</TableHead>
                <TableHead>Atual</TableHead>
                <TableHead className="text-center">Gap</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {(detail?.rows ?? []).map((r) => (
                <TableRow key={r.competency_id}>
                  <TableCell>
                    {r.competency_name}
                    {r.is_mandatory && (
                      <Badge variant="outline" className="ml-2">
                        obrigatória
                      </Badge>
                    )}
                  </TableCell>
                  <TableCell>{competencyLevelLabel[r.required_level] ?? r.required_level}</TableCell>
                  <TableCell>{competencyLevelLabel[r.current_level] ?? r.current_level}</TableCell>
                  <TableCell className="text-center">
                    {r.gap > 0 ? (
                      <Badge variant={r.is_mandatory ? "destructive" : "warning"}>{r.gap}</Badge>
                    ) : (
                      <Badge variant="success">OK</Badge>
                    )}
                  </TableCell>
                </TableRow>
              ))}
              {(detail?.rows ?? []).length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="text-center text-muted-foreground">
                    Sem requisitos de competência definidos para o papel deste colaborador.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </DialogContent>
      </Dialog>

      {editPlan && (
        <HRTrainingPlanDialog
          plan={editPlan.plan}
          employeeName={editPlan.employee}
          competencyName={compMap[editPlan.plan.competency_id]}
          onClose={() => setEditPlan(null)}
        />
      )}
    </div>
  );
};

export default HRTraining;
