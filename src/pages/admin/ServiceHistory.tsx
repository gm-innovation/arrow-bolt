import { useState } from "react";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Download, Eye } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ServiceHistory = () => {
  const [date, setDate] = useState<Date>();
  const [vessel, setVessel] = useState("");
  const [technician, setTechnician] = useState("");
  const [status, setStatus] = useState("");
  const { toast } = useToast();

  const handleViewDetails = (serviceId: string) => {
    toast({
      title: "Visualizar Detalhes",
      description: `Visualizando detalhes do serviço ${serviceId}`,
    });
  };

  const handleExportReport = (serviceId: string) => {
    toast({
      title: "Exportar Relatório",
      description: `Exportando relatório do serviço ${serviceId}`,
    });
  };

  // Mock data - replace with real data later
  const services = [
    {
      id: "OS001",
      vessel: "Navio Alfa",
      technicians: ["João Silva"],
      status: "Concluído",
      createdAt: "2024-03-15",
    },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">Histórico de Serviços</h2>

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
                className="rounded-md border"
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
                  <SelectItem value="completed">Concluído</SelectItem>
                  <SelectItem value="in_progress">Em Andamento</SelectItem>
                  <SelectItem value="pending">Pendente</SelectItem>
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
                <TableHead>Número OS</TableHead>
                <TableHead>Embarcação</TableHead>
                <TableHead>Técnicos</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data de Criação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {services.map((service) => (
                <TableRow key={service.id}>
                  <TableCell>{service.id}</TableCell>
                  <TableCell>{service.vessel}</TableCell>
                  <TableCell>{service.technicians.join(", ")}</TableCell>
                  <TableCell>{service.status}</TableCell>
                  <TableCell>{service.createdAt}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleViewDetails(service.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleExportReport(service.id)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
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

export default ServiceHistory;