import { useState } from "react";
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
import { MoreHorizontal, Plus } from "lucide-react";
import { format } from "date-fns";
import { NewOrderDialog } from "@/components/admin/orders/NewOrderDialog";
import { Input } from "@/components/ui/input";
import { EditOrderDialog } from "@/components/admin/orders/EditOrderDialog";
import { TransferTechniciansDialog } from "@/components/admin/orders/TransferTechniciansDialog";
import { ViewOrderDetailsDialog } from "@/components/admin/orders/ViewOrderDetailsDialog";

type FormData = {
  orderNumber: string;
};

const ServiceOrders = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [vessel, setVessel] = useState("");
  const [technician, setTechnician] = useState("");
  const [status, setStatus] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
  const [activeDialog, setActiveDialog] = useState<"edit" | "transfer" | "view" | null>(null);
  const form = useForm<FormData>();

  // Mock data - replace with real data later
  const serviceOrders = [
    {
      id: "OS001",
      vessel: "Navio Alfa",
      technicians: ["João Silva", "Maria Santos"],
      status: "Planejado",
      createdAt: "2024-03-15",
    },
  ];

  const filteredOrders = serviceOrders.filter((order) => {
    const matchesSearch = 
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.vessel.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.technicians.some(tech => 
        tech.toLowerCase().includes(searchTerm.toLowerCase())
      );

    const matchesVessel = !vessel || order.vessel === vessel;
    const matchesTechnician = !technician || 
      order.technicians.some(tech => tech === technician);
    const matchesStatus = !status || order.status === status;

    return matchesSearch && matchesVessel && matchesTechnician && matchesStatus;
  });

  const handleAction = (action: "edit" | "transfer" | "view", orderId: string) => {
    setSelectedOrderId(orderId);
    setActiveDialog(action);
  };

  const handleCloseDialog = () => {
    setSelectedOrderId(null);
    setActiveDialog(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Ordens de Serviço</h2>
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

      <Card>
        <CardContent className="pt-6">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <Input 
              placeholder="Buscar OS, embarcação ou técnico..." 
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="md:col-span-2"
            />
            <Select value={vessel} onValueChange={setVessel}>
              <SelectTrigger>
                <SelectValue placeholder="Embarcação" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="navio1">Navio Alfa</SelectItem>
                <SelectItem value="navio2">Navio Beta</SelectItem>
              </SelectContent>
            </Select>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="planned">Planejado</SelectItem>
                <SelectItem value="in_progress">Em Andamento</SelectItem>
                <SelectItem value="completed">Finalizado</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número da OS</TableHead>
                <TableHead>Embarcação</TableHead>
                <TableHead>Técnicos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data de Criação</TableHead>
                <TableHead className="w-[70px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">
                    <Button 
                      variant="link" 
                      className="p-0" 
                      onClick={() => handleAction("view", order.id)}
                    >
                      {order.id}
                    </Button>
                  </TableCell>
                  <TableCell>{order.vessel}</TableCell>
                  <TableCell>{order.technicians.join(", ")}</TableCell>
                  <TableCell>{order.status}</TableCell>
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
                        <DropdownMenuItem onClick={() => handleAction("edit", order.id)}>
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAction("transfer", order.id)}>
                          Transferir Técnicos
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleAction("view", order.id)}>
                          Visualizar Detalhes
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Action Dialogs */}
      <Dialog open={activeDialog === "edit"} onOpenChange={() => handleCloseDialog()}>
        {selectedOrderId && <EditOrderDialog orderId={selectedOrderId} />}
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