import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Brain, RefreshCw, TrendingUp, AlertTriangle, Users, ShoppingBag,
  Target, Sparkles, DollarSign, UserX, Repeat,
} from "lucide-react";
import { toast } from "sonner";

interface Insights {
  resumo_executivo?: string;
  recuperacao_clientes?: Array<{ cliente: string; motivo: string; acao_sugerida: string; prioridade: string }>;
  oportunidades_recorrencia?: Array<{ cliente: string; padrao_observado: string; acao_sugerida: string }>;
  upsell_cross_sell?: Array<{ segmento: string; oportunidade: string; acao_sugerida: string }>;
  alertas?: Array<{ tipo: string; descricao: string; prioridade: string }>;
  raw_text?: string;
}

interface InsightsResponse {
  kpis: Record<string, number>;
  insights: Insights | null;
  generated_at?: string;
  error?: string;
}

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const priorityColor = (p?: string) =>
  p === "alta" ? "destructive" : p === "media" ? "default" : "secondary";

const AiInsights = () => {
  const [data, setData] = useState<InsightsResponse | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const { data: res, error } = await supabase.functions.invoke<InsightsResponse>(
        "commercial-ai-insights",
        { body: {} },
      );
      if (error) throw error;
      return res as InsightsResponse;
    },
    onSuccess: (res) => {
      setData(res);
      if (res.error) toast.warning(res.error);
      else toast.success("Insights gerados");
    },
    onError: (e: any) => toast.error(e.message || "Falha ao gerar insights"),
  });

  const kpis = data?.kpis;
  const ins = data?.insights;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Brain className="h-6 w-6 text-primary" /> Inteligência Comercial
          </h2>
          <p className="text-sm text-muted-foreground">
            Análise automática de recuperação de clientes, recorrências e oportunidades de upsell.
          </p>
        </div>
        <Button onClick={() => mutation.mutate()} disabled={mutation.isPending}>
          <RefreshCw className={`h-4 w-4 mr-2 ${mutation.isPending ? "animate-spin" : ""}`} />
          {data ? "Regenerar" : "Gerar Insights"}
        </Button>
      </div>

      {!data && !mutation.isPending && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            <Sparkles className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>Clique em "Gerar Insights" para analisar os últimos 180 dias.</p>
          </CardContent>
        </Card>
      )}

      {mutation.isPending && (
        <div className="grid gap-4 md:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-32" />)}
        </div>
      )}

      {kpis && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <KpiCard icon={DollarSign} label="Receita 180d" value={formatCurrency(kpis.total_revenue)} />
          <KpiCard icon={ShoppingBag} label="Vendas" value={String(kpis.sales_180d + kpis.measurements_180d)} />
          <KpiCard icon={Users} label="Clientes Ativos" value={`${kpis.active_clients_180d} / ${kpis.total_clients}`} />
          <KpiCard icon={UserX} label="Risco de Churn" value={String(kpis.churn_risk_clients)} accent="destructive" />
          <KpiCard icon={Repeat} label="Clientes Recorrentes" value={String(kpis.recurring_clients)} />
          <KpiCard icon={Target} label="Oportunidades Abertas" value={String(kpis.open_opportunities)} />
          <KpiCard icon={TrendingUp} label="Leads em Aberto" value={String(kpis.open_site_leads)} />
          <KpiCard icon={Users} label="Clientes Inativos" value={String(kpis.inactive_clients)} />
        </div>
      )}

      {data?.error && (
        <Alert variant="destructive">
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>{data.error}</AlertDescription>
        </Alert>
      )}

      {ins?.resumo_executivo && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5 text-primary" /> Resumo Executivo
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm leading-relaxed">{ins.resumo_executivo}</p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {ins?.recuperacao_clientes && ins.recuperacao_clientes.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <UserX className="h-5 w-5 text-destructive" /> Recuperação de Clientes
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {ins.recuperacao_clientes.map((r, i) => (
                <div key={i} className="border rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{r.cliente}</p>
                    <Badge variant={priorityColor(r.prioridade) as any}>{r.prioridade}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{r.motivo}</p>
                  <p className="text-sm"><span className="font-medium">Ação:</span> {r.acao_sugerida}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {ins?.oportunidades_recorrencia && ins.oportunidades_recorrencia.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Repeat className="h-5 w-5 text-primary" /> Oportunidades de Recorrência
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {ins.oportunidades_recorrencia.map((r, i) => (
                <div key={i} className="border rounded-lg p-3 space-y-1">
                  <p className="font-medium">{r.cliente}</p>
                  <p className="text-sm text-muted-foreground">{r.padrao_observado}</p>
                  <p className="text-sm"><span className="font-medium">Ação:</span> {r.acao_sugerida}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {ins?.upsell_cross_sell && ins.upsell_cross_sell.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-chart-2" /> Upsell & Cross-Sell
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {ins.upsell_cross_sell.map((r, i) => (
                <div key={i} className="border rounded-lg p-3 space-y-1">
                  <p className="font-medium">{r.segmento}</p>
                  <p className="text-sm text-muted-foreground">{r.oportunidade}</p>
                  <p className="text-sm"><span className="font-medium">Ação:</span> {r.acao_sugerida}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}

        {ins?.alertas && ins.alertas.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-destructive" /> Alertas
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {ins.alertas.map((r, i) => (
                <div key={i} className="border rounded-lg p-3 space-y-1">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{r.tipo}</p>
                    <Badge variant={priorityColor(r.prioridade) as any}>{r.prioridade}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{r.descricao}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        )}
      </div>

      {ins?.raw_text && (
        <Card>
          <CardHeader><CardTitle>Análise</CardTitle></CardHeader>
          <CardContent><pre className="whitespace-pre-wrap text-sm">{ins.raw_text}</pre></CardContent>
        </Card>
      )}

      {data?.generated_at && (
        <p className="text-xs text-muted-foreground text-right">
          Gerado em {new Date(data.generated_at).toLocaleString("pt-BR")}
        </p>
      )}
    </div>
  );
};

const KpiCard = ({ icon: Icon, label, value, accent }: {
  icon: any; label: string; value: string; accent?: string;
}) => (
  <Card>
    <CardContent className="pt-6">
      <div className="flex items-center gap-3">
        <Icon className={`h-5 w-5 ${accent === "destructive" ? "text-destructive" : "text-primary"}`} />
        <div>
          <p className="text-sm text-muted-foreground">{label}</p>
          <p className="text-xl font-bold">{value}</p>
        </div>
      </div>
    </CardContent>
  </Card>
);

export default AiInsights;
