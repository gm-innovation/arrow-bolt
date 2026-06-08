import { useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { GraduationCap, Users, ShieldCheck } from "lucide-react";
import { useQualityMatrix } from "@/hooks/useQualityMatrix";

/**
 * Onda 5 — Camada SGQ leve sobre RH.
 * Agrega conformidade da matriz de competência por cargo (proxy de departamento),
 * sem novas tabelas — consome `quality_competency_matrix_v` já existente.
 */
const RhBridgeSummary = () => {
  const { items } = useQualityMatrix();

  const summary = useMemo(() => {
    const mandatory = items.filter((r) => r.is_mandatory);
    const byRole = new Map<string, { total: number; ok: number; users: Set<string>; gaps: number }>();
    mandatory.forEach((r) => {
      const cur = byRole.get(r.role) ?? { total: 0, ok: 0, users: new Set(), gaps: 0 };
      cur.total += 1;
      cur.users.add(r.user_id);
      if (r.gap === 0) cur.ok += 1;
      else cur.gaps += 1;
      byRole.set(r.role, cur);
    });

    const rows = Array.from(byRole.entries())
      .map(([role, v]) => ({
        role,
        users: v.users.size,
        total: v.total,
        ok: v.ok,
        gaps: v.gaps,
        conformity: v.total > 0 ? Math.round((v.ok / v.total) * 100) : 0,
      }))
      .sort((a, b) => a.conformity - b.conformity);

    const globalConformity =
      mandatory.length > 0
        ? Math.round((mandatory.filter((r) => r.gap === 0).length / mandatory.length) * 100)
        : null;
    const usersCovered = new Set(mandatory.map((r) => r.user_id)).size;
    const criticalRoles = rows.filter((r) => r.conformity < 60).length;

    return { rows, globalConformity, usersCovered, criticalRoles };
  }, [items]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Users className="h-5 w-5 text-primary" />
          RH ↔ SGQ — Conformidade por cargo
        </CardTitle>
        <div className="flex gap-2 text-xs">
          <Badge variant="secondary" className="gap-1">
            <ShieldCheck className="h-3 w-3" />
            {summary.globalConformity !== null ? `${summary.globalConformity}% global` : "—"}
          </Badge>
          <Badge variant="outline" className="gap-1">
            <GraduationCap className="h-3 w-3" />
            {summary.usersCovered} colaborador(es)
          </Badge>
          {summary.criticalRoles > 0 && (
            <Badge variant="destructive">{summary.criticalRoles} cargo(s) &lt; 60%</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {summary.rows.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Cadastre requisitos por cargo e mapeamentos de competência para acompanhar a conformidade.
          </p>
        ) : (
          <div className="space-y-3">
            {summary.rows.map((r) => (
              <div key={r.role} className="space-y-1">
                <div className="flex items-center justify-between text-sm">
                  <span className="font-medium capitalize">{r.role}</span>
                  <span className="text-xs text-muted-foreground">
                    {r.users} pessoa(s) · {r.ok}/{r.total} requisitos atendidos
                    {r.gaps > 0 && <span className="text-destructive ml-2">· {r.gaps} gap(s)</span>}
                  </span>
                </div>
                <Progress value={r.conformity} className="h-2" />
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default RhBridgeSummary;
