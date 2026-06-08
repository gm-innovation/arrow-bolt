import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Pencil, Trash2, ShieldAlert, ArrowRight } from "lucide-react";
import { Link } from "react-router-dom";
import type { ContextItem } from "@/hooks/useQualityOrgContext";

interface Props {
  item: ContextItem;
  onEdit: () => void;
  onRemove: () => void;
  onGenerateRisk: () => void;
}

const impactColor: Record<string, string> = {
  low: "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
  medium: "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
  high: "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
};

const ContextItemCard = ({ item, onEdit, onRemove, onGenerateRisk }: Props) => (
  <Card className="group">
    <CardContent className="p-3 space-y-2">
      <div className="flex items-start justify-between gap-2">
        <div className="font-medium text-sm flex-1">{item.title}</div>
        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition">
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onEdit}><Pencil className="h-3.5 w-3.5" /></Button>
          <Button size="icon" variant="ghost" className="h-7 w-7" onClick={onRemove}><Trash2 className="h-3.5 w-3.5" /></Button>
        </div>
      </div>
      {item.description && <p className="text-xs text-muted-foreground line-clamp-3">{item.description}</p>}
      <div className="flex items-center gap-2 flex-wrap pt-1">
        {item.impact_level && (
          <Badge variant="secondary" className={impactColor[item.impact_level]}>
            Impacto: {item.impact_level === "low" ? "Baixo" : item.impact_level === "medium" ? "Médio" : "Alto"}
          </Badge>
        )}
        {item.linked_risk_id ? (
          <Link to="/quality/risks?tab=risks">
            <Badge variant="outline" className="gap-1">→ Risco gerado <ArrowRight className="h-3 w-3" /></Badge>
          </Link>
        ) : (
          <Button size="sm" variant="ghost" className="h-6 px-2 text-xs" onClick={onGenerateRisk}>
            <ShieldAlert className="h-3 w-3 mr-1" />Gerar risco
          </Button>
        )}
      </div>
    </CardContent>
  </Card>
);

export default ContextItemCard;
