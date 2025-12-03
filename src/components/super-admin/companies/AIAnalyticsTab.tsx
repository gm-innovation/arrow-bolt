import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { useAIAnalytics } from '@/hooks/useAIAnalytics';
import { 
  MessageSquare, 
  Users, 
  TrendingUp, 
  ThumbsUp, 
  ThumbsDown,
  BarChart3,
  HelpCircle,
  AlertTriangle,
  Bot
} from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts';

interface AIAnalyticsTabProps {
  companyId: string;
}

export function AIAnalyticsTab({ companyId }: AIAnalyticsTabProps) {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const { 
    usageMetrics, 
    satisfactionData, 
    satisfactionRate,
    dailyUsage, 
    topQuestions, 
    negativeFeedback,
    isLoading 
  } = useAIAnalytics(period, companyId);

  const periodLabel = period === '7d' ? '7 dias' : period === '30d' ? '30 dias' : '90 dias';

  return (
    <div className="space-y-4">
      {/* Period Selector */}
      <div className="flex justify-end">
        <Select value={period} onValueChange={(v) => setPeriod(v as '7d' | '30d' | '90d')}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Período" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="7d">Últimos 7 dias</SelectItem>
            <SelectItem value="30d">Últimos 30 dias</SelectItem>
            <SelectItem value="90d">Últimos 90 dias</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Main Metrics Cards */}
      <div className="grid grid-cols-2 gap-3">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Conversas</CardTitle>
            <MessageSquare className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : usageMetrics?.totalConversations || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              nos últimos {periodLabel}
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Mensagens</CardTitle>
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : usageMetrics?.totalMessages || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              interações com o AI
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários</CardTitle>
            <Users className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : usageMetrics?.uniqueUsers || 0}
            </div>
            <p className="text-xs text-muted-foreground">
              usuários únicos
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Satisfação</CardTitle>
            <TrendingUp className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {isLoading ? '...' : satisfactionRate !== null ? `${satisfactionRate}%` : 'N/A'}
            </div>
            <p className="text-xs text-muted-foreground">
              feedbacks positivos
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <Tabs defaultValue="usage" className="space-y-4">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="usage">Uso</TabsTrigger>
          <TabsTrigger value="satisfaction">Satisfação</TabsTrigger>
          <TabsTrigger value="feedback">Feedbacks</TabsTrigger>
        </TabsList>

        {/* Usage Over Time Tab */}
        <TabsContent value="usage">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Uso ao Longo do Tempo</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  Carregando...
                </div>
              ) : dailyUsage && dailyUsage.length > 0 ? (
                <ResponsiveContainer width="100%" height={200}>
                  <LineChart data={dailyUsage}>
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis 
                      dataKey="date" 
                      tickFormatter={(value) => format(new Date(value), 'dd/MM')}
                      className="text-xs"
                    />
                    <YAxis className="text-xs" />
                    <Tooltip 
                      labelFormatter={(value) => format(new Date(value), "dd 'de' MMMM", { locale: ptBR })}
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="conversations" 
                      stroke="hsl(var(--primary))" 
                      strokeWidth={2}
                      name="Conversas"
                      dot={false}
                    />
                    <Line 
                      type="monotone" 
                      dataKey="messages" 
                      stroke="hsl(var(--chart-2))" 
                      strokeWidth={2}
                      name="Mensagens"
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[200px] flex items-center justify-center text-muted-foreground">
                  Sem dados para o período
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Satisfaction Tab */}
        <TabsContent value="satisfaction">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm">Distribuição de Feedbacks</CardTitle>
            </CardHeader>
            <CardContent>
              {satisfactionData && satisfactionData.length > 0 ? (
                <div className="space-y-3">
                  {satisfactionData.map((item) => (
                    <div key={item.rating} className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {item.rating === 'positive' ? (
                          <ThumbsUp className="h-5 w-5 text-green-500" />
                        ) : (
                          <ThumbsDown className="h-5 w-5 text-destructive" />
                        )}
                        <span className="font-medium">
                          {item.rating === 'positive' ? 'Positivo' : 'Negativo'}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-xl font-bold">{item.count}</span>
                        <Badge variant={item.rating === 'positive' ? 'default' : 'destructive'}>
                          {item.percentage}%
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="h-[150px] flex items-center justify-center text-muted-foreground">
                  Nenhum feedback registrado
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Negative Feedback Tab */}
        <TabsContent value="feedback">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm flex items-center gap-2">
                <AlertTriangle className="h-4 w-4 text-amber-500" />
                Feedbacks Negativos
              </CardTitle>
            </CardHeader>
            <CardContent>
              {negativeFeedback && negativeFeedback.length > 0 ? (
                <ScrollArea className="h-[250px]">
                  <div className="space-y-3">
                    {negativeFeedback.map((item) => (
                      <div 
                        key={item.id} 
                        className="p-3 border border-border rounded-lg bg-muted/30 text-sm"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="destructive" className="text-xs">
                            <ThumbsDown className="h-3 w-3 mr-1" />
                            Negativo
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {item.created_at ? format(new Date(item.created_at), "dd/MM/yyyy") : ''}
                          </span>
                        </div>
                        <p className="text-muted-foreground">{item.comment}</p>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="h-[150px] flex flex-col items-center justify-center text-muted-foreground">
                  <ThumbsUp className="h-10 w-10 mb-2 text-green-500" />
                  <p className="text-sm">Nenhum feedback negativo</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
