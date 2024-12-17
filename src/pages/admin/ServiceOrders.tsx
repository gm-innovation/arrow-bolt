import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
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
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { MoreHorizontal, Plus, Download } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

const ServiceOrders = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [date, setDate] = useState<Date>();
  const [vessel, setVessel] = useState("");
  const [technician, setTechnician] = useState("");
  const [status, setStatus] = useState("");

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

  const handleCreateOrder = () => {
    toast({
      title: "Nova OS",
      description: "Funcionalidade em desenvolvimento",
    });
  };

  const handleExport = () => {
    toast({
      title: "Exportar",
      description: "Funcionalidade em desenvolvimento",
    });
  };

  const handleAction = (action: string, orderId: string) => {
    toast({
      title: action,
      description: `${action} OS ${orderId}`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Ordens de Serviço</h2>
        <div className="flex gap-2">
          <Button onClick={handleCreateOrder}>
            <Plus className="mr-2 h-4 w-4" />
            Nova OS
          </Button>
          <Button variant="outline" onClick={handleExport}>
            <Download className="mr-2 h-4 w-4" />
            Exportar Lista
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label>Data</label>
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                locale={ptBR}
              />
            </div>
            <div className="space-y-2">
              <label>Embarcação</label>
              <Select value={vessel} onValueChange={setVessel}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="navio1">Navio Alfa</SelectItem>
                  <SelectItem value="navio2">Navio Beta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label>Técnico</label>
              <Select value={technician} onValueChange={setTechnician}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tech1">João Silva</SelectItem>
                  <SelectItem value="tech2">Maria Santos</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label>Status</label>
              <Select value={status} onValueChange={setStatus}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="planned">Planejado</SelectItem>
                  <SelectItem value="in_progress">Em Andamento</SelectItem>
                  <SelectItem value="completed">Finalizado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
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
              {serviceOrders.map((order) => (
                <TableRow key={order.id}>
                  <TableCell className="font-medium">
                    <Button variant="link" className="p-0">
                      {order.id}
                    </Button>
                  </TableCell>
                  <TableCell>{order.vessel}</TableCell>
                  <TableCell>{order.techn

icians.join(", ")}</TableCell>
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
                        <DropdownMenuItem
                          onClick={() => handleAction("Editar", order.id)}
                        >
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleAction("Transferir", order.id)}
                        >
                          Transferir Técnicos
                        </DropdownMenuItem>
                        <DropdownMenuItem
                          onClick={() => handleAction("Visualizar", order.id)}
                        >
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
    </div>
  );
};

export default ServiceOrders;