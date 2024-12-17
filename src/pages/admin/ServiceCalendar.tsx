import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Plus, Edit2, UserPlus } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

const ServiceCalendar = () => {
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [vessel, setVessel] = useState("");
  const [technician, setTechnician] = useState("");
  const [serviceType, setServiceType] = useState("");
  const { toast } = useToast();

  const handleCreateService = () => {
    toast({
      title: "Criar Serviço",
      description: "Funcionalidade em desenvolvimento",
    });
  };

  const handleEditService = () => {
    toast({
      title: "Editar Serviço",
      description: "Funcionalidade em desenvolvimento",
    });
  };

  const handleTransferTechnician = () => {
    toast({
      title: "Transferir Técnico",
      description: "Funcionalidade em desenvolvimento",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Agenda de Serviços</h2>
        <div className="flex gap-2">
          <Button onClick={handleCreateService}>
            <Plus className="mr-2 h-4 w-4" />
            Novo Serviço
          </Button>
          <Button variant="outline" onClick={handleEditService}>
            <Edit2 className="mr-2 h-4 w-4" />
            Editar
          </Button>
          <Button variant="ghost" onClick={handleTransferTechnician}>
            <UserPlus className="mr-2 h-4 w-4" />
            Transferir Técnico
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="md:col-span-3">
          <CardHeader>
            <CardTitle>Calendário</CardTitle>
          </CardHeader>
          <CardContent>
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border"
            />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Filtros</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
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
              <label>Tipo de Serviço</label>
              <Select value={serviceType} onValueChange={setServiceType}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="maintenance">Manutenção</SelectItem>
                  <SelectItem value="repair">Reparo</SelectItem>
                  <SelectItem value="inspection">Inspeção</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default ServiceCalendar;