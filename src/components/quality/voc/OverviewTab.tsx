import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Link } from "react-router-dom";
import { ComplaintRow } from "@/hooks/useQualityComplaints";

interface Props {
  responses: any[];
  complaints: ComplaintRow[];
  onNavigate: (tab: string) => void;
}

export default function OverviewTab({ responses, complaints, onNavigate }: Props) {
  const promoters = responses.filter((r) => r.derived_nps === "promoter").length;
  const neutrals = responses.filter((r) => r.derived_nps === "neutral").length;
  const detractors = responses.filter((r) => r.derived_nps === "detractor").length;
  const total = responses.length || 1;

  const satisfied = responses.filter((r) => r.derived_csat === "satisfied").length;
  const csatNeutral = responses.filter((r) => r.derived_csat === "neutral").length;
  const dissatisfied = responses.filter((r) => r.derived_csat === "dissatisfied").length;

  const openComplaints = complaints
    .filter((c) => c.status !== "resolved" && c.status !== "rejected")
    .slice(0, 5);
  const recentComments = responses.filter((r) => r.comment).slice(0, 5);

  const Bar = ({ label, value, color }: { label: string; value: number; color: string }) => {
    const pct = Math.round((value / total) * 100);
    return (
      <div className="space-y-1">
        <div className="flex justify-between text-xs">
          <span className="text-muted-foreground">{label}</span>
          <span className="font-medium">
            {value} ({pct}%)
          </span>
        </div>
        <div className="h-2 rounded-full bg-muted overflow-hidden">
          <div className={`h-full ${color}`} style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Distribuição NPS</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {responses.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem respostas ainda.</p>
          ) : (
            <>
              <Bar label="Promotores (9-10)" value={promoters} color="bg-green-500" />
              <Bar label="Neutros (7-8)" value={neutrals} color="bg-amber-400" />
              <Bar label="Detratores (0-6)" value={detractors} color="bg-red-500" />
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Distribuição CSAT</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {responses.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem respostas ainda.</p>
          ) : (
            <>
              <Bar label="Satisfeitos (4-5)" value={satisfied} color="bg-green-500" />
              <Bar label="Neutros (3)" value={csatNeutral} color="bg-amber-400" />
              <Bar label="Insatisfeitos (1-2)" value={dissatisfied} color="bg-red-500" />
            </>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3 flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Reclamações em aberto</CardTitle>
          <Button variant="ghost" size="sm" onClick={() => onNavigate("complaints")}>
            Ver todas
          </Button>
        </CardHeader>
        <CardContent className="space-y-2">
          {openComplaints.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhuma reclamação em aberto. 🎉</p>
          ) : (
            openComplaints.map((c) => (
              <Link
                key={c.id}
                to={`/quality/complaints/${c.id}`}
                className="block p-2 rounded-md hover:bg-muted transition-colors"
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">
                      <span className="font-mono text-xs text-muted-foreground mr-1">
                        #{c.complaint_number}
                      </span>
                      {c.title}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(c.received_at).toLocaleDateString("pt-BR")}
                    </p>
                  </div>
                  <Badge variant="outline" className="shrink-0 text-xs">
                    {c.status}
                  </Badge>
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Últimos comentários de clientes</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {recentComments.length === 0 ? (
            <p className="text-sm text-muted-foreground">Sem comentários recentes.</p>
          ) : (
            recentComments.map((r, i) => (
              <div key={i} className="border-l-2 border-primary/40 pl-3 py-1">
                <p className="text-sm italic">"{r.comment}"</p>
                <div className="flex gap-3 mt-1 text-xs text-muted-foreground">
                  <span>NPS {r.nps_score}</span>
                  <span>CSAT {r.csat_score}</span>
                  <span>{new Date(r.responded_at).toLocaleDateString("pt-BR")}</span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
