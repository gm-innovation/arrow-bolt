import { Badge } from "@/components/ui/badge";
import { Clock, User, FileText, MapPin } from "lucide-react";

interface ServiceOrderHoverCardProps {
  order: {
    order_number: string;
    status: string;
    task_type?: string;
    client_name?: string;
    duration?: string;
    supervisor_name?: string;
    description?: string;
    location?: string;
  };
}

export const ServiceOrderHoverCard = ({ order }: ServiceOrderHoverCardProps) => {
  const getStatusBadgeVariant = (status: string) => {
    const variants: Record<string, string> = {
      pending: "bg-yellow-500 text-white hover:bg-yellow-600",
      in_progress: "bg-blue-500 text-white hover:bg-blue-600",
      completed: "bg-green-500 text-white hover:bg-green-600",
      cancelled: "bg-red-500 text-white hover:bg-red-600",
      waiting: "bg-gray-500 text-white hover:bg-gray-600",
    };
    return variants[status] || "bg-gray-500 text-white";
  };

  const getStatusLabel = (status: string) => {
    const labels: Record<string, string> = {
      pending: "Pendente",
      in_progress: "Em Andamento",
      completed: "Concluído",
      cancelled: "Cancelado",
      waiting: "Aguardando",
    };
    return labels[status] || status;
  };

  return (
    <div className="space-y-3 min-w-[280px]">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium text-muted-foreground">Status</span>
        <Badge className={getStatusBadgeVariant(order.status)}>
          {getStatusLabel(order.status)}
        </Badge>
      </div>

      <div className="space-y-2">
        <div className="flex items-start gap-2">
          <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div className="flex-1">
            <p className="text-xs text-muted-foreground">Código</p>
            <p className="text-sm font-medium">{order.order_number}</p>
          </div>
        </div>

        {order.task_type && (
          <div className="flex items-start gap-2">
            <FileText className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Tipo de Serviço</p>
              <p className="text-sm font-medium">{order.task_type}</p>
            </div>
          </div>
        )}

        {order.client_name && (
          <div className="flex items-start gap-2">
            <User className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Cliente</p>
              <p className="text-sm font-medium">{order.client_name}</p>
            </div>
          </div>
        )}

        {order.duration && (
          <div className="flex items-start gap-2">
            <Clock className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Duração</p>
              <p className="text-sm font-medium">{order.duration}</p>
            </div>
          </div>
        )}

        {order.supervisor_name && (
          <div className="flex items-start gap-2">
            <User className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Responsável</p>
              <p className="text-sm font-medium">{order.supervisor_name}</p>
            </div>
          </div>
        )}

        {order.location && (
          <div className="flex items-start gap-2">
            <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
            <div className="flex-1">
              <p className="text-xs text-muted-foreground">Local</p>
              <p className="text-sm font-medium">{order.location}</p>
            </div>
          </div>
        )}

        {order.description && (
          <div className="pt-2 border-t">
            <p className="text-xs text-muted-foreground mb-1">Descrição</p>
            <p className="text-sm">{order.description}</p>
          </div>
        )}
      </div>
    </div>
  );
};
