import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";

interface CoordinatorTableProps {
  data?: Array<{
    coordinator_name: string;
    coordinator_id: string;
    total_orders: number;
    completed_orders: number;
    in_progress_orders: number;
    pending_orders: number;
    completion_rate: number;
  }>;
  isLoading?: boolean;
}

export function CoordinatorTable({ data, isLoading }: CoordinatorTableProps) {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  const getCompletionBadge = (rate: number) => {
    if (rate >= 80) return <Badge className="bg-chart-2">Excelente</Badge>;
    if (rate >= 60) return <Badge className="bg-chart-3">Bom</Badge>;
    if (rate >= 40) return <Badge variant="secondary">Regular</Badge>;
    return <Badge variant="destructive">Baixo</Badge>;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Desempenho por Coordenador</CardTitle>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Coordenador</TableHead>
              <TableHead className="text-center">Total</TableHead>
              <TableHead className="text-center">Concluídas</TableHead>
              <TableHead className="text-center">Em Andamento</TableHead>
              <TableHead className="text-center">Pendentes</TableHead>
              <TableHead className="text-center">Taxa</TableHead>
              <TableHead className="text-center">Performance</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {data && data.length > 0 ? (
              data.map((coordinator) => (
                <TableRow key={coordinator.coordinator_id}>
                  <TableCell className="font-medium">
                    {coordinator.coordinator_name}
                  </TableCell>
                  <TableCell className="text-center">
                    {coordinator.total_orders}
                  </TableCell>
                  <TableCell className="text-center">
                    {coordinator.completed_orders}
                  </TableCell>
                  <TableCell className="text-center">
                    {coordinator.in_progress_orders}
                  </TableCell>
                  <TableCell className="text-center">
                    {coordinator.pending_orders}
                  </TableCell>
                  <TableCell className="text-center">
                    {coordinator.completion_rate}%
                  </TableCell>
                  <TableCell className="text-center">
                    {getCompletionBadge(coordinator.completion_rate)}
                  </TableCell>
                </TableRow>
              ))
            ) : (
              <TableRow>
                <TableCell colSpan={7} className="text-center text-muted-foreground">
                  Nenhum dado disponível
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
