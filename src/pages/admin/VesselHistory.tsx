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
import { Input } from "@/components/ui/input";
import { Plus, Eye, Edit } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const VesselHistory = () => {
  const [vesselName, setVesselName] = useState("");
  const [company, setCompany] = useState("");
  const [vesselType, setVesselType] = useState("");
  const [status, setStatus] = useState("");
  const { toast } = useToast();

  const handleCreateVessel = () => {
    toast({
      title: "Nova Embarcação",
      description: "Funcionalidade em desenvolvimento",
    });
  };

  const handleViewHistory = (vesselId: string) => {
    toast({
      title: "Histórico",
      description: `Visualizando histórico da embarcação ${vesselId}`,
    });
  };

  const handleEdit = (vesselId: string) => {
    toast({
      title: "Editar",
      description: `Editando embarcação ${vesselId}`,
    });
  };

  // Mock data - replace with real data later
  const vessels = [
    {
      id: "VESSEL001",
      name: "Navio Alfa",
      type: "Navio",
      company: "Empresa A",
      servicesCount: 15,
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">
          Histórico de Embarcações
        </h2>
        <Button onClick={handleCreateVessel}>
          <Plus className="mr-2 h-4 w-4" />
          Nova Embarcação
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label>Nome da Embarcação</label>
              <Input
                value={vesselName}
                onChange={(e) => setVesselName(e.target.value)}
                placeholder="Buscar por nome..."
              />
            </div>
            <div className="space-y-2">
              <label>Empresa</label>
              <Select value={company} onValueChange={setCompany}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="company1">Empresa A</SelectItem>
                  <SelectItem value="company2">Empresa B</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label>Tipo de Embarcação</label>
              <Select value={vesselType} onValueChange={setVesselType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ship">Navio</SelectItem>
                  <SelectItem value="platform">Plataforma</SelectItem>
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
                  <SelectItem value="active">Ativo</SelectItem>
                  <SelectItem value="inactive">Inativo</SelectItem>
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
                <TableHead>Nome</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Empresa</TableHead>
                <TableHead>Serviços Realizados</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {vessels.map((vessel) => (
                <TableRow key={vessel.id}>
                  <TableCell>{vessel.name}</TableCell>
                  <TableCell>{vessel.type}</TableCell>
                  <TableCell>{vessel.company}</TableCell>
                  <TableCell>{vessel.servicesCount}</TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleViewHistory(vessel.id)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(vessel.id)}
                    >
                      <Edit className="h-4 w-4" />
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

export default VesselHistory;