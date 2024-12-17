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
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";

const ServiceTransfers = () => {
  const [selectedTechnician, setSelectedTechnician] = useState("");
  const [transferReason, setTransferReason] = useState("");
  const { toast } = useToast();

  const handleTransfer = () => {
    toast({
      title: "Transferência",
      description: "Transferência realizada com sucesso",
    });
  };

  // Mock data - replace with real data later
  const transfers = [
    {
      id: "OS001",
      vessel: "Navio Alfa",
      currentTechnician: "João Silva",
      status: "Em Andamento",
      createdAt: "2024-03-15",
    },
  ];

  return (
    <div className="space-y-6">
      <h2 className="text-3xl font-bold tracking-tight">
        Transferências de Serviço
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="md:col-span-2">
          <CardHeader>
            <CardTitle>Ordens de Serviço Disponíveis</CardTitle>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Número OS</TableHead>
                  <TableHead>Embarcação</TableHead>
                  <TableHead>Técnico Atual</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Data de Criação</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {transfers.map((transfer) => (
                  <TableRow key={transfer.id}>
                    <TableCell>{transfer.id}</TableCell>
                    <TableCell>{transfer.vessel}</TableCell>
                    <TableCell>{transfer.currentTechnician}</TableCell>
                    <TableCell>{transfer.status}</TableCell>
                    <TableCell>{transfer.createdAt}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Realizar Transferência</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label>Novo Técnico Responsável</label>
              <Select
                value={selectedTechnician}
                onValueChange={setSelectedTechnician}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="tech1">Maria Santos</SelectItem>
                  <SelectItem value="tech2">Pedro Lima</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <label>Motivo da Transferência</label>
              <Textarea
                value={transferReason}
                onChange={(e) => setTransferReason(e.target.value)}
                placeholder="Descreva o motivo da transferência..."
              />
            </div>

            <Button className="w-full" onClick={handleTransfer}>
              Confirmar Transferência
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ServiceTransfers;