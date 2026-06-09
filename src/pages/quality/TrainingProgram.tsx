import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { CalendarRange, CheckCircle2, Pencil, Stethoscope } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useCompanyTrainingPlans } from "@/hooks/useQualityTrainingPlans";
import { useQualityCompetencies } from "@/hooks/useQualityCompetencies";
import { useAllTrainingEffectiveness } from "@/hooks/useQualityTrainingEffectiveness";
import { supabase } from "@/integrations/supabase/client";
import { useQuery } from "@tanstack/react-query";
import { useAuth } from "@/contexts/AuthContext";
import EvaluateEffectivenessDialog from "@/components/quality/training/EvaluateEffectivenessDialog";
import TrainingPlanFormDialog from "@/components/quality/training/TrainingPlanFormDialog";
import { trainingTypeLabel, originTypeLabel } from "@/components/quality/training/TrainingPlanFormDialog";

const resultBadge = (r?: string) => {
  if (!r) return <Badge variant="outline">—</Badge>;
  if (r === "eficaz") return <Badge variant="success">Eficaz</Badge>;
  if (r === "parcial") return <Badge variant="warning">Parcial</Badge>;
  return <Badge variant="destructive">Não eficaz</Badge>;
};

const TrainingProgram = () => {
  const { profile } = useAuth();
  const { data: plans = [] } = useCompanyTrainingPlans();
  const { items: comps } = useQualityCompetencies();
  const { data: effectiveness = [] } = useAllTrainingEffectiveness();

  const [year, setYear] = useState<number>(new Date().getFullYear());
  const [typeFilter, setTypeFilter] = useState<string>("all");
  const [originFilter, setOriginFilter] = useState<string>("all");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [search, setSearch] = useState("");

  const [evalTarget, setEvalTarget] = useState<{ id: string; title: string } | null>(null);
  const [editTarget, setEditTarget] = useState<any | null>(null);

  const { data: profilesMap = {} } = useQuery({
    queryKey: ["training-program-profiles", profile?.company_id],
    enabled: !!profile?.company_id,
    queryFn: async () => {
      const { data } = await supabase
        .from("profiles")
        .select("id, full_name")
        .eq("company_id", profile!.company_id!);
      const map: Record<string, string> = {};
      (data ?? []).forEach((p: any) => (map[p.id] = p.full_name));
      return map;
    },
  });

  const compMap = useMemo(() => Object.fromEntries(comps.map((c) => [c.id, c.name])), [comps]);
  const latestEval = useMemo(() => {
    const m: Record<string, string> = {};
    effectiveness.forEach((e) => {
      if (!m[e.training_id]) m[e.training_id] = e.result;
    });
    return m;
  }, [effectiveness]);

  const filtered = useMemo(() => {
    return plans.filter((p: any) => {
      if ((p.program_year || new Date(p.generated_at).getFullYear()) !== year) return false;
      if (typeFilter !== "all" && (p.type || "internal") !== typeFilter) return false;
      if (originFilter !== "all" && p.origin_type !== originFilter) return false;
      if (statusFilter !== "all" && p.status !== statusFilter) return false;
      if (search) {
        const s = search.toLowerCase();
        const compName = compMap[p.competency_id]?.toLowerCase() || "";
        const owner = profilesMap[p.user_id]?.toLowerCase() || "";
        const inst = (p.institution || "").toLowerCase();
        if (!compName.includes(s) && !owner.includes(s) && !inst.includes(s)) return false;
      }
      return true;
    });
  }, [plans, year, typeFilter, originFilter, statusFilter, search, compMap, profilesMap]);

  const total = filtered.length;
  const completed = filtered.filter((p) => p.status === "completed").length;
  const execPct = total ? Math.round((completed / total) * 100) : 0;

  const years = useMemo(() => {
    const set = new Set<number>([new Date().getFullYear()]);
    plans.forEach((p: any) => set.add(p.program_year || new Date(p.generated_at).getFullYear()));
    return Array.from(set).sort((a, b) => b - a);
  }, [plans]);

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
          <div>
            <CardTitle className="flex items-center gap-2">
              <CalendarRange className="h-5 w-5" /> Programa Anual de Treinamentos
            </CardTitle>
            <p className="text-sm text-muted-foreground">
              Visão consolidada dos treinamentos planejados para o ano — §7.2 ISO 9001.
            </p>
          </div>
          <div className="flex items-end gap-3">
            <div>
              <p className="text-xs text-muted-foreground mb-1">% de execução</p>
              <div className="flex items-center gap-2">
                <Progress value={execPct} className="w-40" />
                <span className="font-semibold text-sm">{execPct}%</span>
              </div>
              <p className="text-xs text-muted-foreground mt-1">
                {completed}/{total} concluídos
              </p>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2 mb-4">
            <Select value={String(year)} onValueChange={(v) => setYear(Number(v))}>
              <SelectTrigger className="w-28"><SelectValue /></SelectTrigger>
              <SelectContent>
                {years.map((y) => (<SelectItem key={y} value={String(y)}>{y}</SelectItem>))}
              </SelectContent>
            </Select>
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-44"><SelectValue placeholder="Tipo" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os tipos</SelectItem>
                {Object.entries(trainingTypeLabel).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={originFilter} onValueChange={setOriginFilter}>
              <SelectTrigger className="w-52"><SelectValue placeholder="Origem" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas as origens</SelectItem>
                {Object.entries(originTypeLabel).map(([v, l]) => (
                  <SelectItem key={v} value={v}>{l}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger className="w-40"><SelectValue placeholder="Status" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os status</SelectItem>
                <SelectItem value="proposed">Proposto</SelectItem>
                <SelectItem value="in_progress">Em andamento</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
                <SelectItem value="cancelled">Cancelado</SelectItem>
              </SelectContent>
            </Select>
            <Input
              className="w-52"
              placeholder="Buscar colaborador, tema, instituição..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>

          {filtered.length === 0 ? (
            <p className="text-center py-10 text-muted-foreground text-sm">
              Nenhum treinamento no programa de {year}.
            </p>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Tema / Competência</TableHead>
                  <TableHead>Tipo</TableHead>
                  <TableHead>Origem</TableHead>
                  <TableHead>Instituição</TableHead>
                  <TableHead className="w-28">Planejado</TableHead>
                  <TableHead className="w-28">Status</TableHead>
                  <TableHead className="w-32">Eficácia</TableHead>
                  <TableHead className="w-32 text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((p: any) => {
                  const titleStr = compMap[p.competency_id] || "Competência";
                  return (
                    <TableRow key={p.id}>
                      <TableCell className="text-sm">{profilesMap[p.user_id] || p.user_id.slice(0, 8)}</TableCell>
                      <TableCell className="font-medium text-sm">{titleStr}</TableCell>
                      <TableCell className="text-xs">{trainingTypeLabel[p.type || "internal"] || p.type}</TableCell>
                      <TableCell className="text-xs">{originTypeLabel[p.origin_type] || "—"}</TableCell>
                      <TableCell className="text-xs">{p.institution || "—"}</TableCell>
                      <TableCell className="text-xs">
                        {p.planned_date ? format(parseISO(p.planned_date), "dd/MM/yyyy") : "—"}
                      </TableCell>
                      <TableCell>
                        <Badge variant={p.status === "completed" ? "success" : p.status === "in_progress" ? "secondary" : p.status === "cancelled" ? "destructive" : "outline"}>
                          {p.status}
                        </Badge>
                      </TableCell>
                      <TableCell>{resultBadge(latestEval[p.id])}</TableCell>
                      <TableCell className="text-right">
                        <Button variant="ghost" size="icon" onClick={() => setEditTarget(p)}>
                          <Pencil className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          disabled={p.status !== "completed"}
                          title={p.status !== "completed" ? "Disponível após o treinamento ser concluído" : "Avaliar eficácia"}
                          onClick={() => setEvalTarget({ id: p.id, title: titleStr })}
                        >
                          <Stethoscope className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {evalTarget && (
        <EvaluateEffectivenessDialog
          open
          onOpenChange={(v) => !v && setEvalTarget(null)}
          trainingId={evalTarget.id}
          trainingTitle={evalTarget.title}
        />
      )}
      {editTarget && (
        <TrainingPlanFormDialog
          open
          onOpenChange={(v) => !v && setEditTarget(null)}
          plan={editTarget}
        />
      )}
    </div>
  );
};

export default TrainingProgram;
