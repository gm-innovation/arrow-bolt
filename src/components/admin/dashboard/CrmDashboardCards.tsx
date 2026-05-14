import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Inbox, UserPlus, TrendingUp, ArrowRight, Sparkles } from "lucide-react";
import { format, subDays } from "date-fns";
import { ptBR } from "date-fns/locale";

interface LeadRow { id: string; name: string; company_name: string | null; created_at: string; status: string; segment: string; }
interface OppRow { id: string; title: string; estimated_value: number | null; clients?: { name: string } | null; }

export function CrmDashboardCards() {
  const { profile } = useAuth();
  const [stats, setStats] = useState({ leadsNew: 0, leadsUnassigned: 0, oppsOpen: 0, oppsValue: 0, convertedThisMonth: 0 });
  const [recentLeads, setRecentLeads] = useState<LeadRow[]>([]);
  const [openOpps, setOpenOpps] = useState<OppRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!profile?.company_id) return;
    (async () => {
      setLoading(true);
      const sevenDaysAgo = subDays(new Date(), 7).toISOString();
      const startOfMonth = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString();

      const [newLeads, unassigned, opps, converted, recent, oppsList] = await Promise.all([
        supabase.from("public_site_leads").select("id", { count: "exact", head: true })
          .in("segment", ["service", "unknown"]).gte("created_at", sevenDaysAgo),
        supabase.from("public_site_leads").select("id", { count: "exact", head: true })
          .in("segment", ["service", "unknown"]).is("assigned_to", null).neq("status", "converted").neq("status", "discarded"),
        supabase.from("crm_opportunities").select("id, estimated_value")
          .eq("segment", "service").not("stage", "in", "(closed_won,closed_lost)"),
        supabase.from("public_site_leads").select("id", { count: "exact", head: true })
          .in("segment", ["service", "unknown"]).eq("status", "converted").gte("converted_at", startOfMonth),
        supabase.from("public_site_leads").select("id, name, company_name, created_at, status, segment")
          .in("segment", ["service", "unknown"]).order("created_at", { ascending: false }).limit(5),
        supabase.from("crm_opportunities").select("id, title, estimated_value, clients ( name )")
          .eq("segment", "service").not("stage", "in", "(closed_won,closed_lost)")
          .order("expected_close_date", { ascending: true, nullsFirst: false }).limit(5),
      ]);

      const oppsArr = (opps.data ?? []) as { id: string; estimated_value: number | null }[];
      setStats({
        leadsNew: newLeads.count ?? 0,
        leadsUnassigned: unassigned.count ?? 0,
        oppsOpen: oppsArr.length,
        oppsValue: oppsArr.reduce((s, o) => s + Number(o.estimated_value || 0), 0),
        convertedThisMonth: converted.count ?? 0,
      });
      setRecentLeads((recent.data ?? []) as LeadRow[]);
      setOpenOpps((oppsList.data ?? []) as unknown as OppRow[]);
      setLoading(false);
    })();
  }, [profile?.company_id]);

  const kpis = [
    { label: "Leads novos (7d)", value: stats.leadsNew, icon: Inbox, color: "text-blue-600 bg-blue-50" },
    { label: "Sem responsável", value: stats.leadsUnassigned, icon: UserPlus, color: "text-amber-600 bg-amber-50" },
    { label: "Oportunidades abertas", value: stats.oppsOpen, icon: TrendingUp, color: "text-emerald-600 bg-emerald-50" },
    { label: "Convertidos no mês", value: stats.convertedThisMonth, icon: Sparkles, color: "text-purple-600 bg-purple-50" },
  ];

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {kpis.map((k) => (
          <Card key={k.label}>
            <CardContent className="p-4 flex items-center gap-3">
              <div className={`p-2.5 rounded-lg ${k.color}`}><k.icon className="h-4 w-4" /></div>
              <div>
                <div className="text-2xl font-bold leading-none">{loading ? "—" : k.value}</div>
                <div className="text-xs text-muted-foreground mt-1">{k.label}</div>
              </div>
            </CardContent>
          </Card>
        ))}
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
