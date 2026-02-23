import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Search, Calculator, RefreshCw, CheckCircle2, Clock, XCircle, DollarSign, Eye } from "lucide-react";
import { format } from "date-fns";
import { toast } from "sonner";
import { MeasurementDetailDialog } from "@/components/commercial/measurements/MeasurementDetailDialog";

const STATUS_MAP: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  draft: { label: "Rascunho", variant: "secondary" },
  in_progress: { label: "Em Progresso", variant: "default" },
  finalized: { label: "Finalizada", variant: "outline" },
};

const Measurements = () => {
  const { profile } = useAuth();
  const [search, setSearch] = useState("");
  const [selectedMeasurementId, setSelectedMeasurementId] = useState<string | null>(null);
  const [detailOpen, setDetailOpen] = useState(false);

  const { data: measurements = [], isLoading } = useQuery({
    queryKey: ["commercial-measurements", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      const { data, error } = await supabase
        .from("measurements")
        .select("*, service_orders(order_number, clients(name))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id,
  });

  const filtered = measurements.filter((m: any) => {
    const clientName = m.service_orders?.clients?.name || "";
    const orderNum = m.service_orders?.order_number || "";
    return clientName.toLowerCase().includes(search.toLowerCase()) ||
      orderNum.toLowerCase().includes(search.toLowerCase());
  });

  const kpis = useMemo(() => {
    const total = measurements.length;
    const finalized = measurements.filter((m: any) => m.status === "finalized").length;
    const inProgress = measurements.filter((m: any) => m.status === "in_progress" || m.status === "draft").length;
    const totalValue = measurements.reduce((s: number, m: any) => s + (Number(m.total_amount) || 0), 0);
    return { total, finalized, inProgress, totalValue };
  }, [measurements]);

  const formatCurrency = (v: number) => new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Medições de Serviços</h2>
        <Button variant="outline" onClick={() => toast.info("Sincronização iniciada")}>
          <RefreshCw className="h-4 w-4 mr-2" />Sincronizar
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Total</p>
                <p className="text-2xl font-bold">{kpis.total}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-chart-2" />
              <div>
                <p className="text-sm text-muted-foreground">Finalizadas</p>
                <p className="text-2xl font-bold">{kpis.finalized}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Clock className="h-5 w-5 text-chart-3" />
              <div>
                <p className="text-sm text-muted-foreground">Em Andamento</p>
                <p className="text-2xl font-bold">{kpis.inProgress}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-chart-4" />
              <div>
                <p className="text-sm text-muted-foreground">Valor Total</p>
                <p className="text-2xl font-bold">{formatCurrency(kpis.totalValue)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Buscar por cliente ou OS..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <Calculator className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>Nenhuma medição encontrada</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>OS</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Categoria</TableHead>
                  <TableHead className="hidden md:table-cell">Status</TableHead>
                  <TableHead className="hidden md:table-cell">Total</TableHead>
                   <TableHead className="hidden md:table-cell">Data</TableHead>
                   <TableHead className="text-right">Ações</TableHead>
                 </TableRow>
              </TableHeader>
              <TableBody>
                {filtered.map((m: any) => (
                  <TableRow key={m.id}>
                    <TableCell className="font-medium">{m.service_orders?.order_number}</TableCell>
                    <TableCell>{m.service_orders?.clients?.name || "-"}</TableCell>
                    <TableCell>
                      <Badge variant="secondary">{m.category}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      <Badge variant={STATUS_MAP[m.status]?.variant || "secondary"}>
                        {STATUS_MAP[m.status]?.label || m.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell">
                      {m.total_amount ? `R$ ${Number(m.total_amount).toLocaleString("pt-BR", { minimumFractionDigits: 2 })}` : "-"}
                    </TableCell>
                     <TableCell className="hidden md:table-cell">
                       {m.created_at ? format(new Date(m.created_at), "dd/MM/yyyy") : "-"}
                     </TableCell>
                     <TableCell className="text-right">
                       <Button variant="ghost" size="icon" onClick={() => { setSelectedMeasurementId(m.id); setDetailOpen(true); }}>
                         <Eye className="h-4 w-4" />
                       </Button>
                       <Button variant="ghost" size="icon" onClick={() => toast.info("Reprocessamento iniciado")}>
                         <RefreshCw className="h-4 w-4" />
                       </Button>
                     </TableCell>
                   </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      <MeasurementDetailDialog
        measurementId={selectedMeasurementId}
        open={detailOpen}
        onOpenChange={setDetailOpen}
      />
    </div>
  );
};

export default Measurements;
