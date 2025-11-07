import { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useForm } from "react-hook-form";
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
import { Card, CardContent } from "@/components/ui/card";
import { MoreHorizontal, Plus, Loader2, Download } from "lucide-react";
import { exportToCSV, formatDateForExport } from "@/lib/exportUtils";
import { format } from "date-fns";
import { NewOrderDialog } from "@/components/admin/orders/NewOrderDialog";
import { Input } from "@/components/ui/input";
import { EditOrderDialog } from "@/components/admin/orders/EditOrderDialog";
import { TransferTechniciansDialog } from "@/components/admin/orders/TransferTechniciansDialog";
import { ViewOrderDetailsDialog } from "@/components/admin/orders/ViewOrderDetailsDialog";
import { Badge } from "@/components/ui/badge";
import { useServiceOrders } from "@/hooks/useServiceOrders";
import { useDebounce } from "@/hooks/useDebounce";

type FormData = {
  orderNumber: string;
};

const ServiceOrders = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { orders, isLoading, invalidate } = useServiceOrders();
  const [vessel, setVessel] = useState("");
  const [status, setStatus] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 300);
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [activeDialog, setActiveDialog] = useState<"edit" | "transfer" | "view" | null>(null);
  const form = useForm<FormData>();

  const filteredOrders = useMemo(() => {
    return orders.filter((order) => {
      const matchesSearch = 
        order.orderNumber.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        order.vessel.toLowerCase().includes(debouncedSearch.toLowerCase()) ||
        order.client.toLowerCase().includes(debouncedSearch.toLowerCase());

      const matchesVessel = !vessel || order.vessel === vessel;
      const matchesStatus = !status || order.status === status;

      return matchesSearch && matchesVessel && matchesStatus;
    });
  }, [orders, debouncedSearch, vessel, status]);

  const handleAction = (action: "edit" | "transfer" | "view", orderId: string) => {
    setSelectedOrderId(orderId);
    setActiveDialog(action);
  };

  const handleCloseDialog = () => {
    setSelectedOrderId(null);
    setActiveDialog(null);
    invalidate();
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { label: string; variant: any }> = {
      pending: { label: "Pendente", variant: "secondary" },
      in_progress: { label: "Em Andamento", variant: "default" },
      completed: { label: "Concluído", variant: "outline" },
    };

    const config = statusConfig[status] || { label: status, variant: "secondary" };
    return <Badge variant={config.variant}>{config.label}</Badge>;
  };

  const handleExport = () => {
    try {
      const exportData = filteredOrders.map(order => ({
        numeroOS: order.orderNumber,
        cliente: order.client,
        embarcacao: order.vessel,
        status: order.status === "pending" ? "Pendente" : 
                order.status === "in_progress" ? "Em Andamento" : "Concluído",
        dataAgendada: order.scheduledDate ? formatDateForExport(order.scheduledDate) : "-",
        dataCriacao: formatDateForExport(order.createdAt),
      }));

      const headers = {
        numeroOS: "Número da OS",
        cliente: "Cliente",
        embarcacao: "Embarcação",
        status: "Status",
        dataAgendada: "Data Agendada",
        dataCriacao: "Data de Criação",
      };

      exportToCSV(exportData, `ordens-servico-${new Date().toISOString().split('T')[0]}`, headers);
      
      toast({
        title: "Exportação concluída",
        description: `${exportData.length} ordens de serviço exportadas com sucesso`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao exportar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Ordens de Serviço</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={filteredOrders.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          <Dialog>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Nova OS
              </Button>
            </DialogTrigger>
            <NewOrderDialog form={form} />
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
                <SelectItem value="">Todas</SelectItem>
                {Array.from(new Set(orders.map(o => o.vessel))).map(v => (
                  <SelectItem key={v} value={v}>{v}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="">Todos</SelectItem>
                <SelectItem value="pending">Pendente</SelectItem>
                <SelectItem value="in_progress">Em Andamento</SelectItem>
                <SelectItem value="completed">Concluído</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número da OS</TableHead>
                  <TableHead>Cliente</TableHead>
                  <TableHead>Embarcação</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data Agendada</TableHead>
                  <TableHead>Data de Criação</TableHead>
                  <TableHead className="w-[70px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.length === 0 ? (
                  <TableRow>
                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                      Nenhuma ordem de serviço encontrada
                    </TableCell>
                  </TableRow>
                ) : (
                  filteredOrders.map((order) => (
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
                      <TableCell>{order.client}</TableCell>
                      <TableCell>{order.vessel}</TableCell>
                      <TableCell>{getStatusBadge(order.status)}</TableCell>
                      <TableCell>
                        {order.scheduledDate ? format(new Date(order.scheduledDate), "dd/MM/yyyy") : "-"}
                      </TableCell>
                      <TableCell>
                        {format(new Date(order.createdAt), "dd/MM/yyyy")}
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
                              Visualizar Detalhes
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAction("edit", order.id)}>
                              Editar
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleAction("transfer", order.id)}>
                              Transferir Técnicos
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                )}
              </TableBody>
            </Table>
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
    </div>
  );
};

export default ServiceOrders;
