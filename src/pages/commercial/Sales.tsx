import { useMemo, useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Search, Calculator, CheckCircle2, Clock, DollarSign, Eye, ShoppingBag } from "lucide-react";
import { Dialog } from "@/components/ui/dialog";
import { MeasurementDialog } from "@/components/admin/measurements/MeasurementDialog";
import SaleDetailDialog from "@/components/commercial/sales/SaleDetailDialog";
import { formatLocalDate } from "@/lib/utils";

const MEAS_STATUS: Record<string, { label: string; variant: "default" | "secondary" | "outline" }> = {
  draft: { label: "Rascunho", variant: "secondary" },
  in_progress: { label: "Em Progresso", variant: "default" },
  finalized: { label: "Finalizada", variant: "outline" },
};

const EDIT_ANY_ROLES = new Set(["super_admin", "director", "coordinator", "admin"]);
const OWNER_ROLES = new Set(["commercial", "marketing"]);

const formatCurrency = (v: number) =>
  new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(v || 0);

const Sales = () => {
  const { profile, userRole } = useAuth();
  const [searchParams, setSearchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") === "produtos" ? "produtos" : "servicos";
  const [tab, setTab] = useState<string>(initialTab);
  const [search, setSearch] = useState("");

  const [selectedServiceOrderId, setSelectedServiceOrderId] = useState<string | null>(null);
  const [selectedCreatedBy, setSelectedCreatedBy] = useState<string | null>(null);
  const [measDetailOpen, setMeasDetailOpen] = useState(false);

  const [selectedSaleId, setSelectedSaleId] = useState<string | null>(null);
  const [saleDetailOpen, setSaleDetailOpen] = useState(false);

  useEffect(() => {
    const t = searchParams.get("tab");
    const next = t === "produtos" ? "produtos" : "servicos";
    if (next !== tab) setTab(next);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [searchParams]);

  const handleTabChange = (v: string) => {
    setTab(v);
    setSearchParams({ tab: v }, { replace: true });
  };

  const { data: measurements = [], isLoading: loadingMeas } = useQuery({
    queryKey: ["commercial-measurements", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      const { data, error } = await supabase
        .from("measurements")
        .select("*, service_orders(id, order_number, created_by, clients(name))")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id,
  });

  const { data: sales = [], isLoading: loadingSales } = useQuery({
    queryKey: ["commercial-sales", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      const { data, error } = await supabase
        .from("crm_sales")
        .select("*, clients(name), crm_opportunities(title)")
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!profile?.company_id,
  });

  const canEditAny = userRole ? EDIT_ANY_ROLES.has(userRole) : false;
  const isOwnerRole = userRole ? OWNER_ROLES.has(userRole) : false;
  const readOnlyForSelection = !canEditAny && !(
    isOwnerRole && selectedCreatedBy && profile?.id === selectedCreatedBy
  );

  const filteredMeas = measurements.filter((m: any) => {
    const clientName = m.service_orders?.clients?.name || "";
    const orderNum = m.service_orders?.order_number || "";
    return clientName.toLowerCase().includes(search.toLowerCase()) ||
      orderNum.toLowerCase().includes(search.toLowerCase());
  });

  const filteredSales = sales.filter((s: any) => {
    const clientName = s.clients?.name || "";
    const num = s.sale_number || "";
    return clientName.toLowerCase().includes(search.toLowerCase()) ||
      num.toLowerCase().includes(search.toLowerCase());
  });

  const kpis = useMemo(() => {
    const measTotal = measurements.reduce((s: number, m: any) => s + (Number(m.total_amount) || 0), 0);
    const salesTotal = sales.reduce((s: number, x: any) => s + (Number(x.total_amount) || 0), 0);
    const finalizedMeas = measurements.filter((m: any) => m.status === "finalized").length;
    const inProgressMeas = measurements.filter((m: any) => m.status === "in_progress" || m.status === "draft").length;
    return {
      totalGeral: measTotal + salesTotal,
      qtdServicos: measurements.length,
      qtdProdutos: sales.length,
      finalizadas: finalizedMeas,
      emAndamento: inProgressMeas,
    };
  }, [measurements, sales]);

  const handleOpenMeas = (m: any) => {
    setSelectedServiceOrderId(m.service_orders?.id || null);
    setSelectedCreatedBy(m.service_orders?.created_by || null);
    setMeasDetailOpen(true);
  };

  const handleOpenSale = (id: string) => {
    setSelectedSaleId(id);
    setSaleDetailOpen(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-foreground">Vendas</h2>
        <p className="text-sm text-muted-foreground">Serviços (medições) e produtos vendidos pela empresa.</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-chart-4" />
              <div>
                <p className="text-sm text-muted-foreground">Total Geral</p>
                <p className="text-2xl font-bold">{formatCurrency(kpis.totalGeral)}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <Calculator className="h-5 w-5 text-primary" />
              <div>
                <p className="text-sm text-muted-foreground">Serviços</p>
                <p className="text-2xl font-bold">{kpis.qtdServicos}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <ShoppingBag className="h-5 w-5 text-chart-2" />
              <div>
                <p className="text-sm text-muted-foreground">Produtos</p>
                <p className="text-2xl font-bold">{kpis.qtdProdutos}</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="flex items-center gap-2">
              <CheckCircle2 className="h-5 w-5 text-chart-2" />
              <div>
                <p className="text-sm text-muted-foreground">Finalizadas / Em Andamento</p>
                <p className="text-2xl font-bold">{kpis.finalizadas} / {kpis.emAndamento}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs value={tab} onValueChange={handleTabChange}>
        <TabsList>
          <TabsTrigger value="servicos"><Calculator className="h-4 w-4 mr-2" />Serviços</TabsTrigger>
          <TabsTrigger value="produtos"><ShoppingBag className="h-4 w-4 mr-2" />Produtos</TabsTrigger>
        </TabsList>

        <Card className="mt-4">
          <CardHeader>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder={tab === "servicos" ? "Buscar por cliente ou OS..." : "Buscar por cliente ou nº da venda..."}
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="pl-9"
              />
            </div>
          </CardHeader>
          <CardContent>
            <TabsContent value="servicos" className="mt-0">
              {loadingMeas ? (
                <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : filteredMeas.length === 0 ? (
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
                    {filteredMeas.map((m: any) => (
                      <TableRow key={m.id}>
                        <TableCell className="font-medium">{m.service_orders?.order_number}</TableCell>
                        <TableCell>{m.service_orders?.clients?.name || "-"}</TableCell>
                        <TableCell><Badge variant="secondary">{m.category}</Badge></TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant={MEAS_STATUS[m.status]?.variant || "secondary"}>
                            {MEAS_STATUS[m.status]?.label || m.status}
                          </Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {m.total_amount ? formatCurrency(Number(m.total_amount)) : "-"}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {m.created_at ? formatLocalDate(m.created_at) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenMeas(m)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>

            <TabsContent value="produtos" className="mt-0">
              {loadingSales ? (
                <div className="space-y-3">{Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}</div>
              ) : filteredSales.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <ShoppingBag className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>Nenhuma venda de produto encontrada</p>
                </div>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Nº</TableHead>
                      <TableHead>Cliente</TableHead>
                      <TableHead>Oportunidade</TableHead>
                      <TableHead className="hidden md:table-cell">Status</TableHead>
                      <TableHead className="hidden md:table-cell">Total</TableHead>
                      <TableHead className="hidden md:table-cell">Data</TableHead>
                      <TableHead className="text-right">Ações</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredSales.map((s: any) => (
                      <TableRow key={s.id}>
                        <TableCell className="font-medium">{s.sale_number || "-"}</TableCell>
                        <TableCell>{s.clients?.name || "-"}</TableCell>
                        <TableCell>{s.crm_opportunities?.title || "-"}</TableCell>
                        <TableCell className="hidden md:table-cell">
                          <Badge variant="secondary">{s.status}</Badge>
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {formatCurrency(Number(s.total_amount))}
                        </TableCell>
                        <TableCell className="hidden md:table-cell">
                          {s.created_at ? formatLocalDate(s.created_at) : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <Button variant="ghost" size="icon" onClick={() => handleOpenSale(s.id)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>

      <Dialog open={measDetailOpen} onOpenChange={setMeasDetailOpen}>
        {selectedServiceOrderId && (
          <MeasurementDialog
            serviceOrderId={selectedServiceOrderId}
            onClose={() => setMeasDetailOpen(false)}
            readOnly={readOnlyForSelection}
          />
        )}
      </Dialog>

      <SaleDetailDialog
        saleId={selectedSaleId}
        open={saleDetailOpen}
        onOpenChange={setSaleDetailOpen}
      />
    </div>
  );
};

export default Sales;
