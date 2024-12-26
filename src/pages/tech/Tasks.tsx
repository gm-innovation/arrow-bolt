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
    scheduledDate: new Date("2024-03-20T14:30:00"),
    status: "waiting", // waiting, in_progress, completed
  },
];

const Tasks = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [dateFilter, setDateFilter] = useState("");
  const [vesselFilter, setVesselFilter] = useState("");
  const [typeFilter, setTypeFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [tasks, setTasks] = useState(mockTasks);

  const handleStartTask = (taskId: string) => {
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId ? { ...task, status: "in_progress" } : task
      )
    );
    toast({
      title: "Tarefa iniciada",
      description: `A tarefa ${taskId} foi iniciada com sucesso.`,
    });
  };

  const handleFinishTask = (taskId: string) => {
    setTasks(prevTasks =>
      prevTasks.map(task =>
        task.id === taskId ? { ...task, status: "completed" } : task
      )
    );
    toast({
      title: "Tarefa finalizada",
      description: "Agora você pode criar o relatório da tarefa.",
    });
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

  const getStatusDisplay = (status: string) => {
    switch (status) {
      case "waiting":
        return {
          text: "Aguardando",
          className: "bg-yellow-100 text-yellow-800"
        };
      case "in_progress":
        return {
          text: "Em Andamento",
          className: "bg-blue-100 text-blue-800"
        };
      case "completed":
        return {
          text: "Finalizada",
          className: "bg-green-100 text-green-800"
        };
      default:
        return {
          text: status,
          className: "bg-gray-100 text-gray-800"
        };
    }
  };

  // ... keep existing code (filters section)

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
                <TableHead>Número OS</TableHead>
                <TableHead>Embarcação</TableHead>
                <TableHead>Descrição</TableHead>
                <TableHead>Data/Hora</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {tasks.map((task) => (
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
                    <div className="flex items-center gap-4">
                      <div className="flex items-center gap-2">
                        <Calendar className="h-4 w-4" />
                        {format(task.scheduledDate, "dd/MM/yyyy")}
                      </div>
                      <div className="flex items-center gap-2">
                        <Clock className="h-4 w-4" />
                        {format(task.scheduledDate, "HH:mm")}
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusDisplay(task.status).className}`}>
                      {getStatusDisplay(task.status).text}
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
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleFinishTask(task.id)}
                      >
                        Finalizar
                      </Button>
                    )}
                    {task.status === "completed" && (
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleCreateReport(task.id)}
                      >
                        Criar Relatório
                      </Button>
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
