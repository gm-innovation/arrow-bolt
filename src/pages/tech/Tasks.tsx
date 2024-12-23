import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { format } from "date-fns";
import { Calendar, Ship, Clock } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";

// Mock data - replace with real API calls
const mockTasks = [
  {
    id: "OS001",
    vesselName: "Navio Alpha",
    description: "Manutenção preventiva do motor principal",
    startDate: new Date(),
    status: "waiting",
  },
];

const Tasks = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [dateFilter, setDateFilter] = useState("");
  const [vesselFilter, setVesselFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const handleStartTask = (taskId: string) => {
    toast({
      title: "Tarefa iniciada",
      description: `A tarefa ${taskId} foi iniciada com sucesso.`,
    });
  };

  const handleFinishTask = (taskId: string) => {
    toast({
      title: "Tarefa finalizada",
      description: "Você será redirecionado para preencher o relatório.",
    });
    navigate(`/tech/reports/new?taskId=${taskId}`);
  };

  const handleCreateReport = (taskId: string) => {
    navigate(`/tech/reports/new?taskId=${taskId}`);
  };

  const handleViewDetails = (taskId: string) => {
    navigate(`/tech/tasks/${taskId}`);
  };

  const handleRefreshTasks = () => {
    toast({
      title: "Lista atualizada",
      description: "A lista de tarefas foi atualizada com sucesso.",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Tarefas Atribuídas</h2>
        <Button onClick={handleRefreshTasks}>Atualizar Lista</Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <label>Data</label>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label>Embarcação</label>
              <Select value={vesselFilter} onValueChange={setVesselFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vessel1">Navio Alpha</SelectItem>
                  <SelectItem value="vessel2">Navio Beta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label>Tipo de Tarefa</label>
              <Select value={typeFilter} onValueChange={setTypeFilter}>
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
            <div className="space-y-2">
              <label>Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="waiting">Aguardando</SelectItem>
                  <SelectItem value="in_progress">Em Andamento</SelectItem>
                  <SelectItem value="finished">Finalizado</SelectItem>
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
                <TableHead>Descrição</TableHead>
                <TableHead>Data/Hora Início</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockTasks.map((task) => (
                <TableRow key={task.id}>
                  <TableCell>{task.id}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Ship className="h-4 w-4" />
                      {task.vesselName}
                    </div>
                  </TableCell>
                  <TableCell>{task.description}</TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      <Calendar className="h-4 w-4" />
                      {format(task.startDate, "dd/MM/yyyy")}
                      <Clock className="h-4 w-4 ml-2" />
                      {format(task.startDate, "HH:mm")}
                    </div>
                  </TableCell>
                  <TableCell>
                    <div
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${
                          task.status === "waiting"
                            ? "bg-yellow-100 text-yellow-800"
                            : task.status === "in_progress"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-green-100 text-green-800"
                        }`}
                    >
                      {task.status === "waiting"
                        ? "Aguardando"
                        : task.status === "in_progress"
                        ? "Em Andamento"
                        : "Finalizado"}
                    </div>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewDetails(task.id)}
                    >
                      Detalhes
                    </Button>
                    {task.status === "waiting" && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleStartTask(task.id)}
                      >
                        Iniciar
                      </Button>
                    )}
                    {task.status === "in_progress" && (
                      <>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleCreateReport(task.id)}
                        >
                          Criar Relatório
                        </Button>
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => handleFinishTask(task.id)}
                        >
                          Finalizar
                        </Button>
                      </>
                    )}
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

export default Tasks;