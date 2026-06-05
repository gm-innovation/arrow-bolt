import { Card, CardContent } from "@/components/ui/card";
import { LucideIcon } from "lucide-react";
import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

interface KpiCardProps {
  label: string;
  value: number | string;
  hint?: string;
  icon?: LucideIcon;
  to?: string;
  tone?: "default" | "warning" | "destructive" | "success";
}

const toneClasses: Record<string, string> = {
  default: "text-foreground",
  warning: "text-amber-600 dark:text-amber-400",
  destructive: "text-destructive",
  success: "text-emerald-600 dark:text-emerald-400",
};

const KpiCard = ({ label, value, hint, icon: Icon, to, tone = "default" }: KpiCardProps) => {
  const inner = (
    <Card className={cn("transition", to && "hover:bg-muted/30 cursor-pointer")}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2">
          <div className="space-y-1">
            <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">{label}</p>
            <p className={cn("text-3xl font-bold leading-none", toneClasses[tone])}>{value}</p>
            {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
          </div>
          {Icon && <Icon className="h-5 w-5 text-muted-foreground shrink-0" />}
        </div>
      </CardContent>
    </Card>
  );
  return to ? <Link to={to}>{inner}</Link> : inner;
};

export default KpiCard;
