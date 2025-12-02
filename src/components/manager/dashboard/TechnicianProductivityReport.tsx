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
} from "recharts";
import {
  TrendingUp,
  TrendingDown,
  Minus,
  Users,
  Target,
  Clock,
  Star,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { useTechnicianProductivity } from "@/hooks/useProductivitySnapshots";
import { cn } from "@/lib/utils";

interface TechnicianProductivityReportProps {
  dateRange?: { start: Date; end: Date };
}

export const TechnicianProductivityReport = ({
  dateRange,
}: TechnicianProductivityReportProps) => {
  const { productivity, isLoading, totalTechnicians, averageCompletionRate } =
    useTechnicianProductivity(dateRange);
  const [expandedTechnician, setExpandedTechnician] = useState<string | null>(null);

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

  // Chart data
  const chartData = productivity.slice(0, 10).map((tech) => ({
    name: tech.technician_name.split(" ")[0],
    completed: tech.total_tasks_completed,
    rate: Math.round(tech.completion_rate),
  }));

  if (isLoading) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-muted-foreground">
          Carregando dados de produtividade...
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
            Produtividade da Equipe
          </CardTitle>
        </CardHeader>
        <CardContent className="text-center text-muted-foreground py-10">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-30" />
          <p>Nenhum dado de produtividade disponível</p>
          <p className="text-sm mt-2">
            Os dados serão populados conforme os técnicos completam tarefas
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
                <p className="text-sm text-muted-foreground">Total Técnicos</p>
                <p className="text-2xl font-bold">{totalTechnicians}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-green-500/10">
                <Target className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Taxa Média</p>
                <p className="text-2xl font-bold">
                  {averageCompletionRate.toFixed(1)}%
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-blue-500/10">
                <Clock className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Total Horas</p>
                <p className="text-2xl font-bold">
                  {productivity
                    .reduce((sum, t) => sum + t.total_hours_worked, 0)
                    .toFixed(0)}
                  h
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-yellow-500/10">
                <Star className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Satisfação</p>
                <p className="text-2xl font-bold">
                  {(
                    productivity.reduce((sum, t) => sum + t.avg_satisfaction, 0) /
                    productivity.length
                  ).toFixed(1)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Comparativo de Tarefas Concluídas</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="completed" fill="hsl(var(--primary))" name="Tarefas" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Table */}
      <Card>
        <CardHeader>
          <CardTitle>Ranking de Produtividade</CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-12">#</TableHead>
                <TableHead>Técnico</TableHead>
                <TableHead className="text-center">Concluídas</TableHead>
                <TableHead className="text-center">Taxa</TableHead>
                <TableHead className="text-center">Horas</TableHead>
                <TableHead className="text-center">Satisfação</TableHead>
                <TableHead className="text-center">Tendência</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {productivity.map((tech, index) => (
                <>
                  <TableRow key={tech.technician_id}>
                    <TableCell className="font-medium">{index + 1}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-3">
                        <Avatar className="h-8 w-8">
                          <AvatarFallback className="bg-primary/10 text-primary text-xs">
                            {getInitials(tech.technician_name)}
                          </AvatarFallback>
                        </Avatar>
                        <span className="font-medium">{tech.technician_name}</span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      <span className="font-medium">
                        {tech.total_tasks_completed}
                      </span>
                      <span className="text-muted-foreground text-sm">
                        /{tech.total_tasks_assigned}
                      </span>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <Progress
                          value={tech.completion_rate}
                          className="h-2 w-16"
                        />
                        <span className="text-sm">
                          {tech.completion_rate.toFixed(0)}%
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {tech.total_hours_worked.toFixed(1)}h
                    </TableCell>
                    <TableCell className="text-center">
                      <div className="flex items-center justify-center gap-1">
                        <Star className="h-3 w-3 text-yellow-500" />
                        {tech.avg_satisfaction.toFixed(1)}
                      </div>
                    </TableCell>
                    <TableCell className="text-center">
                      {getTrendIcon(tech.trend)}
                    </TableCell>
                    <TableCell className="text-center">
                      {getPerformanceBadge(tech.completion_rate)}
                    </TableCell>
                    <TableCell>
                      <Button
                        size="icon"
                        variant="ghost"
                        onClick={() =>
                          setExpandedTechnician(
                            expandedTechnician === tech.technician_id
                              ? null
                              : tech.technician_id
                          )
                        }
                      >
                        {expandedTechnician === tech.technician_id ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </Button>
                    </TableCell>
                  </TableRow>
                  {expandedTechnician === tech.technician_id && (
                    <TableRow>
                      <TableCell colSpan={9} className="bg-muted/50">
                        <div className="p-4">
                          <h4 className="font-medium mb-4">
                            Histórico de Produtividade
                          </h4>
                          <div className="h-[200px]">
                            <ResponsiveContainer width="100%" height="100%">
                              <LineChart
                                data={tech.snapshots
                                  .slice(-30)
                                  .reverse()
                                  .map((s) => ({
                                    date: new Date(s.snapshot_date).toLocaleDateString(
                                      "pt-BR",
                                      { day: "2-digit", month: "2-digit" }
                                    ),
                                    completed: s.tasks_completed || 0,
                                    hours: s.hours_worked || 0,
                                  }))}
                              >
                                <CartesianGrid strokeDasharray="3 3" />
                                <XAxis dataKey="date" />
                                <YAxis />
                                <Tooltip />
                                <Line
                                  type="monotone"
                                  dataKey="completed"
                                  stroke="hsl(var(--primary))"
                                  name="Tarefas"
                                />
                                <Line
                                  type="monotone"
                                  dataKey="hours"
                                  stroke="hsl(var(--secondary))"
                                  name="Horas"
                                />
                              </LineChart>
                            </ResponsiveContainer>
                          </div>
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
