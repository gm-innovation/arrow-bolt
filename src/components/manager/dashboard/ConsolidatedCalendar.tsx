import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Badge } from "@/components/ui/badge";
import { useState } from "react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Skeleton } from "@/components/ui/skeleton";

interface DashboardFilters {
  startDate?: Date;
  endDate?: Date;
  statuses: string[];
  clientId?: string;
  coordinatorId?: string;
}

interface ConsolidatedCalendarProps {
  filters: DashboardFilters;
}

export const ConsolidatedCalendar = ({ filters }: ConsolidatedCalendarProps) => {
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date());

  const { data: orders, isLoading } = useQuery({
    queryKey: ["calendar-orders", filters, selectedDate],
    queryFn: async () => {
      if (!selectedDate) return [];

      let query = supabase
        .from("service_orders")
        .select(`
          *,
          client:clients(name),
          vessel:vessels(name),
          creator:profiles!service_orders_created_by_fkey(full_name)
        `)
        .gte("scheduled_date", format(selectedDate, "yyyy-MM-dd"))
        .lte("scheduled_date", format(selectedDate, "yyyy-MM-dd"));

      if (filters.coordinatorId) {
        query = query.eq("created_by", filters.coordinatorId);
      }

      if (filters.clientId) {
        query = query.eq("client_id", filters.clientId);
      }

      const { data, error } = await query;
      if (error) throw error;

      let filteredOrders = data || [];

      // Apply status filter if any statuses are selected
      if (filters.statuses.length > 0) {
        filteredOrders = filteredOrders.filter(o => filters.statuses.includes(o.status || ""));
      }

      return filteredOrders;
    }
  });

  if (isLoading) {
    return <Skeleton className="h-96" />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Calendário Consolidado</CardTitle>
      </CardHeader>
      <CardContent>
        <Calendar
          mode="single"
          selected={selectedDate}
          onSelect={setSelectedDate}
          locale={ptBR}
          className="rounded-md border"
        />
        
        {selectedDate && (
          <div className="mt-4 space-y-2">
            <h4 className="font-semibold">
              OSs em {format(selectedDate, "dd 'de' MMMM", { locale: ptBR })}
            </h4>
            {orders?.length === 0 ? (
              <p className="text-sm text-muted-foreground">Nenhuma OS agendada para esta data</p>
            ) : (
              <div className="space-y-2">
                {orders?.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="font-medium text-sm">{order.order_number}</p>
                      <p className="text-xs text-muted-foreground">
                        {order.client?.name} - {order.vessel?.name}
                      </p>
                      {order.creator && (
                        <p className="text-xs text-muted-foreground">
                          Coord: {order.creator.full_name}
                        </p>
                      )}
                    </div>
                    <Badge variant={
                      order.status === "completed" ? "default" :
                      order.status === "in_progress" ? "default" :
                      order.status === "cancelled" ? "destructive" :
                      "secondary"
                    }>
                      {order.status === "completed" ? "Concluída" :
                       order.status === "in_progress" ? "Em Andamento" :
                       order.status === "cancelled" ? "Cancelada" : "Pendente"}
                    </Badge>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
};
