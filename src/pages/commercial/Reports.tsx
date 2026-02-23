import { useState } from "react";
import { useOpportunities } from "@/hooks/useOpportunities";
import { useCommercialStats } from "@/hooks/useCommercialStats";
import { useRecurrences } from "@/hooks/useRecurrences";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line } from "recharts";
import { TrendingUp, Users, Target, Calendar } from "lucide-react";

const COLORS = ["hsl(var(--primary))", "hsl(var(--chart-2))", "hsl(var(--chart-3))", "hsl(var(--chart-4))", "hsl(var(--chart-5))"];

const Reports = () => {
  const { data: stats } = useCommercialStats();
  const { opportunities } = useOpportunities();
  const { recurrences } = useRecurrences();

  // Executive Dashboard data
  const stageData = (stats?.stageStats || []).map((s: any) => ({
    name: s.stage === "identified" ? "Identificada" : s.stage === "qualified" ? "Qualificada" :
      s.stage === "proposal" ? "Proposta" : s.stage === "negotiation" ? "Negociação" :
      s.stage === "closed_won" ? "Ganha" : "Perdida",
    count: s.count,
    value: s.total_value || 0,
  }));

  // Client distribution
  const clientMap: Record<string, number> = {};
  opportunities.forEach((o: any) => {
    const name = o.clients?.name || "Sem cliente";
    clientMap[name] = (clientMap[name] || 0) + (Number(o.estimated_value) || 0);
  });
  const clientData = Object.entries(clientMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8)
    .map(([name, value]) => ({ name, value }));

  // Forecast data
  const openOpps = opportunities.filter((o: any) => !["closed_won", "closed_lost"].includes(o.stage));
  const forecastTotal = openOpps.reduce((sum: number, o: any) => sum + ((Number(o.estimated_value) || 0) * (Number(o.probability) || 0) / 100), 0);

  // Recurrence summary
  const activeRecurrences = recurrences.filter((r: any) => r.status === "active");
  const recurrenceValue = activeRecurrences.reduce((sum: number, r: any) => sum + (Number(r.estimated_value) || 0), 0);

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold text-foreground">Relatórios e Business Intelligence</h2>

      <Tabs defaultValue="executive" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="executive">Dashboard Executivo</TabsTrigger>
          <TabsTrigger value="clients">Dossiê de Clientes</TabsTrigger>
          <TabsTrigger value="forecast">Forecast de Vendas</TabsTrigger>
        </TabsList>

        <TabsContent value="executive" className="space-y-6 mt-6">
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-2">
                  <Target className="h-5 w-5 text-primary/80" />
                  <div>
                    <p className="text-sm text-muted-foreground">Pipeline Total</p>
                    <p className="text-2xl font-bold">R$ {(stats?.kpis?.pipelineTotal || 0).toLocaleString("pt-BR")}</p>
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
                    <p className="text-2xl font-bold">{stats?.kpis?.conversionRate || 0}%</p>
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
                <BarChart data={stageData}>
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

        <TabsContent value="clients" className="space-y-6 mt-6">
          <Card>
            <CardHeader><CardTitle>Distribuição de Valor por Cliente</CardTitle></CardHeader>
            <CardContent>
              {clientData.length > 0 ? (
                <ResponsiveContainer width="100%" height={350}>
                  <PieChart>
                    <Pie data={clientData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={120} label={({ name, value }) => `${name}: R$ ${Number(value).toLocaleString("pt-BR")}`}>
                      {clientData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                    </Pie>
                    <Tooltip formatter={(value: number) => `R$ ${value.toLocaleString("pt-BR")}`} />
                  </PieChart>
                </ResponsiveContainer>
              ) : (
                <p className="text-center py-12 text-muted-foreground">Sem dados de clientes</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader><CardTitle>Top Clientes por Valor</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-3">
                {clientData.map((c, i) => (
                  <div key={i} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                    <span className="font-medium">{c.name}</span>
                    <Badge variant="secondary">R$ {c.value.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="forecast" className="space-y-6 mt-6">
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Forecast Ponderado (Pipeline)</p>
                <p className="text-3xl font-bold text-primary">R$ {forecastTotal.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
                <p className="text-xs text-muted-foreground mt-1">Baseado em probabilidade × valor</p>
              </CardContent>
            </Card>
            <Card>
              <CardContent className="pt-6">
                <p className="text-sm text-muted-foreground">Receita Recorrente Estimada</p>
                <p className="text-3xl font-bold text-green-600">R$ {recurrenceValue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}</p>
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
                        <p className="text-xs text-muted-foreground">{o.clients?.name}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="outline">{o.probability || 0}%</Badge>
                        <p className="text-xs text-muted-foreground mt-1">
                          R$ {(Number(o.estimated_value) || 0).toLocaleString("pt-BR")}
                        </p>
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
