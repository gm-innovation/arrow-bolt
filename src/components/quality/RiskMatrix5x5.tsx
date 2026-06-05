import { cn } from "@/lib/utils";
import type { QualityRisk } from "@/hooks/useQualityRisks";

interface Props {
  risks: QualityRisk[];
  onCellClick?: (probability: number, impact: number) => void;
  selected?: { probability: number; impact: number } | null;
}

const severityFor = (score: number): "low" | "medium" | "high" | "critical" => {
  if (score <= 4) return "low";
  if (score <= 9) return "medium";
  if (score <= 15) return "high";
  return "critical";
};

const cellClass = (sev: "low" | "medium" | "high" | "critical") => {
  switch (sev) {
    case "low": return "bg-success-soft text-success-soft-foreground";
    case "medium": return "bg-warning-soft text-warning-soft-foreground";
    case "high": return "bg-destructive/20 text-destructive";
    case "critical": return "bg-destructive/40 text-destructive-foreground";
  }
};

const RiskMatrix5x5 = ({ risks, onCellClick, selected }: Props) => {
  // matrix[probability-1][impact-1]
  const grid: QualityRisk[][][] = Array.from({ length: 5 }, () => Array.from({ length: 5 }, () => []));
  risks.forEach((r) => {
    if (r.probability >= 1 && r.probability <= 5 && r.impact >= 1 && r.impact <= 5) {
      grid[r.probability - 1][r.impact - 1].push(r);
    }
  });

  return (
    <div className="inline-block">
      <div className="text-xs text-muted-foreground mb-2 text-center">Impacto →</div>
      <div className="flex">
        <div className="flex flex-col justify-around mr-2 text-xs text-muted-foreground">
          <span className="-rotate-90 whitespace-nowrap">Probabilidade ↑</span>
        </div>
        <table className="border-collapse">
          <tbody>
            {[5, 4, 3, 2, 1].map((prob) => (
              <tr key={prob}>
                <td className="text-xs text-muted-foreground text-right pr-2 w-6">{prob}</td>
                {[1, 2, 3, 4, 5].map((imp) => {
                  const cellRisks = grid[prob - 1][imp - 1];
                  const sev = severityFor(prob * imp);
                  const isSel = selected?.probability === prob && selected?.impact === imp;
                  return (
                    <td
                      key={imp}
                      onClick={() => onCellClick?.(prob, imp)}
                      className={cn(
                        "border border-border w-16 h-16 text-center cursor-pointer transition-all",
                        cellClass(sev),
                        isSel && "ring-2 ring-primary",
                      )}
                      title={`P=${prob} × I=${imp} (score ${prob * imp})`}
                    >
                      <div className="text-xs font-medium">{prob * imp}</div>
                      <div className="text-lg font-bold">{cellRisks.length || ""}</div>
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr>
              <td></td>
              {[1, 2, 3, 4, 5].map((i) => (
                <td key={i} className="text-xs text-muted-foreground text-center pt-1">{i}</td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default RiskMatrix5x5;
