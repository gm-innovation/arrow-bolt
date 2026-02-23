import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Skeleton } from "@/components/ui/skeleton";
import { RefreshCw, User, DollarSign, CalendarDays } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  draft: { label: "Rascunho", variant: "secondary" },
  in_progress: { label: "Em Progresso", variant: "default" },
  finalized: { label: "Finalizada", variant: "outline" },
};

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

interface MeasurementDetailDialogProps {
  measurementId: string | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const MeasurementDetailDialog = ({ measurementId, open, onOpenChange }: MeasurementDetailDialogProps) => {
  const { data: measurement, isLoading } = useQuery({
    queryKey: ["measurement-detail", measurementId],
    queryFn: async () => {
      if (!measurementId) return null;
      const { data, error } = await supabase
        .from("measurements")
        .select(`
          *,
          service_orders(order_number, clients(name)),
          measurement_materials(*),
          measurement_services(*),
          measurement_man_hours(*),
          measurement_travels(*),
          measurement_expenses(*)
        `)
        .eq("id", measurementId)
        .single();
      if (error) throw error;
      return data;
    },
    enabled: !!measurementId && open,
  });

  const m = measurement as any;
  const orderNumber = m?.service_orders?.order_number || "";
  const clientName = m?.service_orders?.clients?.name || "";
  const materials = m?.measurement_materials || [];
  const services = m?.measurement_services || [];
  const manHours = m?.measurement_man_hours || [];
  const travels = m?.measurement_travels || [];
  const expenses = m?.measurement_expenses || [];

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <DialogTitle>OS {orderNumber} - {clientName}</DialogTitle>
              {m && (
                <Badge variant={STATUS_MAP[m.status]?.variant || "secondary"}>
                  {STATUS_MAP[m.status]?.label || m.status}
                </Badge>
              )}
            </div>
            <Button variant="outline" size="sm" onClick={() => toast.info("Reprocessamento iniciado")}>
              <RefreshCw className="h-4 w-4 mr-2" />Reprocessar
            </Button>
          </div>
        </DialogHeader>

        {isLoading ? (
          <div className="space-y-4 py-4">
            <div className="grid grid-cols-3 gap-4">
              {[1, 2, 3].map(i => <Skeleton key={i} className="h-20" />)}
            </div>
            <Skeleton className="h-64" />
          </div>
        ) : m ? (
          <div className="flex-1 overflow-y-auto space-y-4 pr-1">
            {/* Summary cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Card>
                <CardContent className="pt-4 flex items-center gap-3">
                  <User className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Cliente</p>
                    <p className="font-semibold text-sm">{clientName}</p>
                    <p className="text-xs text-muted-foreground">OS: {orderNumber}</p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 flex items-center gap-3">
                  <DollarSign className="h-5 w-5 text-chart-2" />
                  <div>
                    <p className="text-xs text-muted-foreground">Valor Total</p>
                    <p className="font-semibold text-sm text-chart-2">
                      {formatCurrency(Number(m.total_amount) || 0)}
                    </p>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="pt-4 flex items-center gap-3">
                  <CalendarDays className="h-5 w-5 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Data de Criação</p>
                    <p className="font-semibold text-sm">
                      {m.created_at ? format(new Date(m.created_at), "dd/MM/yyyy") : "-"}
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Tabs */}
            <Tabs defaultValue="materials">
              <TabsList className="w-full justify-start">
                <TabsTrigger value="materials">Materiais ({materials.length})</TabsTrigger>
                <TabsTrigger value="services">Serviços ({services.length})</TabsTrigger>
                <TabsTrigger value="hours">Horas ({manHours.length})</TabsTrigger>
                <TabsTrigger value="travels">Viagens ({travels.length})</TabsTrigger>
                <TabsTrigger value="expenses">Despesas ({expenses.length})</TabsTrigger>
              </TabsList>

              <TabsContent value="materials">
                <DetailTable
                  items={materials}
                  columns={["Descrição", "Qtd", "Valor Unit.", "Total"]}
                  row={(item: any) => [
                    item.description || item.material_name || "-",
                    item.quantity ?? "-",
                    item.unit_price ? formatCurrency(item.unit_price) : "-",
                    item.total_price ? formatCurrency(item.total_price) : "-",
                  ]}
                />
              </TabsContent>

              <TabsContent value="services">
                <DetailTable
                  items={services}
                  columns={["Descrição", "Qtd", "Valor Unit.", "Total"]}
                  row={(item: any) => [
                    item.description || item.service_name || "-",
                    item.quantity ?? "-",
                    item.unit_price ? formatCurrency(item.unit_price) : "-",
                    item.total_price ? formatCurrency(item.total_price) : "-",
                  ]}
                />
              </TabsContent>

              <TabsContent value="hours">
                <DetailTable
                  items={manHours}
                  columns={["Data", "Período", "Total Horas", "Tipo", "Valor Total"]}
                  row={(item: any) => [
                    item.work_date ? format(new Date(item.work_date), "dd/MM/yyyy") : "-",
                    item.period || "-",
                    item.total_hours ?? "-",
                    item.hour_type || "-",
                    item.total_price ? formatCurrency(item.total_price) : "-",
                  ]}
                />
              </TabsContent>

              <TabsContent value="travels">
                <DetailTable
                  items={travels}
                  columns={["Origem", "Destino", "Distância (km)", "Valor"]}
                  row={(item: any) => [
                    item.origin || "-",
                    item.destination || "-",
                    item.distance_km ?? "-",
                    item.total_price ? formatCurrency(item.total_price) : "-",
                  ]}
                />
              </TabsContent>

              <TabsContent value="expenses">
                <DetailTable
                  items={expenses}
                  columns={["Descrição", "Categoria", "Data", "Valor"]}
                  row={(item: any) => [
                    item.description || "-",
                    item.category || "-",
                    item.expense_date ? format(new Date(item.expense_date), "dd/MM/yyyy") : "-",
                    item.amount ? formatCurrency(item.amount) : "-",
                  ]}
                />
              </TabsContent>
            </Tabs>
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
};

function DetailTable({ items, columns, row }: { items: any[]; columns: string[]; row: (item: any) => (string | number)[] }) {
  if (items.length === 0) {
    return <p className="text-center py-8 text-muted-foreground text-sm">Nenhum item registrado</p>;
  }
  return (
    <Table>
      <TableHeader>
        <TableRow>
          {columns.map(c => <TableHead key={c}>{c}</TableHead>)}
        </TableRow>
      </TableHeader>
      <TableBody>
        {items.map((item: any, i: number) => (
          <TableRow key={item.id || i}>
            {row(item).map((cell, j) => (
              <TableCell key={j}>{cell}</TableCell>
            ))}
          </TableRow>
        ))}
      </TableBody>
    </Table>
  );
}
