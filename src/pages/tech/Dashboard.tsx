import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { 
  ClipboardCheck, 
  Clock, 
  Star, 
  Plus, 
  Bell,
  FileText,
  HelpCircle 
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

// Mock data for the productivity chart
const productivityData = [
  { name: "Seg", tasks: 4 },
  { name: "Ter", tasks: 3 },
  { name: "Qua", tasks: 5 },
  { name: "Qui", tasks: 2 },
  { name: "Sex", tasks: 4 },
];

const TechDashboard = () => {
  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">Dashboard do Técnico</h1>
        <Button variant="outline" className="gap-2">
          <Bell className="h-4 w-4" />
          <span className="bg-red-500 text-white rounded-full px-2 py-0.5 text-xs">3</span>
        </Button>
      </div>

      {/* Personal Indicators */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tarefas Atribuídas</CardTitle>
            <ClipboardCheck className="h-4 w-4 text-navy-bright" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">5</div>
            <p className="text-xs text-muted-foreground">2 alta prioridade</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Tarefas Concluídas</CardTitle>
            <Clock className="h-4 w-4 text-green-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">12</div>
            <p className="text-xs text-muted-foreground">esta semana</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Horas Trabalhadas</CardTitle>
            <Clock className="h-4 w-4 text-navy-bright" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">32h</div>
            <p className="text-xs text-muted-foreground">esta semana</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Avaliação</CardTitle>
            <Star className="h-4 w-4 text-yellow-500" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">4.8</div>
            <p className="text-xs text-muted-foreground">média de satisfação</p>
          </CardContent>
        </Card>
      </div>

      {/* Productivity Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Produtividade Semanal</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={productivityData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="tasks" fill="#2C74B3" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="pt-6">
            <Button className="w-full gap-2" onClick={() => console.log("Ver tarefas")}>
              <ClipboardCheck className="h-4 w-4" />
              Ver Tarefas Atribuídas
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Button className="w-full gap-2" onClick={() => console.log("Preencher relatório")}>
              <FileText className="h-4 w-4" />
              Preencher Relatório
            </Button>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-6">
            <Button className="w-full gap-2" variant="outline" onClick={() => console.log("Solicitar suporte")}>
              <HelpCircle className="h-4 w-4" />
              Solicitar Suporte
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Recent Notifications */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <CardTitle>Notificações Recentes</CardTitle>
          <Button variant="ghost" size="sm" className="gap-2">
            <Bell className="h-4 w-4" />
            Ver Todas
          </Button>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex items-start gap-4 p-2 rounded-lg hover:bg-slate-50">
              <div className="bg-blue-100 p-2 rounded-full">
                <Plus className="h-4 w-4 text-blue-600" />
              </div>
              <div>
                <h4 className="text-sm font-semibold">Nova tarefa atribuída</h4>
                <p className="text-sm text-muted-foreground">
                  Manutenção preventiva - Navio Alfa
                </p>
                <span className="text-xs text-muted-foreground">Há 30 minutos</span>
              </div>
            </div>
            <div className="flex items-start gap-4 p-2 rounded-lg hover:bg-slate-50">
              <div className="bg-green-100 p-2 rounded-full">
                <FileText className="h-4 w-4 text-green-600" />
              </div>
              <div>
                <h4 className="text-sm font-semibold">Relatório aprovado</h4>
                <p className="text-sm text-muted-foreground">
                  OS #123 - Navio Beta
                </p>
                <span className="text-xs text-muted-foreground">Há 2 horas</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TechDashboard;