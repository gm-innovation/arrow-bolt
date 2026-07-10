import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { ArrowRight, Sparkles, PhoneCall, CheckCircle2, XCircle } from "lucide-react";
import { format, differenceInDays, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LeadRow { id: string; name: string; company_name: string | null; created_at: string; status: string; segment: string; converted_at?: string | null; }
interface OppRow { id: string; title: string; estimated_value: number | null; clients?: { name: string } | null; }

export function CrmDashboardCards() {
  const { profile } = useAuth();
  const [kpiStats, setKpiStats] = useState({ novos: 0, revisados: 0, convertidos30: 0, descartados30: 0 });
  const [oppsValue, setOppsValue] = useState(0);
  const [recentLeads, setRecentLeads] = useState<LeadRow[]>([]);
  const [openOpps, setOpenOpps] = useState<OppRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.company_id) return;
    (async () => {
      setLoading(true);

      const [allLeads, opps, recent, oppsList] = await Promise.all([
        supabase.from("public_site_leads").select("id, status, created_at, converted_at")
          .in("segment", ["service", "unknown"]).limit(1000),
        supabase.from("crm_opportunities").select("id, estimated_value")
          .eq("segment", "service").not("stage", "in", "(closed_won,closed_lost)"),
        supabase.from("public_site_leads").select("id, name, company_name, created_at, status, segment")
          .in("segment", ["service", "unknown"]).order("created_at", { ascending: false }).limit(5),
        supabase.from("crm_opportunities").select("id, title, estimated_value, clients ( name )")
          .eq("segment", "service").not("stage", "in", "(closed_won,closed_lost)")
          .order("expected_close_date", { ascending: true, nullsFirst: false }).limit(5),
      ]);

      const now = new Date();
      let novos = 0, revisados = 0, convertidos30 = 0, descartados30 = 0;
      for (const l of (allLeads.data ?? []) as any[]) {
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

      const oppsArr = (opps.data ?? []) as { id: string; estimated_value: number | null }[];
      setOppsValue(oppsArr.reduce((s, o) => s + Number(o.estimated_value || 0), 0));
      setRecentLeads((recent.data ?? []) as LeadRow[]);
      setOpenOpps((oppsList.data ?? []) as unknown as OppRow[]);
      setLoading(false);
    })();
  }, [profile?.company_id]);

  const baseHref = "/admin/leads";
  const kpis = [
    { label: "Leads novos", value: kpiStats.novos, icon: Sparkles, tone: "text-primary", href: `${baseHref}?status=new` },
    { label: "Em contato", value: kpiStats.revisados, icon: PhoneCall, tone: "text-blue-600 dark:text-blue-400", href: `${baseHref}?status=reviewed` },
    { label: "Convertidos (30d)", value: kpiStats.convertidos30, icon: CheckCircle2, tone: "text-green-600 dark:text-green-400", href: `${baseHref}?status=converted` },
    { label: "Descartados (30d)", value: kpiStats.descartados30, icon: XCircle, tone: "text-muted-foreground", href: `${baseHref}?status=discarded` },
  ];

  return (
    <div className="space-y-4">
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
                  <p className="text-xs text-muted-foreground mt-1">Ver na aba de Leads</p>
                </CardContent>
              </Card>
            </Link>
          );
        })}
      </div>


      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-base">Últimos leads</CardTitle>
            <Button asChild size="sm" variant="ghost"><Link to="/admin/leads">Ver todos <ArrowRight className="w-3 h-3 ml-1" /></Link></Button>
          </CardHeader>
          <CardContent className="pt-0">
            {recentLeads.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">Nenhum lead recente.</div>
            ) : (
              <div className="space-y-2">
                {recentLeads.map((l) => (
                  <Link to="/admin/leads" key={l.id} className="flex items-center justify-between gap-2 p-2 rounded hover:bg-muted/50">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{l.name}</div>
                      <div className="text-xs text-muted-foreground truncate">
                        {l.company_name ?? "—"} · {format(new Date(l.created_at), "dd/MM HH:mm", { locale: ptBR })}
                      </div>
                    </div>
                    <Badge variant={l.status === "new" ? "default" : "outline"} className="text-xs shrink-0">{l.status}</Badge>
                  </Link>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2 flex-row items-center justify-between">
            <CardTitle className="text-base">Oportunidades em aberto</CardTitle>
            <Button asChild size="sm" variant="ghost"><Link to="/admin/opportunities">Ver pipeline <ArrowRight className="w-3 h-3 ml-1" /></Link></Button>
          </CardHeader>
          <CardContent className="pt-0">
            {openOpps.length === 0 ? (
              <div className="text-sm text-muted-foreground py-6 text-center">
                Nenhuma oportunidade em aberto.{" "}
                <Link to="/admin/leads" className="text-primary underline">Converter leads</Link>
              </div>
            ) : (
              <div className="space-y-2">
                {openOpps.map((o) => (
                  <Link to="/admin/opportunities" key={o.id} className="flex items-center justify-between gap-2 p-2 rounded hover:bg-muted/50">
                    <div className="min-w-0">
                      <div className="text-sm font-medium truncate">{o.title}</div>
                      <div className="text-xs text-muted-foreground truncate">{o.clients?.name ?? "—"}</div>
                    </div>
                    {o.estimated_value != null && (
                      <div className="text-xs font-mono shrink-0">
                        R$ {Number(o.estimated_value).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                      </div>
                    )}
                  </Link>
                ))}
                {stats.oppsValue > 0 && (
                  <div className="text-xs text-muted-foreground pt-2 border-t mt-2 text-right">
                    Total estimado: <strong className="text-foreground font-mono">
                      R$ {stats.oppsValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
                    </strong>
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
