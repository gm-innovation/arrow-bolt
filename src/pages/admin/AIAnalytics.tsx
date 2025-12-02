import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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

const COLORS = ['hsl(var(--chart-1))', 'hsl(var(--chart-2))', 'hsl(var(--chart-3))', 'hsl(var(--chart-4))', 'hsl(var(--chart-5))'];

export default function AIAnalytics() {
  const [period, setPeriod] = useState<'7d' | '30d' | '90d'>('30d');
  const { 
    usageMetrics, 
    satisfactionData, 
    satisfactionRate,
    dailyUsage, 
    topQuestions, 
    negativeFeedback,
    isLoading 
  } = useAIAnalytics(period);

  const periodLabel = period === '7d' ? '7 dias' : period === '30d' ? '30 dias' : '90 dias';

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground flex items-center gap-2">
            <Bot className="h-6 w-6 text-primary" />
            Analytics do NavalOS AI
          </h1>
          <p className="text-muted-foreground">
            Métricas de uso e satisfação do assistente de IA
          </p>
        </div>
        
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
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Conversas</CardTitle>
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
            <CardTitle className="text-sm font-medium">Mensagens Enviadas</CardTitle>
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
            <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
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
            <CardTitle className="text-sm font-medium">Taxa de Satisfação</CardTitle>
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

      {/* Charts and Details */}
      <Tabs defaultValue="usage" className="space-y-4">
        <TabsList>
          <TabsTrigger value="usage">Uso ao Longo do Tempo</TabsTrigger>
          <TabsTrigger value="satisfaction">Satisfação</TabsTrigger>
          <TabsTrigger value="topics">Tópicos Frequentes</TabsTrigger>
          <TabsTrigger value="feedback">Feedbacks Negativos</TabsTrigger>
        </TabsList>

        {/* Usage Over Time Tab */}
        <TabsContent value="usage" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Uso do AI ao Longo do Tempo</CardTitle>
              <CardDescription>
                Conversas e mensagens por dia nos últimos {periodLabel}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Carregando dados...
                </div>
              ) : dailyUsage && dailyUsage.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
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
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Sem dados para o período selecionado
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Satisfaction Tab */}
        <TabsContent value="satisfaction" className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Card>
              <CardHeader>
                <CardTitle>Distribuição de Feedbacks</CardTitle>
                <CardDescription>
                  Avaliações dos usuários sobre as respostas do AI
                </CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    Carregando dados...
                  </div>
                ) : satisfactionData && satisfactionData.length > 0 ? (
                  <ResponsiveContainer width="100%" height={250}>
                    <PieChart>
                      <Pie
                        data={satisfactionData}
                        cx="50%"
                        cy="50%"
                        innerRadius={60}
                        outerRadius={100}
                        paddingAngle={5}
                        dataKey="count"
                        nameKey="rating"
                        label={({ rating, percentage }) => `${rating === 'positive' ? 'Positivo' : 'Negativo'}: ${percentage}%`}
                      >
                        {satisfactionData.map((entry, index) => (
                          <Cell 
                            key={`cell-${index}`} 
                            fill={entry.rating === 'positive' ? 'hsl(var(--chart-1))' : 'hsl(var(--destructive))'} 
                          />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                ) : (
                  <div className="h-[250px] flex items-center justify-center text-muted-foreground">
                    Sem feedbacks registrados
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Resumo de Satisfação</CardTitle>
                <CardDescription>
                  Detalhamento dos feedbacks recebidos
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {satisfactionData && satisfactionData.length > 0 ? (
                  <>
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
                          <span className="text-2xl font-bold">{item.count}</span>
                          <Badge variant={item.rating === 'positive' ? 'default' : 'destructive'}>
                            {item.percentage}%
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </>
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    Nenhum feedback registrado ainda
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* Topics Tab */}
        <TabsContent value="topics" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <HelpCircle className="h-5 w-5" />
                Tópicos Mais Frequentes
              </CardTitle>
              <CardDescription>
                Palavras-chave mais mencionadas nas perguntas dos usuários
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Carregando dados...
                </div>
              ) : topQuestions && topQuestions.length > 0 ? (
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={topQuestions} layout="vertical">
                    <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                    <XAxis type="number" className="text-xs" />
                    <YAxis 
                      dataKey="question" 
                      type="category" 
                      width={120}
                      className="text-xs"
                      tickFormatter={(value) => value.length > 15 ? value.substring(0, 15) + '...' : value}
                    />
                    <Tooltip 
                      contentStyle={{ 
                        backgroundColor: 'hsl(var(--background))',
                        border: '1px solid hsl(var(--border))',
                        borderRadius: '8px'
                      }}
                    />
                    <Bar 
                      dataKey="count" 
                      fill="hsl(var(--primary))" 
                      name="Ocorrências"
                      radius={[0, 4, 4, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Sem dados suficientes para análise
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* Negative Feedback Tab */}
        <TabsContent value="feedback" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-amber-500" />
                Feedbacks Negativos
              </CardTitle>
              <CardDescription>
                Respostas do AI que receberam avaliação negativa
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="h-[300px] flex items-center justify-center text-muted-foreground">
                  Carregando dados...
                </div>
              ) : negativeFeedback && negativeFeedback.length > 0 ? (
                <ScrollArea className="h-[400px]">
                  <div className="space-y-4">
                    {negativeFeedback.map((item) => (
                      <div 
                        key={item.id} 
                        className="p-4 border border-border rounded-lg bg-muted/30"
                      >
                        <div className="flex items-center justify-between mb-2">
                          <Badge variant="destructive" className="text-xs">
                            <ThumbsDown className="h-3 w-3 mr-1" />
                            Feedback Negativo
                          </Badge>
                          <span className="text-xs text-muted-foreground">
                            {item.created_at ? format(new Date(item.created_at), "dd/MM/yyyy 'às' HH:mm") : ''}
                          </span>
                        </div>
                        
                        {item.message_content && (
                          <div className="mb-2">
                            <p className="text-xs text-muted-foreground mb-1">Resposta do AI:</p>
                            <p className="text-sm bg-background p-2 rounded border">
                              {item.message_content}...
                            </p>
                          </div>
                        )}
                        
                        <div>
                          <p className="text-xs text-muted-foreground mb-1">Comentário do usuário:</p>
                          <p className="text-sm font-medium">{item.comment}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              ) : (
                <div className="h-[300px] flex flex-col items-center justify-center text-muted-foreground">
                  <ThumbsUp className="h-12 w-12 mb-2 text-green-500" />
                  <p>Nenhum feedback negativo registrado</p>
                  <p className="text-sm">Isso é uma boa notícia!</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
