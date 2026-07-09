import { useMemo } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, PhoneCall, CheckCircle2, XCircle } from "lucide-react";
import { useSiteLeads } from "@/hooks/useSiteLeads";
import { differenceInDays, parseISO } from "date-fns";

const baseHref = "/commercial/opportunities?tab=leads";

export const LeadsKpiCards = () => {
  const { leads, isLoading } = useSiteLeads();

  const stats = useMemo(() => {
    const now = new Date();
    let novos = 0;
    let revisados = 0;
    let convertidos30 = 0;
    let descartados30 = 0;
    for (const l of leads) {
      if (l.status === "new") novos++;
      else if (l.status === "reviewed") revisados++;
      else if (l.status === "converted") {
        const when = l.converted_at ? parseISO(l.converted_at) : parseISO(l.created_at);
        if (differenceInDays(now, when) <= 30) convertidos30++;
      } else if (l.status === "discarded") {
        if (differenceInDays(now, parseISO(l.created_at)) <= 30) descartados30++;
      }
    }
    return { novos, revisados, convertidos30, descartados30 };
  }, [leads]);

  const cards = [
    { label: "Leads novos", value: stats.novos, icon: Sparkles, tone: "text-primary", href: `${baseHref}&status=new` },
    { label: "Em contato", value: stats.revisados, icon: PhoneCall, tone: "text-blue-600 dark:text-blue-400", href: `${baseHref}&status=reviewed` },
    { label: "Convertidos (30d)", value: stats.convertidos30, icon: CheckCircle2, tone: "text-green-600 dark:text-green-400", href: `${baseHref}&status=converted` },
    { label: "Descartados (30d)", value: stats.descartados30, icon: XCircle, tone: "text-muted-foreground", href: `${baseHref}&status=discarded` },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {cards.map((c) => {
        const Icon = c.icon;
        return (
          <Link key={c.label} to={c.href} className="group">
            <Card className="transition-shadow group-hover:shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{c.label}</p>
                  <Icon className={`h-4 w-4 ${c.tone}`} />
                </div>
                <p className="text-2xl font-bold mt-1">{isLoading ? "…" : c.value}</p>
                <p className="text-xs text-muted-foreground mt-1">Ver na aba de Leads</p>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
};
