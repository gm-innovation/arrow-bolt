import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Progress } from "@/components/ui/progress";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  LineChart,
  Line,
  PieChart,
  Pie,
  Cell,
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Target,
  Clock,
  FileText,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { useCoordinatorProductivity } from "@/hooks/useCoordinatorProductivity";

interface CoordinatorProductivityReportProps {
  dateRange?: { start: Date; end: Date };
  coordinatorId?: string;
}

const COLORS = ["hsl(var(--primary))", "hsl(var(--secondary))", "#22c55e", "#f59e0b", "#ef4444"];

export const CoordinatorProductivityReport = ({
  dateRange,
  coordinatorId,
}: CoordinatorProductivityReportProps) => {
  const { data: productivityData = [], isLoading } = useCoordinatorProductivity(dateRange);
  const [expandedCoordinator, setExpandedCoordinator] = useState<string | null>(null);

  // Filtrar por coordenador específico se fornecido
  const productivity = coordinatorId 
    ? productivityData.filter(p => p.coordinator_id === coordinatorId)
    : productivityData;

  const getInitials = (name: string) => {
    return name
      .split(" ")
      .map((n) => n[0])
      .join("")
      .toUpperCase()
      .slice(0, 2);
  };

  const getTrendIcon = (trend: "up" | "down" | "stable") => {
    switch (trend) {
      case "up":
        return <TrendingUp className="h-4 w-4 text-green-500" />;
      case "down":
        return <TrendingDown className="h-4 w-4 text-red-500" />;
      default:
        return <Minus className="h-4 w-4 text-muted-foreground" />;
    }
  };

  const getPerformanceBadge = (rate: number) => {
    if (rate >= 90) return <Badge className="bg-green-500">Excelente</Badge>;
    if (rate >= 70) return <Badge className="bg-blue-500">Bom</Badge>;
    if (rate >= 50) return <Badge className="bg-yellow-500">Regular</Badge>;
    return <Badge variant="destructive">Baixo</Badge>;
  };

  const formatMonth = (month: string) => {
    const date = new Date(month + "-01");
    return date.toLocaleDateString("pt-BR", { month: "short", year: "2-digit" });
  };

  // Summary stats
  const totalCoordinators = productivity.length;
  const totalOrders = productivity.reduce((sum, c) => sum + c.total_orders, 0);
  const totalCompleted = productivity.reduce((sum, c) => sum + c.completed_orders, 0);
  const avgCompletionRate = totalCoordinators > 0
    ? productivity.reduce((sum, c) => sum + c.completion_rate, 0) / totalCoordinators
    : 0;

  // Chart data
  const barChartData = productivity.slice(0, 10).map((coord) => ({
    name: coord.coordinator_name.split(" ")[0],
    total: coord.total_orders,
    completed: coord.completed_orders,
    rate: Math.round(coord.completion_rate),
  }));

  const pieChartData = [
    { name: "Concluídas", value: totalCompleted },
    { name: "Em Andamento", value: productivity.reduce((sum, c) => sum + c.in_progress_orders, 0) },
    { name: "Pendentes", value: productivity.reduce((sum, c) => sum + c.pending_orders, 0) },
  ];

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Carregando dados de produtividade dos coordenadores...
        </CardContent>
      </Card>
    );
  }

  if (productivity.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Produtividade dos Coordenadores
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground py-10">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>Nenhum dado de produtividade disponível</p>
          <p className="text-sm mt-2">
            Os dados serão populados conforme os coordenadores gerenciam ordens de serviço
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Coordenadores</p>
                <p className="text-2xl font-bold">{totalCoordinators}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-500/10">
                <FileText className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total de OS</p>
                <p className="text-2xl font-bold">{totalOrders}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/10">
                <CheckCircle2 className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Concluídas</p>
                <p className="text-2xl font-bold">{totalCompleted}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-yellow-500/10">
                <Target className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Taxa Média</p>
                <p className="text-2xl font-bold">{avgCompletionRate.toFixed(1)}%</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts Row */}
      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>OS por Coordenador</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={barChartData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="total" fill="hsl(var(--muted-foreground))" name="Total" />
                  <Bar dataKey="completed" fill="hsl(var(--primary))" name="Concluídas" />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Distribuição de Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={pieChartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={100}
                    paddingAngle={5}
                    dataKey="value"
                    label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  >
                    {pieChartData.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip />
                </PieChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Ranking de Produtividade dos Coordenadores</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Coordenador</TableHead>
                <TableHead className="text-center">Total OS</TableHead>
                <TableHead className="text-center">Concluídas</TableHead>
                <TableHead className="text-center">Em Andamento</TableHead>
                <TableHead className="text-center">Taxa</TableHead>
                <TableHead className="text-center">Tempo Médio</TableHead>
                <TableHead className="text-center">Tendência</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productivity.map((coord, index) => (
                <>
                  <TableRow key={coord.coordinator_id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {getInitials(coord.coordinator_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{coord.coordinator_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center font-medium">
                      {coord.total_orders}
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <CheckCircle2 className="h-4 w-4 text-green-500" />
                        {coord.completed_orders}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <AlertCircle className="h-4 w-4 text-yellow-500" />
                        {coord.in_progress_orders}
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={coord.completion_rate}
                          className="h-2 w-16"
                        />
                        <span className="text-sm">
                          {coord.completion_rate.toFixed(0)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Clock className="h-4 w-4 text-muted-foreground" />
                        {coord.avg_completion_time.toFixed(1)}d
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {getTrendIcon(coord.trend)}
                    </TableCell>
                    <TableCell className="text-center">
                      {getPerformanceBadge(coord.completion_rate)}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          setExpandedCoordinator(
                            expandedCoordinator === coord.coordinator_id
                              ? null
                              : coord.coordinator_id
                          )
                        }
                      >
                        {expandedCoordinator === coord.coordinator_id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                  {expandedCoordinator === coord.coordinator_id && (
                    <TableRow>
                      <TableCell colSpan={10} className="bg-muted/50">
                        <div className="p-4">
                          <h4 className="font-medium mb-4">
                            Evolução Mensal - {coord.coordinator_name}
                          </h4>
                          {coord.monthly_data.length > 0 ? (
                            <div className="h-[200px]">
                              <ResponsiveContainer width="100%" height="100%">
                                <LineChart data={coord.monthly_data}>
                                  <CartesianGrid strokeDasharray="3 3" />
                                  <XAxis 
                                    dataKey="month" 
                                    tickFormatter={formatMonth}
                                  />
                                  <YAxis />
                                  <Tooltip 
                                    labelFormatter={formatMonth}
                                  />
                                  <Line
                                    type="monotone"
                                    dataKey="created"
                                    stroke="hsl(var(--muted-foreground))"
                                    name="Criadas"
                                  />
                                  <Line
                                    type="monotone"
                                    dataKey="completed"
                                    stroke="hsl(var(--primary))"
                                    name="Concluídas"
                                  />
                                </LineChart>
                              </ResponsiveContainer>
                            </div>
                          ) : (
                            <p className="text-muted-foreground text-center py-8">
                              Sem dados históricos suficientes
                            </p>
                          )}
                        </div>
                      </TableCell>
                    </TableRow>
                  )}
                </>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};
