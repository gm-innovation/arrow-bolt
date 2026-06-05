import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { format, parseISO } from "date-fns";
import type { QualityRisk, RiskSeverity } from "@/hooks/useQualityRisks";

interface Props {
  risks: QualityRisk[];
  onEdit?: (risk: QualityRisk) => void;
  emptyText?: string;
}

const severityVariant = (sev: RiskSeverity): "default" | "secondary" | "destructive" | "success" | "warning" => {
  switch (sev) {
    case "critical": return "destructive";
    case "high": return "destructive";
    case "medium": return "warning";
    case "low": return "success";
    default: return "secondary";
  }
};

const statusLabel: Record<string, string> = {
  identified: "Identificado",
  analyzing: "Analisando",
  treating: "Tratando",
  monitoring: "Monitorando",
  accepted: "Aceito",
  closed: "Fechado",
};

const treatmentLabel: Record<string, string> = {
  avoid: "Evitar",
  mitigate: "Mitigar",
  transfer: "Transferir",
  accept: "Aceitar",
  exploit: "Explorar",
  enhance: "Aumentar",
  share: "Compartilhar",
  ignore: "Ignorar",
};

const RiskRegisterTable = ({ risks, onEdit, emptyText = "Nenhum item." }: Props) => {
  if (risks.length === 0) {
    return (
      <Card><CardContent className="py-8 text-center text-sm text-muted-foreground">{emptyText}</CardContent></Card>
    );
  }
  return (
    <Card>
      <CardContent className="p-0 overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="text-left p-3 font-medium">Código</th>
              <th className="text-left p-3 font-medium">Título</th>
              <th className="text-left p-3 font-medium">Severidade</th>
              <th className="text-left p-3 font-medium">Tratamento</th>
              <th className="text-left p-3 font-medium">Status</th>
              <th className="text-left p-3 font-medium">Próx. Revisão</th>
              <th className="p-3"></th>
            </tr>
          </thead>
          <tbody>
            {risks.map((r) => (
              <tr key={r.id} className="border-t hover:bg-muted/20">
                <td className="p-3 font-mono text-xs">{r.code}</td>
                <td className="p-3">
                  <div className="font-medium">{r.title}</div>
                  {r.category && <div className="text-xs text-muted-foreground">{r.category}</div>}
                </td>
                <td className="p-3">
                  <Badge variant={severityVariant(r.severity) as any}>
                    {r.severity ?? "—"} ({r.score})
                  </Badge>
                  {r.residual_severity && (
                    <div className="text-xs text-muted-foreground mt-1">
                      Residual: {r.residual_severity} ({r.residual_score})
                    </div>
                  )}
                </td>
                <td className="p-3">{r.treatment ? treatmentLabel[r.treatment] : <span className="text-muted-foreground">—</span>}</td>
                <td className="p-3">
                  <Badge variant="outline">{statusLabel[r.status] ?? r.status}</Badge>
                </td>
                <td className="p-3 text-xs">
                  {r.next_review_due_at ? format(parseISO(r.next_review_due_at), "dd/MM/yyyy") : "—"}
                </td>
                <td className="p-3 text-right">
                  <Button size="sm" variant="outline" onClick={() => onEdit?.(r)}>Abrir</Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  );
};

export default RiskRegisterTable;
