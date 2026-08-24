import { useState, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
import { useQuery } from "@tanstack/react-query";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { MoreHorizontal, Plus, Loader2, Download, FileText, Eye, Pencil, Users, Calendar, ClipboardList, ChevronLeft, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { exportToCSV, formatDateForExport } from "@/lib/exportUtils";
import { format } from "date-fns";
import { formatLocalDate } from "@/lib/utils";
import { NewOrderDialog } from "@/components/admin/orders/NewOrderDialog";
import { Input } from "@/components/ui/input";
import { EditOrderDialog } from "@/components/admin/orders/EditOrderDialog";
import { TransferTechniciansDialog } from "@/components/admin/orders/TransferTechniciansDialog";
import { ViewOrderDetailsDialog } from "@/components/admin/orders/ViewOrderDetailsDialog";
import { Badge } from "@/components/ui/badge";
import { useServiceOrders, fetchServiceOrders } from "@/hooks/useServiceOrders";
import { useDebounce } from "@/hooks/useDebounce";
import { ScheduleReturnDialog } from "@/components/admin/orders/ScheduleReturnDialog";
import { useAuth } from "@/contexts/AuthContext";
import { MeasurementDialog } from "@/components/admin/measurements/MeasurementDialog";
import { supabase } from "@/integrations/supabase/client";

const PAGE_SIZE = 50;

type FormData = {
  orderNumber: string;
  clientReference: string;
};

const ServiceOrders = () => {
  const [searchParams, setSearchParams] = useSearchParams();
  const { toast } = useToast();
  const { user, userRole } = useAuth();
  const [vessel, setVessel] = useState("all");
  const [status, setStatus] = useState("all");
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 400);
  const [page, setPage] = useState(1);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [selectedOrderNumber, setSelectedOrderNumber] = useState<string>("");
  const [activeDialog, setActiveDialog] = useState<"edit" | "transfer" | "view" | "return" | "measurement" | null>(null);
  const [exporting, setExporting] = useState(false);
  const form = useForm<FormData>();

  // Filtros e paginação aplicados no banco (server-side)
  const { orders, totalCount, isLoading, invalidate } = useServiceOrders({
    page,
    pageSize: PAGE_SIZE,
    search: debouncedSearch,
    status,
    vesselId: vessel,
  });

  // Opções de embarcação (vêm do cadastro, não das OSs carregadas)
  const { data: vesselOptions = [] } = useQuery({
    queryKey: ["vessel-options", user?.id],
    queryFn: async () => {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user?.id)
        .single();
      if (!profileData?.company_id) return [];
      const { data } = await supabase
        .from("vessels")
        .select("id, name, client:clients!inner(company_id)")
        .eq("clients.company_id", profileData.company_id)
        .order("name");
      return (data ?? []) as { id: string; name: string }[];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 60 * 5,
  });

  // Volta para a primeira página ao mudar qualquer filtro
  useEffect(() => {
    setPage(1);
  }, [debouncedSearch, vessel, status]);

  // Abre o diálogo de detalhes quando a URL traz ?id= (o diálogo busca a OS sozinho)
  useEffect(() => {
    const orderId = searchParams.get("id");
    if (orderId) {
      setSelectedOrderId(orderId);
      setActiveDialog("view");
      setSearchParams({});
    }
  }, [searchParams, setSearchParams]);

  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const handleAction = (action: "edit" | "transfer" | "view" | "return" | "measurement", orderId: string, orderNumber?: string) => {
    setSelectedOrderId(orderId);
    if (orderNumber) setSelectedOrderNumber(orderNumber);
    setActiveDialog(action);
  };

  const handleCloseDialog = () => {
    setSelectedOrderId(null);
    setSelectedOrderNumber("");
    setActiveDialog(null);
    invalidate();
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: any }> = {
      pending: { label: "Pendente", variant: "secondary" },
      in_progress: { label: "Em Andamento", variant: "default" },
      completed: { label: "Concluído", variant: "outline" },
      cancelled: { label: "Cancelada", variant: "destructive" },
    };

    const config = statusConfig[status] || { label: status, variant: "secondary" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  // Exporta TODAS as OSs que batem com os filtros atuais (não só a página exibida)
  const handleExport = async () => {
    try {
      setExporting(true);
      const { data: profileData } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user?.id)
        .single();
      if (!profileData?.company_id) throw new Error("Empresa não encontrada");

      const { orders: allFiltered, totalCount: total } = await fetchServiceOrders(
        profileData.company_id,
        { search: debouncedSearch, status, vesselId: vessel },
        10000,
      );

      const statusLabel = (s: string) =>
        s === "pending" ? "Pendente" :
        s === "in_progress" ? "Em Andamento" :
        s === "cancelled" ? "Cancelada" : "Concluído";

      const exportData = allFiltered.map(order => ({
        numeroOS: order.orderNumber,
        cliente: order.client,
        embarcacao: order.vessel,
        status: statusLabel(order.status),
        dataAgendada: order.scheduledDate ? formatDateForExport(order.scheduledDate) : "-",
        dataAbertura: order.omieCreatedDate
          ? formatDateForExport(order.omieCreatedDate)
          : formatDateForExport(order.createdAt),
      }));

      const headers = {
        numeroOS: "Número da OS",
        cliente: "Cliente",
        embarcacao: "Embarcação",
        status: "Status",
        dataAgendada: "Data Agendada",
        dataAbertura: "Data de Abertura",
      };

      exportToCSV(exportData, `ordens-servico-${new Date().toISOString().split('T')[0]}`, headers);

      toast({
        title: "Exportação concluída",
        description: `${exportData.length} de ${total} ordens de serviço exportadas com sucesso`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao exportar",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setExporting(false);
    }
  };

  if (isLoading && orders.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-9 w-48" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-32" />
            <Skeleton className="h-10 w-40" />
          </div>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-10 w-full max-w-sm" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Ordens de Serviço</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={exporting || totalCount === 0}>
            {exporting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Download className="mr-2 h-4 w-4" />}
            Exportar
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova OS
              </Button>
            </DialogTrigger>
            <NewOrderDialog 
              form={form} 
              onSuccess={() => {
                invalidate();
                form.reset();
              }}
            />
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Input 
              placeholder="Buscar OS, embarcação ou cliente..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="md:col-span-2"
            />
            <Select value={vessel} onValueChange={setVessel}>
              <SelectTrigger>
                <SelectValue placeholder="Embarcação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todas</SelectItem>
                {vesselOptions.map(v => (
                  <SelectItem key={v.id} value={v.id}>{v.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="in_progress">Em Andamento</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
                <SelectItem value="cancelled">Cancelada</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading && orders.length === 0 ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Número da OS</TableHead>
                    <TableHead>Ref. Cliente</TableHead>
                    <TableHead>Cliente</TableHead>
                    <TableHead>Embarcação</TableHead>
                    <TableHead>Coordenador</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Data Agendada</TableHead>
                    <TableHead>Abertura</TableHead>
                    <TableHead className="w-[70px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {orders.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={9} className="h-32">
                        <div className="flex flex-col items-center justify-center p-8">
                          <FileText className="h-12 w-12 text-muted-foreground mb-3" />
                          <h3 className="text-lg font-medium">Nenhuma ordem de serviço encontrada</h3>
                          <p className="text-sm text-muted-foreground mt-1">
                            {(vessel !== "all" || status !== "all" || debouncedSearch) 
                              ? "Tente ajustar os filtros de busca" 
                              : "Crie sua primeira ordem de serviço para começar"}
                          </p>
                        </div>
                      </TableCell>
                    </TableRow>
                  ) : (
                    orders.map((order) => {
                      const canEdit = order.createdBy === user?.id || userRole === 'super_admin';

                      return (
                        <TableRow key={order.id}>
                          <TableCell className="font-medium">
                            <Button 
                              variant="link" 
                              className="p-0" 
                              onClick={() => handleAction("view", order.id)}
                            >
                              {order.orderNumber}
                            </Button>
                          </TableCell>
                          <TableCell className="text-xs text-muted-foreground">{order.clientReference || '-'}</TableCell>
                          <TableCell>{order.client}</TableCell>
                          <TableCell>{order.vessel}</TableCell>
                          <TableCell>
                            <div className="flex items-center gap-2">
                              {order.createdByName}
                              {order.createdBy === user?.id && (
                                <Badge variant="default" className="text-xs">Você</Badge>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>{getStatusBadge(order.status)}</TableCell>
                          <TableCell>
                            {order.scheduledDate ? formatLocalDate(order.scheduledDate) : "-"}
                          </TableCell>
                          <TableCell>
                            {order.omieCreatedDate
                              ? formatLocalDate(order.omieCreatedDate)
                              : format(new Date(order.createdAt), "dd/MM/yyyy")}
                          </TableCell>
                          <TableCell>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" className="h-8 w-8 p-0">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => handleAction("view", order.id)}>
                                  <Eye className="mr-2 h-4 w-4" />
                                  Visualizar Detalhes
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleAction("edit", order.id)}
                                  disabled={!canEdit}
                                >
                                  <Pencil className="mr-2 h-4 w-4" />
                                  Editar
                                  {!canEdit && <Badge variant="outline" className="ml-2 text-xs">Somente Leitura</Badge>}
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleAction("transfer", order.id)}
                                  disabled={!canEdit}
                                >
                                  <Users className="mr-2 h-4 w-4" />
                                  Transferir Técnicos
                                  {!canEdit && <Badge variant="outline" className="ml-2 text-xs">Somente Leitura</Badge>}
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleAction("return", order.id, order.orderNumber)}
                                  disabled={!canEdit}
                                >
                                  <Calendar className="mr-2 h-4 w-4" />
                                  Agendar Retorno
                                  {!canEdit && <Badge variant="outline" className="ml-2 text-xs">Somente Leitura</Badge>}
                                </DropdownMenuItem>
                                <DropdownMenuItem 
                                  onClick={() => handleAction("measurement", order.id)}
                                >
                                  <ClipboardList className="mr-2 h-4 w-4" />
                                  Medição Final
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      );
                    })
                  )}
                </TableBody>
              </Table>

              {totalCount > 0 && (
                <div className="flex items-center justify-between pt-4">
                  <p className="text-sm text-muted-foreground">
                    {orders.length} de {totalCount.toLocaleString("pt-BR")} OSs — página {page} de {totalPages}
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={page <= 1}
                    >
                      <ChevronLeft className="mr-1 h-4 w-4" />
                      Anterior
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                      disabled={page >= totalPages}
                    >
                      Próxima
                      <ChevronRight className="ml-1 h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </CardContent>
      </Card>

      {/* Action Dialogs */}
      <Dialog open={activeDialog === "edit"} onOpenChange={() => handleCloseDialog()}>
        {selectedOrderId && <EditOrderDialog orderId={selectedOrderId} onClose={handleCloseDialog} />}
      </Dialog>

      <Dialog open={activeDialog === "transfer"} onOpenChange={() => handleCloseDialog()}>
        {selectedOrderId && (
          <TransferTechniciansDialog 
            orderId={selectedOrderId} 
            onClose={handleCloseDialog}
          />
        )}
      </Dialog>

      <Dialog open={activeDialog === "view"} onOpenChange={() => handleCloseDialog()}>
        {selectedOrderId && <ViewOrderDetailsDialog orderId={selectedOrderId} />}
      </Dialog>

      {selectedOrderId && (
        <ScheduleReturnDialog
          orderId={selectedOrderId}
          orderNumber={selectedOrderNumber}
          open={activeDialog === "return"}
          onClose={handleCloseDialog}
        />
      )}

      <Dialog open={activeDialog === "measurement"} onOpenChange={() => handleCloseDialog()}>
        {selectedOrderId && <MeasurementDialog serviceOrderId={selectedOrderId} onClose={handleCloseDialog} />}
      </Dialog>
    </div>
  );
};

export default ServiceOrders;
