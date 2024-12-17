import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { 
  ClipboardList, 
  CheckCircle, 
  AlertCircle, 
  FileText, 
  PlusCircle, 
  UserCheck,
  Clock
} from "lucide-react";
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  LineChart,
  Line
} from 'recharts';
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";

// Mock data - replace with real data when backend is integrated
const techTasksData = [
  { name: 'João Silva', tasks: 12 },
  { name: 'Maria Santos', tasks: 8 },
  { name: 'Pedro Lima', tasks: 15 },
  { name: 'Ana Costa', tasks: 10 },
];

const completionTimeData = [
  { date: '01/03', time: 4.5 },
  { date: '02/03', time: 3.8 },
  { date: '03/03', time: 5.2 },
  { date: '04/03', time: 4.0 },
  { date: '05/03', time: 3.5 },
];

const recentActivities = [
  {
    id: 1,
    type: 'OS Criada',
    description: 'Nova OS #123 - Manutenção Preventiva',
    time: '10 minutos atrás'
  },
  {
    id: 2,
    type: 'Serviço Concluído',
    description: 'OS #120 finalizada por João Silva',
    time: '30 minutos atrás'
  },
  {
    id: 3,
    type: 'Transferência',
    description: 'OS #118 transferida para Maria Santos',
    time: '1 hora atrás'
  },
];

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleCreateOS = () => {
    navigate("/admin/orders/new");
    toast({
      title: "Nova OS",
      description: "Redirecionando para criação de OS",
    });
  };

  const handleApproveReports = () => {
    navigate("/admin/reports/pending");
    toast({
      title: "Aprovar Relatórios",
      description: "Redirecionando para relatórios pendentes",
    });
  };

  const handleTransferService = () => {
    navigate("/admin/transfers");
    toast({
      title: "Transferir Serviço",
      description: "Redirecionando para transferências",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex gap-4">
          <Button onClick={handleCreateOS}>
            <PlusCircle className="mr-2 h-4 w-4" />
            Nova OS
          </Button>
          <Button variant="outline" onClick={handleApproveReports}>
            <FileText className="mr-2 h-4 w-4" />
            Aprovar Relatórios
          </Button>
          <Button variant="ghost" onClick={handleTransferService}>
            <UserCheck className="mr-2 h-4 w-4" />
            Transferir Serviço
          </Button>
        </div>
      </div>

      {/* Performance Indicators */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">OS Abertas</CardTitle>
            <ClipboardList className="h-4 w-4 text-navy-bright" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">42</div>
            <p className="text-xs text-muted-foreground">
              +8% em relação ao mês anterior
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">OS Finalizadas</CardTitle>
            <CheckCircle className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">128</div>
            <p className="text-xs text-muted-foreground">
              Últimos 30 dias
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">OS Pendentes</CardTitle>
            <AlertCircle className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">15</div>
            <p className="text-xs text-muted-foreground">
              Aguardando aprovação
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Relatórios Pendentes</CardTitle>
            <FileText className="h-4 w-4 text-orange-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7</div>
            <p className="text-xs text-muted-foreground">
              Necessitam revisão
            </p>
          </CardContent>
        </Card>
      </div>

      {/* Performance Charts */}
      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Tarefas por Técnico</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ChartContainer>
                <BarChart data={techTasksData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="name" />
                  <YAxis />
                  <Tooltip />
                  <Bar dataKey="tasks" fill="#1e3a8a" />
                </BarChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Tempo Médio de Conclusão (horas)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ChartContainer>
                <LineChart data={completionTimeData}>
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis dataKey="date" />
                  <YAxis />
                  <Tooltip />
                  <Line 
                    type="monotone" 
                    dataKey="time" 
                    stroke="#1e3a8a" 
                    strokeWidth={2}
                  />
                </LineChart>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Activities */}
      <Card>
        <CardHeader>
          <CardTitle>Últimas Atividades</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentActivities.map((activity) => (
              <div
                key={activity.id}
                className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0"
              >
                <div className="space-y-1">
                  <p className="text-sm font-medium">{activity.type}</p>
                  <p className="text-sm text-muted-foreground">
                    {activity.description}
                  </p>
                </div>
                <div className="flex items-center">
                  <Clock className="mr-2 h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {activity.time}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminDashboard;