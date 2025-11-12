import { useParams, useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { ServiceOrderInfo } from "@/components/tech/tasks/ServiceOrderInfo";
import { AdminInfo } from "@/components/tech/tasks/AdminInfo";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { format } from "date-fns";
import { Calendar, Clock, History } from "lucide-react";
import { NewContinuationVisitButton } from "@/components/tech/NewContinuationVisitButton";
import { VisitHistoryTimeline } from "@/components/tech/VisitHistoryTimeline";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";

const mockServiceOrder = {
  id: "OS001",
  scheduledDate: new Date("2024-03-20T14:30:00"),
  location: "Porto de Santos - Berço 123",
  access: "Terminal 4, Portão B - Apresentar-se na guarita principal",
  requester: {
    name: "João Silva",
    role: "Gerente de Manutenção",
  },
  supervisor: {
    name: "Carlos Supervisor",
  },
  team: {
    leadTechnician: "Roberto Santos",
    assistants: ["Maria Técnica", "José Auxiliar"],
  },
  tasks: [
    {
      id: "T1",
      name: "Manutenção preventiva do motor principal",
      description: "Verificar níveis de óleo e realizar limpeza dos filtros",
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
    }
  ]
};

const TaskDetails = () => {
  const { taskId } = useParams();
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleStartTask = async () => {
    try {
      toast({
        title: "Tarefa iniciada",
        description: `A tarefa ${taskId} foi iniciada com sucesso.`,
      });
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
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Ordem de Serviço - {mockServiceOrder.id}
          </h2>
          <div className="flex items-center gap-4 mt-2 text-muted-foreground">
            <div className="flex items-center gap-2">
              <Calendar className="h-4 w-4" />
              {format(mockServiceOrder.scheduledDate, "dd/MM/yyyy")}
            </div>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4" />
              {format(mockServiceOrder.scheduledDate, "HH:mm")}
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="outline">
                <History className="mr-2 h-4 w-4" />
                Histórico
              </Button>
            </SheetTrigger>
            <SheetContent>
              <SheetHeader>
                <SheetTitle>Histórico de Visitas</SheetTitle>
              </SheetHeader>
              <div className="mt-6">
                <VisitHistoryTimeline serviceOrderId={mockServiceOrder.id} />
              </div>
            </SheetContent>
          </Sheet>
          <NewContinuationVisitButton serviceOrderId={mockServiceOrder.id} />
          <Button onClick={() => navigate("/tech/tasks")}>Voltar</Button>
        </div>
      </div>

      <ServiceOrderInfo
        location={mockServiceOrder.location}
        access={mockServiceOrder.access}
        requester={mockServiceOrder.requester}
        supervisor={mockServiceOrder.supervisor}
        team={mockServiceOrder.team}
      />

      <Tabs defaultValue={mockServiceOrder.tasks[0].id} className="space-y-6">
        <TabsList>
          {mockServiceOrder.tasks.map((task) => (
            <TabsTrigger key={task.id} value={task.id}>
              {task.name}
            </TabsTrigger>
          ))}
        </TabsList>

        {mockServiceOrder.tasks.map((task) => (
          <TabsContent key={task.id} value={task.id}>
            <div className="space-y-6">
              <Card>
                <CardContent className="pt-6">
                  <p className="text-lg">{task.description}</p>
                </CardContent>
              </Card>

              <AdminInfo taskType={task.taskType} />

              <Card>
                <CardContent className="pt-6">
                  <div className="flex justify-center">
                    <Button size="lg" onClick={handleStartTask}>
                      Iniciar Tarefa
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>
        ))}
      </Tabs>
    </div>
  );
};

export default TaskDetails;