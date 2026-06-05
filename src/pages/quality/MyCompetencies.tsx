import { useMemo } from "react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { useQualityMatrix } from "@/hooks/useQualityMatrix";
import { useQualityCompetencies } from "@/hooks/useQualityCompetencies";
import {
  useMyTrainingPlans,
  useQualityTrainingPlanActions,
} from "@/hooks/useQualityTrainingPlans";
import TrainingPlanCard from "@/components/quality/TrainingPlanCard";
import { RefreshCw, Sparkles } from "lucide-react";

const MyCompetencies = () => {
  const { user } = useAuth();
  const { items, recompute } = useQualityMatrix({ userId: user?.id });
  const { items: comps } = useQualityCompetencies();
  const { data: plans = [] } = useMyTrainingPlans();
  const { generate } = useQualityTrainingPlanActions();

  const compById = useMemo(() => Object.fromEntries(comps.map((c) => [c.id, c.name])), [comps]);

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Minhas Competências</h2>
          <p className="text-muted-foreground">Seu mapa de competências, evidências e plano de capacitação.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" onClick={() => user && recompute.mutate(user.id)}>
            <RefreshCw className="h-4 w-4 mr-1" />Recalcular
          </Button>
          <Button size="sm" onClick={() => user && generate.mutate(user.id)}>
            <Sparkles className="h-4 w-4 mr-1" />Gerar plano
          </Button>
        </div>
      </div>

      <Tabs defaultValue="map">
        <TabsList>
          <TabsTrigger value="map">Meu mapa</TabsTrigger>
          <TabsTrigger value="plan">Meu plano</TabsTrigger>
        </TabsList>

        <TabsContent value="map" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              {items.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-6">
                  Sem competências definidas para o seu cargo.
                </p>
              ) : (
                <ul className="divide-y">
                  {items.map((r) => (
                    <li key={r.competency_id} className="py-3 flex items-center justify-between gap-3">
                      <div>
                        <div className="font-medium text-sm">{r.competency_name}</div>
                        <div className="text-xs text-muted-foreground">
                          {r.category} · requerido <b>{r.required_level}</b>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge
                          variant={
                            r.gap === 0 ? "success" : r.gap === 1 ? "warning" : "destructive"
                          }
                        >
                          atual {r.current_level}
                        </Badge>
                        {r.gap > 0 && <span className="text-xs text-muted-foreground">gap {r.gap}</span>}
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="plan" className="mt-4 space-y-3">
          {plans.length === 0 ? (
            <Card>
              <CardContent className="pt-6 text-sm text-muted-foreground text-center py-6">
                Nenhum plano de capacitação ativo.
              </CardContent>
            </Card>
          ) : (
            plans.map((p) => (
              <TrainingPlanCard
                key={p.id}
                plan={p}
                competencyName={compById[p.competency_id]}
                canManage
              />
            ))
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default MyCompetencies;
