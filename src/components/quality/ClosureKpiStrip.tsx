import { Card, CardContent } from "@/components/ui/card";
import { useQualityAlerts } from "@/hooks/useQualityAlerts";
import { AlertTriangle, ShieldCheck, BookOpen } from "lucide-react";
import { Link } from "react-router-dom";

const ClosureKpiStrip = () => {
  const { counters, active } = useQualityAlerts();
  const pendingTreatments = active.filter((a) => a.source === "interested_party").length;

  const cards = [
    {
      label: "Evidências vencidas / a vencer",
      value: counters.party_evidence,
      icon: AlertTriangle,
      tone: counters.party_evidence > 0 ? "text-destructive" : "text-muted-foreground",
      to: "/quality/interested-parties",
    },
    {
      label: "Eficácia de melhoria pendente",
      value: counters.improvement_effectiveness,
      icon: ShieldCheck,
      tone: counters.improvement_effectiveness > 0 ? "text-amber-600" : "text-muted-foreground",
      to: "/quality/improvements",
    },
    {
      label: "Partes interessadas a revisar",
      value: counters.interested_party + pendingTreatments,
      icon: BookOpen,
      tone: counters.interested_party > 0 ? "text-amber-600" : "text-muted-foreground",
      to: "/quality/interested-parties",
    },
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
      {cards.map((c) => (
        <Link key={c.label} to={c.to} className="block">
          <Card className="hover:bg-accent/30 transition-colors">
            <CardContent className="p-4 flex items-center gap-3">
              <c.icon className={`h-8 w-8 ${c.tone}`} />
              <div>
                <div className="text-2xl font-semibold leading-none">{c.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{c.label}</div>
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
};

export default ClosureKpiStrip;
