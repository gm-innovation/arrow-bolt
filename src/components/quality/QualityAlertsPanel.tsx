import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useQualityAlerts, CATEGORY_LABELS, QualityAlert } from "@/hooks/useQualityAlerts";
import { AlertTriangle, Clock, Bell, ExternalLink } from "lucide-react";
import { format, parseISO } from "date-fns";
import { useState } from "react";

const sourceRoute = (a: QualityAlert) => {
  switch (a.source) {
    case "org_context":
      return "/quality/iso-structure";
    case "interested_party":
    case "party_evidence":
      return "/quality/interested-parties";
    case "document":
      return `/quality/documents/${a.entity_id}`;
    default:
      return "/quality";
  }
};

const QualityAlertsPanel = () => {
  const { active, counters, isLoading } = useQualityAlerts();
  const [filter, setFilter] = useState<string | null>(null);

  const cards: { key: keyof typeof counters; label: string }[] = [
    { key: "org_context", label: "Contexto" },
    { key: "interested_party", label: "Partes Interessadas" },
    { key: "party_evidence", label: "Evidências" },
    { key: "external_norm", label: "Normas externas" },
    { key: "external_law", label: "Leis/Regulamentos" },
    { key: "external_certificate", label: "Certificados/Licenças" },
    { key: "client", label: "Docs Cliente" },
    { key: "internal", label: "Docs Internos" },
  ];

  const filtered = filter
    ? active.filter((a) => {
        if (filter === "org_context") return a.source === "org_context";
        if (filter === "interested_party") return a.source === "interested_party";
        if (filter === "party_evidence") return a.source === "party_evidence";
        return a.source === "document" && a.category === filter;
      })
    : active;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="flex items-center gap-2">
          <Bell className="h-5 w-5" /> Alertas de revisão e validade
        </CardTitle>
        <Badge variant={active.length > 0 ? "destructive" : "outline"}>{active.length} pendente(s)</Badge>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {cards.map((c) => (
            <button
              key={c.key}
              onClick={() => setFilter(filter === c.key ? null : c.key)}
              className={`text-left p-3 rounded border transition ${
                filter === c.key ? "border-primary bg-primary/5" : "border-border hover:bg-muted/30"
              }`}
            >
              <div className="text-xs text-muted-foreground">{c.label}</div>
              <div className="text-2xl font-bold">{counters[c.key]}</div>
            </button>
          ))}
        </div>

        <div className="space-y-1 max-h-64 overflow-y-auto">
          {isLoading ? (
            <p className="text-center text-sm text-muted-foreground py-4">Carregando...</p>
          ) : filtered.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-4">
              {filter ? "Nada nesta categoria." : "Nenhum alerta ativo. Tudo em dia."}
            </p>
          ) : (
            filtered.map((a) => (
              <Link
                key={`${a.source}-${a.entity_id}`}
                to={sourceRoute(a)}
                className="flex items-center justify-between border rounded p-2 hover:bg-muted/30"
              >
                <div className="flex items-center gap-2 flex-1 min-w-0">
                  {a.status === "overdue" ? (
                    <AlertTriangle className="h-4 w-4 text-destructive flex-shrink-0" />
                  ) : (
                    <Clock className="h-4 w-4 text-yellow-600 flex-shrink-0" />
                  )}
                  <div className="min-w-0">
                    <div className="text-sm font-medium truncate">{a.title}</div>
                    <div className="text-xs text-muted-foreground">
                      {CATEGORY_LABELS[a.category] ?? a.category}
                      {a.due_date && ` · ${format(parseISO(a.due_date), "dd/MM/yyyy")}`}
                      {a.days_remaining !== null &&
                        ` · ${a.days_remaining < 0 ? `venceu há ${Math.abs(a.days_remaining)}d` : `em ${a.days_remaining}d`}`}
                    </div>
                  </div>
                </div>
                <ExternalLink className="h-4 w-4 text-muted-foreground" />
              </Link>
            ))
          )}
        </div>

        {filter && (
          <div className="text-right">
            <Button variant="ghost" size="sm" onClick={() => setFilter(null)}>Limpar filtro</Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QualityAlertsPanel;
