import { useState, useMemo } from "react";
import { useOpportunities } from "@/hooks/useOpportunities";
import { useCommercialStats } from "@/hooks/useCommercialStats";
import { useRecurrences } from "@/hooks/useRecurrences";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, LineChart, Line, AreaChart, Area, Legend,
} from "recharts";
import { TrendingUp, Users, Target, Calendar, Filter, X } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { differenceInDays } from "date-fns";

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))", "hsl(210, 70%, 50%)"];

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

const stageLabels: Record<string, string> = {
  identified: "Identificada", qualified: "Qualificada", proposal: "Proposta",
  negotiation: "Negociação", closed_won: "Ganha", closed_lost: "Perdida",
};

const Reports = () => {
  const { data: stats } = useCommercialStats();
  const { opportunities } = useOpportunities();
  const { recurrences } = useRecurrences();
  const { profile } = useAuth();

  // Filters
  const [clientFilter, setClientFilter] = useState("all");
  const [periodFilter, setPeriodFilter] = useState("all");

  const { data: clients = [] } = useQuery({
    queryKey: ["report-clients", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      const { data } = await supabase.from("clients").select("id, name").eq("company_id", profile.company_id).order("name");
      return data || [];
    },
    enabled: !!profile?.company_id,
  });

  const clearFilters = () => { setClientFilter("all"); setPeriodFilter("all"); };

  const filteredOpps = useMemo(() => {
    let result = opportunities;
    if (clientFilter !== "all") result = result.filter((o: any) => o.client_id === clientFilter);
    if (periodFilter !== "all") {
      const now = new Date();
      const days = periodFilter === "30" ? 30 : periodFilter === "90" ? 90 : 365;
      result = result.filter((o: any) => differenceInDays(now, new Date(o.created_at || now)) <= days);
    }
    return result;
  }, [opportunities, clientFilter, periodFilter]);

  // Chart data
  const funnelData = useMemo(() => {
    const stages = ["identified", "qualified", "proposal", "negotiation", "closed_won", "closed_lost"];
    return stages.map(s => ({
      name: stageLabels[s],
      count: filteredOpps.filter((o: any) => o.stage === s).length,
      value: filteredOpps.filter((o: any) => o.stage === s).reduce((sum: number, o: any) => sum + (Number(o.estimated_value) || 0), 0),
    }));
  }, [filteredOpps]);

  const segmentData = useMemo(() => {
    const map: Record<string, number> = {};
    filteredOpps.forEach((o: any) => {
      const seg = o.clients?.segment || "Sem segmento";
      map[seg] = (map[seg] || 0) + (Number(o.estimated_value) || 0);
    });
    return Object.entries(map).map(([name, value]) => ({ name, value })).sort((a, b) => b.value - a.value).slice(0, 6);
  }, [filteredOpps]);

  const clientDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    filteredOpps.forEach((o: any) => {
      const name = o.client_name || "Sem cliente";
      map[name] = (map[name] || 0) + (Number(o.estimated_value) || 0);
    });
    return Object.entries(map).sort((a, b) => b[1] - a[1]).slice(0, 8).map(([name, value]) => ({ name, value }));
  }, [filteredOpps]);

  const typeDistribution = useMemo(() => {
    const map: Record<string, number> = {};
    filteredOpps.forEach((o: any) => {
      const t = o.opportunity_type || "Não definido";
      map[t] = (map[t] || 0) + 1;
    });
    return Object.entries(map).map(([name, value]) => ({ name, value }));
  }, [filteredOpps]);

  const recurrenceUrgency = useMemo(() => {
    const now = new Date();
    const active = recurrences.filter((r: any) => r.status === "active");
    const overdue = active.filter((r: any) => r.next_date && new Date(r.next_date) < now).length;
    const soon = active.filter((r: any) => {
      if (!r.next_date) return false;
      const d = new Date(r.next_date);
      return d >= now && differenceInDays(d, now) <= 30;
    }).length;
    const normal = active.length - overdue - soon;
    return [
      { name: "Atrasadas", value: overdue },
      { name: "Próximas 30d", value: soon },
      { name: "Normal", value: normal },
    ].filter(d => d.value > 0);
  }, [recurrences]);

  // Conversion rate between stages
  const conversionData = useMemo(() => {
    const stages = ["identified", "qualified", "proposal", "negotiation", "closed_won"];
    return stages.slice(0, -1).map((s, i) => {
      const current = filteredOpps.filter((o: any) => stages.indexOf(o.stage) >= i).length;
      const next = filteredOpps.filter((o: any) => stages.indexOf(o.stage) >= i + 1).length;
      const rate = current > 0 ? Math.round((next / current) * 100) : 0;
      return { name: `${stageLabels[s]} → ${stageLabels[stages[i + 1]]}`, rate };
    });
  }, [filteredOpps]);

  // Forecast
  const openOpps = filteredOpps.filter((o: any) => !["closed_won", "closed_lost"].includes(o.stage));
  const forecastTotal = openOpps.reduce((sum: number, o: any) => sum + ((Number(o.estimated_value) || 0) * (Number(o.probability) || 0) / 100), 0);
  const activeRecurrences = recurrences.filter((r: any) => r.status === "active");
  const recurrenceValue = activeRecurrences.reduce((sum: number, r: any) => sum + (Number(r.estimated_value) || 0), 0);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Relatórios e Business Intelligence</h2>

      {/* Global Filters */}
      <Card>
        <CardContent className="pt-6">
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="h-4 w-4 text-muted-foreground" />
            <Select value={periodFilter} onValueChange={setPeriodFilter}>
              <SelectTrigger className="w-[150px]"><SelectValue placeholder="Período" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todo Período</SelectItem>
                <SelectItem value="30">Últimos 30 dias</SelectItem>
                <SelectItem value="90">Últimos 90 dias</SelectItem>
                <SelectItem value="365">Último Ano</SelectItem>
              </SelectContent>
            </Select>
            <Select value={clientFilter} onValueChange={setClientFilter}>
              <SelectTrigger className="w-[200px]"><SelectValue placeholder="Cliente" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos os Clientes</SelectItem>
                {clients.map((c: any) => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
              </SelectContent>
            </Select>
            {(clientFilter !== "all" || periodFilter !== "all") && (
              <Button variant="ghost" size="sm" onClick={clearFilters}><X className="h-4 w-4 mr-1" />Limpar Filtros</Button>
            )}
          </div>
        </CardContent>
      </Card>

      <Tabs defaultValue="charts" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="charts">Visualização Gráfica</TabsTrigger>
          <TabsTrigger value="executive">Dashboard Executivo</TabsTrigger>
          <TabsTrigger value="forecast">Forecast de Vendas</TabsTrigger>
        </TabsList>

        <TabsContent value="charts" className="space-y-6 mt-6">
          <div className="grid gap-6 lg:grid-cols-2">
            {/* Funnel */}
            <Card>
              <CardHeader><CardTitle className="text-base">Funil de Oportunidades</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <AreaChart data={funnelData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip />
                    <Area type="monotone" dataKey="count" fill="hsl(var(--primary))" stroke="hsl(var(--primary))" fillOpacity={0.3} />
                  </AreaChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Revenue by Segment */}
            <Card>
              <CardHeader><CardTitle className="text-base">Receita por Segmento</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={segmentData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis />
                    <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    <Bar dataKey="value" fill="hsl(var(--chart-2))" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            {/* Client Distribution Pie */}
            <Card>
              <CardHeader><CardTitle className="text-base">Distribuição por Cliente</CardTitle></CardHeader>
              <CardContent>
                {clientDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={clientDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label={({ name }) => name}>
                        {clientDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip formatter={(v: number) => formatCurrency(v)} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-center py-12 text-muted-foreground">Sem dados</p>}
              </CardContent>
            </Card>

            {/* Opportunities by Type */}
            <Card>
              <CardHeader><CardTitle className="text-base">Oportunidades por Tipo</CardTitle></CardHeader>
              <CardContent>
                {typeDistribution.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={typeDistribution} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                        {typeDistribution.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-center py-12 text-muted-foreground">Sem dados</p>}
              </CardContent>
            </Card>

            {/* Recurrence Urgency */}
            <Card>
              <CardHeader><CardTitle className="text-base">Recorrências por Urgência</CardTitle></CardHeader>
              <CardContent>
                {recurrenceUrgency.length > 0 ? (
                  <ResponsiveContainer width="100%" height={280}>
                    <PieChart>
                      <Pie data={recurrenceUrgency} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                        <Cell fill="hsl(var(--destructive))" />
                        <Cell fill="hsl(var(--chart-3))" />
                        <Cell fill="hsl(var(--chart-2))" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : <p className="text-center py-12 text-muted-foreground">Sem dados</p>}
              </CardContent>
            </Card>

            {/* Conversion Rate */}
            <Card>
              <CardHeader><CardTitle className="text-base">Taxa de Conversão entre Estágios</CardTitle></CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={280}>
                  <BarChart data={conversionData} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis type="number" domain={[0, 100]} />
                    <YAxis type="category" dataKey="name" tick={{ fontSize: 10 }} width={160} />
                    <Tooltip formatter={(v: number) => `${v}%`} />
                    <Bar dataKey="rate" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="executive" className="space-y-6 mt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary/80" />
                  <div>
                    <p className="text-sm text-muted-foreground">Pipeline Total</p>
                    <p className="text-2xl font-bold">{formatCurrency(stats?.kpis?.pipelineTotal || 0)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-5 w-5 text-chart-2" />
                  <div>
                    <p className="text-sm text-muted-foreground">Taxa de Conversão</p>
                    <p className="text-2xl font-bold">{(stats?.kpis?.conversionRate || 0).toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Calendar className="h-5 w-5 text-chart-3" />
                  <div>
                    <p className="text-sm text-muted-foreground">Recorrências Ativas</p>
                    <p className="text-2xl font-bold">{activeRecurrences.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Users className="h-5 w-5 text-chart-4" />
                  <div>
                    <p className="text-sm text-muted-foreground">Oportunidades Abertas</p>
                    <p className="text-2xl font-bold">{openOpps.length}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Pipeline por Estágio</CardTitle></CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={funnelData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="count" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecast" className="space-y-6 mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Forecast Ponderado (Pipeline)</p>
                <p className="text-3xl font-bold text-primary">{formatCurrency(forecastTotal)}</p>
                <p className="text-xs text-muted-foreground mt-1">Baseado em probabilidade × valor</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Receita Recorrente Estimada</p>
                <p className="text-3xl font-bold text-chart-2">{formatCurrency(recurrenceValue)}</p>
                <p className="text-xs text-muted-foreground mt-1">{activeRecurrences.length} recorrências ativas</p>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader><CardTitle>Oportunidades por Probabilidade</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-2">
                {openOpps
                  .sort((a: any, b: any) => (b.probability || 0) - (a.probability || 0))
                  .slice(0, 10)
                  .map((o: any) => (
                    <div key={o.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div>
                        <span className="font-medium">{o.title}</span>
                        <p className="text-xs text-muted-foreground">{o.client_name}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline">{o.probability || 0}%</Badge>
                        <p className="text-xs text-muted-foreground mt-1">{formatCurrency(Number(o.estimated_value) || 0)}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default Reports;
