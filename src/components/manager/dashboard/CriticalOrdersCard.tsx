import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AlertCircle, Clock, Calendar } from "lucide-react";
import { useCriticalOrders } from "@/hooks/useCriticalOrders";
import { Skeleton } from "@/components/ui/skeleton";
import { useNavigate } from "react-router-dom";

export function CriticalOrdersCard() {
  const { criticalOrders, isLoading } = useCriticalOrders();
  const navigate = useNavigate();

  const getIssueLabel = (type: string) => {
    switch (type) {
      case 'overdue':
        return { label: 'Atrasada', icon: AlertCircle, variant: 'destructive' as const };
      case 'long_in_progress':
        return { label: 'Tempo Elevado', icon: Clock, variant: 'secondary' as const };
      case 'no_schedule':
        return { label: 'Sem Agendamento', icon: Calendar, variant: 'outline' as const };
      default:
        return { label: 'Crítica', icon: AlertCircle, variant: 'destructive' as const };
    }
  };

  if (isLoading) {
    return (
      <Card className="border-destructive/50">
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(3)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  if (criticalOrders.length === 0) {
    return (
      <Card className="border-chart-2/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-chart-2">
            <AlertCircle className="h-5 w-5" />
            Ordens de Serviço Críticas
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="rounded-full bg-chart-2/10 p-3 mb-4">
              <AlertCircle className="h-8 w-8 text-chart-2" />
            </div>
            <p className="text-sm font-medium text-foreground">Nenhuma OS crítica</p>
            <p className="text-xs text-muted-foreground mt-1">
              Todas as ordens estão dentro do prazo
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-destructive/50">
      <CardHeader>
        <CardTitle className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-destructive" />
            <span>Ordens de Serviço Críticas</span>
          </div>
          <Badge variant="destructive" className="text-xs">
            {criticalOrders.length}
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-3">
          {criticalOrders.slice(0, 5).map((order) => {
            const issue = getIssueLabel(order.issue_type);
            const Icon = issue.icon;

            return (
              <div
                key={order.id}
                className="flex items-start justify-between p-3 rounded-lg border bg-card hover:bg-accent/50 transition-colors"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="font-medium text-sm">OS #{order.order_number}</span>
                    <Badge variant={issue.variant} className="text-xs">
                      <Icon className="h-3 w-3 mr-1" />
                      {issue.label}
                    </Badge>
                  </div>
                  <p className="text-xs text-muted-foreground truncate">
                    {order.vessel_name || order.client_name || 'Sem informação'}
                  </p>
                  {order.days_overdue && (
                    <p className="text-xs text-destructive font-medium mt-1">
                      {order.issue_type === 'overdue' && `${order.days_overdue} dias de atraso`}
                      {order.issue_type === 'long_in_progress' && `${order.days_overdue} dias em andamento`}
                      {order.issue_type === 'no_schedule' && `${order.days_overdue} dias sem agendamento`}
                    </p>
                  )}
                  {order.created_by_name && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Coordenador: {order.created_by_name}
                    </p>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {criticalOrders.length > 5 && (
          <Button
            variant="outline"
            size="sm"
            className="w-full mt-4"
            onClick={() => navigate('/manager/orders')}
          >
            Ver todas ({criticalOrders.length})
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
