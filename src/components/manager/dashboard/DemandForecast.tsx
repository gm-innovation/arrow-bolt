import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";
import { format, subMonths, parseISO, eachMonthOfInterval, isSameMonth, startOfMonth } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Sparkles, TrendingUp, TrendingDown, AlertTriangle, RefreshCw, Lightbulb } from "lucide-react";
import { toast } from "sonner";

interface DashboardFilters {
  startDate?: Date;
  endDate?: Date;
  statuses: string[];
  clientId?: string;
  coordinatorId?: string;
}

interface DemandForecastProps {
  filters: DashboardFilters;
}

interface ForecastData {
  predictions: Array<{
    month: string;
    predicted_orders: number;
    confidence: "alta" | "média" | "baixa";
    predicted_completed: number;
  }>;
  trend_analysis: string;
  growth_rate: number;
  recommendations: string[];
}

export const DemandForecast = ({ filters }: DemandForecastProps) => {
  const [forecast, setForecast] = useState<ForecastData | null>(null);

  // Fetch historical data for the last 12 months
  const { data: historicalData, isLoading: historyLoading } = useQuery({
    queryKey: ["historical-data-forecast", filters],
    queryFn: async () => {
      const endDate = new Date();
      const startDate = subMonths(endDate, 12);
      
      let query = supabase
        .from("service_orders")
        .select("id, status, created_at, completed_date, client_id, created_by")
        .gte("created_at", startDate.toISOString())
        .lte("created_at", endDate.toISOString());

      if (filters.coordinatorId) {
        query = query.eq("created_by", filters.coordinatorId);
      }

      if (filters.clientId) {
        query = query.eq("client_id", filters.clientId);
      }

      const { data: orders, error } = await query;
      if (error) throw error;

      // Group by month
      const months = eachMonthOfInterval({ start: startDate, end: endDate });
      
      const monthlyData = months.map(month => {
        const monthOrders = orders?.filter(o => {
          const orderDate = parseISO(o.created_at);
          return isSameMonth(orderDate, month);
        }) || [];

        return {
          month: format(month, "MMMM yyyy", { locale: ptBR }),
          monthShort: format(month, "MMM", { locale: ptBR }),
          total: monthOrders.length,
          completed: monthOrders.filter(o => o.status === "completed").length,
          pending: monthOrders.filter(o => o.status === "pending").length,
          in_progress: monthOrders.filter(o => o.status === "in_progress").length,
        };
      });

      return monthlyData;
    }
  });

  // Mutation for generating forecast
  const forecastMutation = useMutation({
    mutationFn: async () => {
      const { data: { session } } = await supabase.auth.getSession();
      
      const { data, error } = await supabase.functions.invoke("demand-forecast", {
        body: { 
          historicalData,
          coordinatorId: filters.coordinatorId,
          clientId: filters.clientId
        },
        headers: {
          Authorization: `Bearer ${session?.access_token}`
        }
      });

      if (error) throw error;
      if (data.error) throw new Error(data.error);
      return data as ForecastData;
    },
    onSuccess: (data) => {
      setForecast(data);
      toast.success("Previsão gerada com sucesso!");
    },
    onError: (error: Error) => {
      console.error("Forecast error:", error);
      if (error.message.includes("Rate limit")) {
        toast.error("Limite de requisições excedido. Tente novamente em alguns minutos.");
      } else if (error.message.includes("Payment required")) {
        toast.error("Créditos insuficientes. Adicione créditos ao seu workspace.");
      } else {
        toast.error("Erro ao gerar previsão. Tente novamente.");
      }
    }
  });

  const handleGenerateForecast = () => {
    if (!historicalData || historicalData.length === 0) {
      toast.error("Dados históricos insuficientes para gerar previsão.");
      return;
    }
    forecastMutation.mutate();
  };

  // Prepare chart data combining historical and forecast
  const chartData = [
    ...(historicalData?.slice(-6) || []).map(d => ({
      name: d.monthShort,
      Histórico: d.total,
      "Histórico Concluídas": d.completed,
    })),
    ...(forecast?.predictions || []).map(p => ({
      name: p.month.substring(0, 3),
      Previsão: p.predicted_orders,
      "Previsão Concluídas": p.predicted_completed,
    }))
  ];

  const getConfidenceBadge = (confidence: string) => {
    switch (confidence) {
      case "alta":
        return <Badge className="bg-green-500">Alta</Badge>;
      case "média":
        return <Badge className="bg-yellow-500">Média</Badge>;
      case "baixa":
        return <Badge className="bg-red-500">Baixa</Badge>;
      default:
        return <Badge variant="secondary">{confidence}</Badge>;
    }
  };

  if (historyLoading) {
    return <Skeleton className="h-[500px]" />;
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-primary" />
                Previsão de Demanda com IA
              </CardTitle>
              <CardDescription>
                Análise preditiva baseada em tendências históricas dos últimos 12 meses
              </CardDescription>
            </div>
            <Button 
              onClick={handleGenerateForecast}
              disabled={forecastMutation.isPending}
            >
              {forecastMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Analisando...
                </>
              ) : (
                <>
                  <Sparkles className="h-4 w-4 mr-2" />
                  Gerar Previsão
                </>
              )}
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={300}>
            <AreaChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="name" />
              <YAxis />
              <Tooltip />
              <Legend />
              <Area 
                type="monotone" 
                dataKey="Histórico" 
                stroke="#3b82f6" 
                fill="#3b82f6" 
                fillOpacity={0.3}
              />
              <Area 
                type="monotone" 
                dataKey="Histórico Concluídas" 
                stroke="#22c55e" 
                fill="#22c55e" 
                fillOpacity={0.3}
              />
              {forecast && (
                <>
                  <Area 
                    type="monotone" 
                    dataKey="Previsão" 
                    stroke="#8b5cf6" 
                    fill="#8b5cf6" 
                    fillOpacity={0.3}
                    strokeDasharray="5 5"
                  />
                  <Area 
                    type="monotone" 
                    dataKey="Previsão Concluídas" 
                    stroke="#f59e0b" 
                    fill="#f59e0b" 
                    fillOpacity={0.3}
                    strokeDasharray="5 5"
                  />
                </>
              )}
            </AreaChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {forecast && (
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Predictions Table */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Previsões para os Próximos 3 Meses</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {forecast.predictions.map((pred, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div>
                      <p className="font-semibold capitalize">{pred.month}</p>
                      <p className="text-sm text-muted-foreground">
                        {pred.predicted_completed} concluídas esperadas
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-2xl font-bold">{pred.predicted_orders}</p>
                      <div className="flex items-center gap-2 justify-end">
                        <span className="text-xs text-muted-foreground">Confiança:</span>
                        {getConfidenceBadge(pred.confidence)}
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 p-4 bg-muted rounded-lg">
                <div className="flex items-center gap-2 mb-2">
                  {forecast.growth_rate >= 0 ? (
                    <TrendingUp className="h-5 w-5 text-green-500" />
                  ) : (
                    <TrendingDown className="h-5 w-5 text-red-500" />
                  )}
                  <span className="font-semibold">Taxa de Crescimento Esperada</span>
                </div>
                <p className={`text-2xl font-bold ${forecast.growth_rate >= 0 ? "text-green-600" : "text-red-600"}`}>
                  {forecast.growth_rate >= 0 ? "+" : ""}{forecast.growth_rate.toFixed(1)}%
                </p>
                <p className="text-sm text-muted-foreground">para o próximo trimestre</p>
              </div>
            </CardContent>
          </Card>

          {/* Analysis and Recommendations */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center gap-2">
                <Lightbulb className="h-5 w-5 text-yellow-500" />
                Análise e Recomendações
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {forecast.trend_analysis}
                </AlertDescription>
              </Alert>

              <div>
                <h4 className="font-semibold mb-3">Recomendações</h4>
                <ul className="space-y-2">
                  {forecast.recommendations.map((rec, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm">
                      <span className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-semibold">
                        {index + 1}
                      </span>
                      <span>{rec}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
};
