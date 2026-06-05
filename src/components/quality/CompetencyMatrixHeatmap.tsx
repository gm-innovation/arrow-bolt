import { useMemo, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import {
  Tooltip, TooltipContent, TooltipProvider, TooltipTrigger,
} from "@/components/ui/tooltip";
import { useQualityMatrix, type MatrixRow } from "@/hooks/useQualityMatrix";
import type { CompetencyLevel } from "@/hooks/useQualityRoleRequirements";
import CompetencyAssessmentDrawer from "./CompetencyAssessmentDrawer";
import { ArrowUp } from "lucide-react";

const LEVEL_ORDER: Record<CompetencyLevel, number> = {
  none: 0, basic: 1, intermediate: 2, advanced: 3, expert: 4,
};
const LEVEL_LABEL: Record<CompetencyLevel, string> = {
  none: "—", basic: "B", intermediate: "I", advanced: "A", expert: "E",
};

const cellClass = (row: MatrixRow) => {
  if (row.gap === 0) return "bg-success-soft text-success-soft-foreground";
  if (row.gap === 1) return "bg-warning-soft text-warning-soft-foreground";
  return "bg-destructive/15 text-destructive";
};

const CompetencyMatrixHeatmap = () => {
  const [role, setRole] = useState<string>("all");
  const [onlyGaps, setOnlyGaps] = useState(false);
  const [selected, setSelected] = useState<{ user_id: string; competency_id: string } | null>(null);

  const { items, isLoading } = useQualityMatrix({
    role: role === "all" ? undefined : role,
    onlyGaps,
  });

  const { users, competencies, byKey } = useMemo(() => {
    const usersMap = new Map<string, { id: string; name: string; role: string }>();
    const compsMap = new Map<string, { id: string; name: string }>();
    const byKey = new Map<string, MatrixRow>();
    for (const r of items) {
      usersMap.set(r.user_id, { id: r.user_id, name: r.full_name ?? "—", role: r.role });
      compsMap.set(r.competency_id, { id: r.competency_id, name: r.competency_name });
      byKey.set(`${r.user_id}|${r.competency_id}`, r);
    }
    return {
      users: Array.from(usersMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
      competencies: Array.from(compsMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
      byKey,
    };
  }, [items]);

  const roles = useMemo(() => Array.from(new Set(items.map((r) => r.role))), [items]);

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="pt-6 flex flex-wrap items-center gap-4">
          <div className="flex items-center gap-2">
            <Label className="text-sm">Cargo:</Label>
            <Select value={role} onValueChange={setRole}>
              <SelectTrigger className="w-44"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {roles.map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div className="flex items-center gap-2">
            <Switch id="only-gaps" checked={onlyGaps} onCheckedChange={setOnlyGaps} />
            <Label htmlFor="only-gaps" className="text-sm cursor-pointer">Somente gaps</Label>
          </div>
          <div className="ml-auto flex items-center gap-3 text-xs text-muted-foreground">
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded bg-success-soft" /> Atende
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded bg-warning-soft" /> Gap 1
            </span>
            <span className="inline-flex items-center gap-1">
              <span className="inline-block w-3 h-3 rounded bg-destructive/15" /> Gap ≥ 2
            </span>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6 overflow-x-auto">
          {isLoading ? (
            <p className="text-sm text-muted-foreground text-center py-8">Carregando…</p>
          ) : users.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">
              Nenhum dado na matriz. Cadastre competências e requisitos por cargo.
            </p>
          ) : (
            <TooltipProvider>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="sticky left-0 bg-background z-10 min-w-[200px]">Colaborador</TableHead>
                    {competencies.map((c) => (
                      <TableHead key={c.id} className="text-center text-xs whitespace-nowrap">
                        {c.name}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {users.map((u) => (
                    <TableRow key={u.id}>
                      <TableCell className="sticky left-0 bg-background z-10">
                        <div className="font-medium text-sm">{u.name}</div>
                        <div className="text-xs text-muted-foreground">{u.role}</div>
                      </TableCell>
                      {competencies.map((c) => {
                        const row = byKey.get(`${u.id}|${c.id}`);
                        if (!row) return <TableCell key={c.id} className="text-center text-muted-foreground">—</TableCell>;
                        const showManualBadge =
                          row.manual_override &&
                          LEVEL_ORDER[row.current_level] > LEVEL_ORDER[row.auto_suggested_level];
                        return (
                          <TableCell key={c.id} className="p-1 text-center">
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <button
                                  onClick={() => setSelected({ user_id: u.id, competency_id: c.id })}
                                  className={`relative w-full px-2 py-1 rounded text-xs font-semibold ${cellClass(row)}`}
                                >
                                  {LEVEL_LABEL[row.current_level]}
                                  {" / "}
                                  {LEVEL_LABEL[row.required_level]}
                                  {showManualBadge && (
                                    <Badge variant="outline" className="absolute -top-2 -right-2 h-4 px-1 text-[9px]">
                                      <ArrowUp className="h-2.5 w-2.5" />M
                                    </Badge>
                                  )}
                                </button>
                              </TooltipTrigger>
                              <TooltipContent>
                                <div className="text-xs space-y-0.5">
                                  <div>Atual: <b>{row.current_level}</b></div>
                                  <div>Requerido: <b>{row.required_level}</b></div>
                                  <div>Auto-sugerido: <b>{row.auto_suggested_level}</b></div>
                                  {showManualBadge && (
                                    <div className="text-warning-soft-foreground">
                                      Nível manual superior às evidências
                                    </div>
                                  )}
                                </div>
                              </TooltipContent>
                            </Tooltip>
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TooltipProvider>
          )}
        </CardContent>
      </Card>

      {selected && (
        <CompetencyAssessmentDrawer
          userId={selected.user_id}
          competencyId={selected.competency_id}
          open={!!selected}
          onClose={() => setSelected(null)}
        />
      )}
    </div>
  );
};

export default CompetencyMatrixHeatmap;
