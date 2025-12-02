import { useQuery, useMutation } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, Line, ComposedChart } from "recharts";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Target, TrendingUp, Award, RefreshCw, CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";

interface DashboardFilters {
  startDate?: Date;
  endDate?: Date;
  statuses: string[];
  clientId?: string;
  coordinatorId?: string;
}

interface ForecastAccuracyProps {
  filters: DashboardFilters;
}

export const ForecastAccuracy = ({ filters }: ForecastAccuracyProps) => {
  // Fetch historical forecasts with actual data
  const { data: accuracyData, isLoading, refetch } = useQuery({
    queryKey: ["forecast-accuracy", filters],
    queryFn: async () => {
      let query = supabase
        .from("forecast_history")
        .select("*")
        .not("actual_orders", "is", null)
        .order("forecast_month", { ascending: true });

      if (filters.coordinatorId) {
        query = query.eq("coordinator_id", filters.coordinatorId);
      }

      if (filters.clientId) {
        query = query.eq("client_id", filters.clientId);
      }

      const { data, error } = await query;
      if (error) throw error;

      if (!data || data.length === 0) {
        return null;
      }

      // Calculate accuracy metrics
      const forecasts = data.map(f => {
        const orderError = Math.abs(f.predicted_orders - (f.actual_orders || 0));
        const orderErrorPercent = f.actual_orders ? (orderError / f.actual_orders) * 100 : 0;
        
        const completedError = Math.abs(f.predicted_completed - (f.actual_completed || 0));
        const completedErrorPercent = f.actual_completed ? (completedError / f.actual_completed) * 100 : 0;

        return {
          ...f,
          orderError,
          orderErrorPercent,
          completedError,
          completedErrorPercent,
          orderAccuracy: Math.max(0, 100 - orderErrorPercent),
          completedAccuracy: Math.max(0, 100 - completedErrorPercent),
        };
      });

      // Calculate overall metrics
      const avgOrderAccuracy = forecasts.reduce((sum, f) => sum + f.orderAccuracy, 0) / forecasts.length;
      const avgCompletedAccuracy = forecasts.reduce((sum, f) => sum + f.completedAccuracy, 0) / forecasts.length;
      const overallAccuracy = (avgOrderAccuracy + avgCompletedAccuracy) / 2;

      // Calculate MAPE (Mean Absolute Percentage Error)
      const mapeOrders = forecasts.reduce((sum, f) => sum + f.orderErrorPercent, 0) / forecasts.length;
      const mapeCompleted = forecasts.reduce((sum, f) => sum + f.completedErrorPercent, 0) / forecasts.length;

      // Count accurate predictions (within 15% error)
      const accuratePredictions = forecasts.filter(f => 
        f.orderErrorPercent <= 15 && f.completedErrorPercent <= 15
      ).length;
      const accuracyRate = (accuratePredictions / forecasts.length) * 100;

      return {
        forecasts: forecasts.slice(-6), // Last 6 forecasts
        avgOrderAccuracy,
        avgCompletedAccuracy,
        overallAccuracy,
        mapeOrders,
        mapeCompleted,
        accuracyRate,
        totalForecasts: forecasts.length,
        accuratePredictions,
      };
    }
  });

  // Mutation to update actual values
  const updateActualsMutation = useMutation({
    mutationFn: async () => {
      const { error } = await supabase.rpc("update_forecast_actuals");
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Valores reais atualizados com sucesso!");
      refetch();
    },
    onError: (error: Error) => {
      console.error("Update actuals error:", error);
      toast.error("Erro ao atualizar valores reais.");
    }
  });

  const getAccuracyColor = (accuracy: number) => {
    if (accuracy >= 85) return "text-green-600";
    if (accuracy >= 70) return "text-yellow-600";
    return "text-red-600";
  };

  const getAccuracyBadge = (accuracy: number) => {
    if (accuracy >= 85) return <Badge className="bg-green-500">Excelente</Badge>;
    if (accuracy >= 70) return <Badge className="bg-yellow-500">Bom</Badge>;
    return <Badge className="bg-red-500">Precisa Melhorar</Badge>;
  };

  if (isLoading) {
    return <Skeleton className="h-[500px]" />;
  }

  if (!accuracyData) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Target className="h-5 w-5" />
            Precisão das Previsões
          </CardTitle>
          <CardDescription>
            Ainda não há previsões com resultados reais para comparar
          </CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Gere previsões e aguarde o mês passar para ver a precisão das previsões.
          </p>
        </CardContent>
      </Card>
    );
  }

  const chartData = accuracyData.forecasts.map(f => ({
    month: format(parseISO(f.forecast_month), "MMM", { locale: ptBR }),
    Previsto: f.predicted_orders,
    Real: f.actual_orders,
    "Precisão (%)": Math.round(f.orderAccuracy),
  }));

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium flex items-center gap-2">
              <Award className="h-4 w-4" />
              Precisão Geral
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-3xl font-bold ${getAccuracyColor(accuracyData.overallAccuracy)}`}>
              {accuracyData.overallAccuracy.toFixed(1)}%
            </div>
            <div className="mt-2">
              {getAccuracyBadge(accuracyData.overallAccuracy)}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">MAPE Ordens</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {accuracyData.mapeOrders.toFixed(1)}%
            </div>
            <Progress value={Math.max(0, 100 - accuracyData.mapeOrders)} className="mt-2" />
            <p className="text-xs text-muted-foreground mt-1">Erro médio percentual</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Taxa de Acerto</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              {accuracyData.accuracyRate.toFixed(1)}%
            </div>
            <p className="text-xs text-muted-foreground">
              {accuracyData.accuratePredictions} de {accuracyData.totalForecasts} previsões
            </p>
            <p className="text-xs text-muted-foreground">
              (erro {'<'} 15%)
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Atualizar</CardTitle>
          </CardHeader>
          <CardContent>
            <Button 
              onClick={() => updateActualsMutation.mutate()}
              disabled={updateActualsMutation.isPending}
              className="w-full"
              variant="outline"
            >
              {updateActualsMutation.isPending ? (
                <>
                  <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                  Atualizando...
                </>
              ) : (
                <>
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Valores Reais
                </>
              )}
            </Button>
            <p className="text-xs text-muted-foreground mt-2">
              Última atualização: agora
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Comparison Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Previsões vs Resultados Reais</CardTitle>
          <CardDescription>
            Comparação dos últimos {accuracyData.forecasts.length} meses com previsões
          </CardDescription>
        </CardHeader>
        <CardContent>
          <ResponsiveContainer width="100%" height={350}>
            <ComposedChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="month" />
              <YAxis yAxisId="left" />
              <YAxis yAxisId="right" orientation="right" />
              <Tooltip />
              <Legend />
              <Bar yAxisId="left" dataKey="Previsto" fill="#8b5cf6" />
              <Bar yAxisId="left" dataKey="Real" fill="#3b82f6" />
              <Line 
                yAxisId="right" 
                type="monotone" 
                dataKey="Precisão (%)" 
                stroke="#22c55e" 
                strokeWidth={2}
                dot={{ fill: "#22c55e" }}
              />
            </ComposedChart>
          </ResponsiveContainer>
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Histórico Detalhado</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {accuracyData.forecasts.map((forecast, index) => (
              <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                <div className="space-y-1">
                  <p className="font-semibold">
                    {format(parseISO(forecast.forecast_month), "MMMM yyyy", { locale: ptBR })}
                  </p>
                  <div className="flex items-center gap-4 text-sm">
                    <span className="text-muted-foreground">
                      Previsto: <span className="font-semibold">{forecast.predicted_orders}</span>
                    </span>
                    <span className="text-muted-foreground">
                      Real: <span className="font-semibold">{forecast.actual_orders}</span>
                    </span>
                    <span className="text-muted-foreground">
                      Erro: <span className="font-semibold">{forecast.orderError}</span>
                    </span>
                  </div>
                </div>
                <div className="text-right">
                  <div className={`text-2xl font-bold ${getAccuracyColor(forecast.orderAccuracy)}`}>
                    {forecast.orderAccuracy.toFixed(1)}%
                  </div>
                  <div className="flex items-center gap-1 justify-end mt-1">
                    {forecast.orderAccuracy >= 85 ? (
                      <CheckCircle className="h-4 w-4 text-green-500" />
                    ) : (
                      <XCircle className="h-4 w-4 text-yellow-500" />
                    )}
                    <Badge variant="outline" className="text-xs">
                      {forecast.confidence}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};
