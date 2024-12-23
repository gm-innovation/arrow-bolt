import { useParams, useNavigate } from "react-router-dom";
import { Ship, Calendar, Clock, User } from "lucide-react";
import { format } from "date-fns";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { AdminInfo } from "@/components/tech/tasks/AdminInfo";

// Mock data - replace with real API call
const mockTask = {
  id: "OS001",
  vesselName: "Navio Alpha",
  description: "Manutenção preventiva do motor principal",
  startDate: new Date(),
  endDate: new Date(),
  status: "waiting",
  technicians: ["João Silva", "Maria Santos"],
  adminNotes: "Verificar níveis de óleo e realizar limpeza dos filtros.",
  taskType: {
    name: "Manutenção Preventiva de Motor",
    tools: [
      { name: "Chave de fenda", quantity: 2 },
      { name: "Alicate", quantity: 1 },
      { name: "Kit de medição", quantity: 1 }
    ],
    steps: [
      { order: 1, description: "Verificar níveis de óleo" },
      { order: 2, description: "Limpar filtros" },
      { order: 3, description: "Testar funcionamento" }
    ],
    photoLabels: [
      { id: "1", description: "Estado inicial do motor" },
      { id: "2", description: "Filtros removidos" },
      { id: "3", description: "Filtros limpos" },
      { id: "4", description: "Estado final do motor" }
    ]
  }
};

const TaskDetails = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleStartTask = async () => {
    try {
      // TODO: Replace with actual API call
      // await startTask(taskId);
      
      toast({
        title: "Tarefa iniciada",
        description: `A tarefa ${taskId} foi iniciada com sucesso.`,
      });

      // Refresh the page or update the task status
      window.location.reload();
    } catch (error) {
      toast({
        title: "Erro ao iniciar tarefa",
        description: "Ocorreu um erro ao tentar iniciar a tarefa. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">
          Detalhes da Tarefa - {taskId}
        </h2>
        <Button onClick={() => navigate("/tech/tasks")}>Voltar</Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Informações da Embarcação</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center gap-2">
              <Ship className="h-4 w-4" />
              <span className="font-medium">Nome:</span>
              {mockTask.vesselName}
            </div>
            <div>
              <span className="font-medium">Descrição do Serviço:</span>
              <p className="mt-1">{mockTask.description}</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">Início:</span>
                {format(mockTask.startDate, "dd/MM/yyyy")}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {format(mockTask.startDate, "HH:mm")}
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4" />
                <span className="font-medium">Término Previsto:</span>
                {format(mockTask.endDate, "dd/MM/yyyy")}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4" />
                {format(mockTask.endDate, "HH:mm")}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Equipe e Observações</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <span className="font-medium">Técnicos Designados:</span>
              <div className="mt-2 space-y-2">
                {mockTask.technicians.map((tech) => (
                  <div key={tech} className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    {tech}
                  </div>
                ))}
              </div>
            </div>
            <div>
              <span className="font-medium">Observações do Admin:</span>
              <p className="mt-1 p-4 bg-muted rounded-lg">
                {mockTask.adminNotes}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      <AdminInfo taskType={mockTask.taskType} />

      <Card>
        <CardContent className="pt-6">
          <div className="flex justify-center">
            {mockTask.status === "waiting" && (
              <Button size="lg" onClick={handleStartTask}>
                Iniciar Tarefa
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TaskDetails;