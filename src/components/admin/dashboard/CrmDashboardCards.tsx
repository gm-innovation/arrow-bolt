import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent } from "@/components/ui/card";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Sparkles, PhoneCall, CheckCircle2, XCircle } from "lucide-react";
import { differenceInDays, parseISO } from "date-fns";

export function CrmDashboardCards() {
  const { profile } = useAuth();
  const [kpiStats, setKpiStats] = useState({ novos: 0, revisados: 0, convertidos30: 0, descartados30: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.company_id) return;
    (async () => {
      setLoading(true);
      const { data } = await supabase.from("public_site_leads")
        .select("id, status, created_at, converted_at")
        .in("segment", ["service", "unknown"]).limit(1000);

      const now = new Date();
      let novos = 0, revisados = 0, convertidos30 = 0, descartados30 = 0;
      for (const l of (data ?? []) as any[]) {
        if (l.status === "new") novos++;
        else if (l.status === "reviewed") revisados++;
        else if (l.status === "converted") {
          const when = l.converted_at ? parseISO(l.converted_at) : parseISO(l.created_at);
          if (differenceInDays(now, when) <= 30) convertidos30++;
        } else if (l.status === "discarded") {
          if (differenceInDays(now, parseISO(l.created_at)) <= 30) descartados30++;
        }
      }
      setKpiStats({ novos, revisados, convertidos30, descartados30 });
      setLoading(false);
    })();
  }, [profile?.company_id]);

  const baseHref = "/admin/opportunities?tab=leads";
  const kpis = [
    { label: "Leads novos", value: kpiStats.novos, icon: Sparkles, tone: "text-primary", href: `${baseHref}&status=new` },
    { label: "Em contato", value: kpiStats.revisados, icon: PhoneCall, tone: "text-blue-600 dark:text-blue-400", href: `${baseHref}&status=reviewed` },
    { label: "Convertidos (30d)", value: kpiStats.convertidos30, icon: CheckCircle2, tone: "text-green-600 dark:text-green-400", href: `${baseHref}&status=converted` },
    { label: "Descartados (30d)", value: kpiStats.descartados30, icon: XCircle, tone: "text-muted-foreground", href: `${baseHref}&status=discarded` },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
      {kpis.map((k) => {
        const Icon = k.icon;
        return (
          <Link key={k.label} to={k.href} className="group">
            <Card className="transition-shadow group-hover:shadow-md">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">{k.label}</p>
                  <Icon className={`h-4 w-4 ${k.tone}`} />
                </div>
                <p className="text-2xl font-bold mt-1">{loading ? "…" : k.value}</p>
                <p className="text-xs text-muted-foreground mt-1">Abrir na aba de Leads</p>
              </CardContent>
            </Card>
          </Link>
        );
      })}
    </div>
  );
}
