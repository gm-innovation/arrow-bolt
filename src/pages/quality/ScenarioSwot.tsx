import { useMemo } from "react";
import { useQualityOrgContext } from "@/hooks/useQualityOrgContext";
import { computeSwotScenario, type SwotScenario } from "@/lib/qualityScenario";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, Shield, RefreshCw, AlertOctagon, Sparkles } from "lucide-react";

const ICONS: Record<SwotScenario, any> = {
  ofensivo: TrendingUp, defensivo: Shield, reorientacao: RefreshCw,
  sobrevivencia: AlertOctagon, indefinido: Sparkles,
};
const VARIANTS: Record<SwotScenario, "default" | "secondary" | "destructive" | "outline"> = {
  ofensivo: "default", defensivo: "secondary", reorientacao: "secondary",
  sobrevivencia: "destructive", indefinido: "outline",
};

export default function ScenarioSwot() {
  const { items, isLoading } = useQualityOrgContext();
  const result = useMemo(() => computeSwotScenario(items), [items]);
  const Icon = ICONS[result.scenario];

  const grouped = useMemo(() => {
    const g = { strengths: [] as any[], weaknesses: [] as any[], opportunities: [] as any[], threats: [] as any[] };
    items.forEach((i) => {
      if (i.category === "swot_strength") g.strengths.push(i);
      else if (i.category === "swot_weakness") g.weaknesses.push(i);
      else if (i.category === "swot_opportunity") g.opportunities.push(i);
      else if (i.category === "swot_threat") g.threats.push(i);
    });
    return g;
  }, [items]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-2xl font-semibold">SWOT / Cenário Estratégico</h2>
        <p className="text-sm text-muted-foreground">Calculado automaticamente a partir dos itens SWOT do Contexto.</p>
      </div>

      <Card>
        <CardHeader className="pb-2"><CardTitle className="text-base">Cenário Estratégico Atual</CardTitle></CardHeader>
        <CardContent className="space-y-2">
          {isLoading ? <p className="text-sm text-muted-foreground">Carregando…</p> : (
            <>
              <div className="flex items-center gap-2">
                <Icon className="h-6 w-6" />
                <Badge variant={VARIANTS[result.scenario]} className="text-base px-3 py-1">{result.label}</Badge>
              </div>
              <p className="text-sm text-muted-foreground">{result.description}</p>
              <div className="grid grid-cols-2 gap-3 pt-2 text-sm">
                <div><b>Score interno:</b> {result.internalScore}</div>
                <div><b>Score externo:</b> {result.externalScore}</div>
              </div>
            </>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3 md:grid-cols-2">
        {[
          { title: "Forças", items: grouped.strengths },
          { title: "Fraquezas", items: grouped.weaknesses },
          { title: "Oportunidades", items: grouped.opportunities },
          { title: "Ameaças", items: grouped.threats },
        ].map((g) => (
          <Card key={g.title}>
            <CardHeader className="pb-2"><CardTitle className="text-sm">{g.title} <span className="text-muted-foreground">({g.items.length})</span></CardTitle></CardHeader>
            <CardContent className="text-sm space-y-1">
              {g.items.length === 0 ? <p className="text-muted-foreground">—</p> : g.items.map((i: any) => (
                <div key={i.id} className="flex items-center justify-between gap-2 border-b last:border-b-0 py-1">
                  <span className="truncate">{i.title}</span>
                  {i.impact_level && <Badge variant="outline" className="text-xs">{i.impact_level}</Badge>}
                </div>
              ))}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
