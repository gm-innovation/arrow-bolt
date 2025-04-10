
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ChartContainer, ChartTooltip } from "@/components/ui/chart";
import { Building2, Users, ClipboardList, Bell, PlusCircle, CreditCard, Settings, Eye } from "lucide-react";
import { Area, AreaChart, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";

// Mock data - replace with real data when backend is integrated
const companyGrowthData = [
  { month: 'Jan', companies: 10 },
  { month: 'Feb', companies: 15 },
  { month: 'Mar', companies: 18 },
  { month: 'Apr', companies: 25 },
];

const systemUsageData = [
  { month: 'Jan', orders: 150, technicians: 20 },
  { month: 'Feb', orders: 200, technicians: 25 },
  { month: 'Mar', orders: 280, technicians: 30 },
  { month: 'Apr', orders: 342, technicians: 35 },
];

const notifications = [
  { id: 1, message: "New company registered: Marine Tech", time: "2 hours ago" },
  { id: 2, message: "Subscription updated: Ocean Services", time: "5 hours ago" },
  { id: 3, message: "Payment overdue: Sea Solutions", time: "1 day ago" },
];

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const handleNewCompany = () => {
    navigate("/super-admin/companies");
    toast({
      title: "Nova Empresa",
      description: "Redirecionando para o formulário de nova empresa",
    });
  };

  const handleManageSubscriptions = () => {
    navigate("/super-admin/subscriptions");
    toast({
      title: "Gerenciar Assinaturas",
      description: "Redirecionando para gestão de assinaturas",
    });
  };

  const handleSettings = () => {
    navigate("/super-admin/settings");
    toast({
      title: "Configurações",
      description: "Redirecionando para configurações do sistema",
    });
  };

  const handleViewDetails = (notificationId: number) => {
    toast({
      title: "Ver Detalhes",
      description: "Detalhes da notificação serão implementados em breve",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
        <h1 className="text-2xl sm:text-3xl font-bold">Dashboard Global</h1>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
          <Button onClick={handleNewCompany} className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nova Empresa
          </Button>
          <Button variant="outline" onClick={handleManageSubscriptions} className="w-full sm:w-auto">
            <CreditCard className="mr-2 h-4 w-4" />
            Gerenciar Assinaturas
          </Button>
          <Button variant="ghost" onClick={handleSettings} className="w-full sm:w-auto">
            <Settings className="mr-2 h-4 w-4" />
            Configurações
          </Button>
        </div>
      </div>
      
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de Empresas</CardTitle>
            <Building2 className="h-4 w-4 text-navy-bright" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">25</div>
            <p className="text-xs text-muted-foreground">+2 desde o último mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Usuários Ativos</CardTitle>
            <Users className="h-4 w-4 text-navy-bright" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">1,234</div>
            <p className="text-xs text-muted-foreground">+15% desde o último mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Total de OS</CardTitle>
            <ClipboardList className="h-4 w-4 text-navy-bright" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">342</div>
            <p className="text-xs text-muted-foreground">+5% desde o último mês</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Notificações</CardTitle>
            <Bell className="h-4 w-4 text-navy-bright" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">7</div>
            <p className="text-xs text-muted-foreground">Novas notificações</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="card-responsive">
          <CardHeader>
            <CardTitle>Crescimento de Empresas</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ChartContainer config={{
                companies: { theme: { light: "#2C74B3", dark: "#144272" } }
              }}>
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={companyGrowthData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-sm">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="font-medium">Empresas:</div>
                              <div>{payload[0].value}</div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }} />
                    <Area
                      type="monotone"
                      dataKey="companies"
                      stroke="var(--color-companies)"
                      fill="var(--color-companies)"
                      fillOpacity={0.2}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="card-responsive">
          <CardHeader>
            <CardTitle>Uso do Sistema</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="h-[300px]">
              <ChartContainer config={{
                orders: { theme: { light: "#2C74B3", dark: "#144272" } },
                technicians: { theme: { light: "#205295", dark: "#0A2647" } }
              }}>
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={systemUsageData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="month" />
                    <YAxis />
                    <Tooltip content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border bg-background p-2 shadow-sm">
                            <div className="grid grid-cols-2 gap-2">
                              <div className="font-medium">OS:</div>
                              <div>{payload[0].value}</div>
                              <div className="font-medium">Técnicos:</div>
                              <div>{payload[1].value}</div>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }} />
                    <Bar dataKey="orders" fill="var(--color-orders)" />
                    <Bar dataKey="technicians" fill="var(--color-technicians)" />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Notificações Recentes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-lg border bg-card gap-3"
              >
                <div>
                  <p className="text-sm font-medium">{notification.message}</p>
                  <p className="text-xs text-muted-foreground">{notification.time}</p>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm"
                  className="w-full sm:w-auto"
                  onClick={() => handleViewDetails(notification.id)}
                >
                  <Eye className="mr-2 h-4 w-4" />
                  Ver Detalhes
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminDashboard;
