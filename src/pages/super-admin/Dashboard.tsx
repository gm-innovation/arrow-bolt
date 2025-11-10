import { SuperAdminStats } from "@/components/super-admin/dashboard/SuperAdminStats";
import { SuperAdminCharts } from "@/components/super-admin/dashboard/SuperAdminCharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PlusCircle, CreditCard, Settings, Building2, AlertCircle } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useSuperAdminDashboard } from "@/hooks/useSuperAdminDashboard";

const SuperAdminDashboard = () => {
  const navigate = useNavigate();
  const { stats, companyGrowth, companyUsage, isLoading } = useSuperAdminDashboard();

  const handleNewCompany = () => {
    navigate("/super-admin/companies");
  };

  const handleManageSubscriptions = () => {
    navigate("/super-admin/subscriptions");
  };

  const handleSettings = () => {
    navigate("/super-admin/settings");
  };

  // Mock notifications - could be fetched from database in the future
  const notifications = [
    {
      id: 1,
      type: "new_company",
      message: "Nova empresa cadastrada",
      company: stats ? `Total: ${stats.totalCompanies}` : "Carregando...",
      time: "Hoje",
    },
    {
      id: 2,
      type: "payment",
      message: "Empresas com pagamento em dia",
      company: stats ? `${stats.activeCompanies} de ${stats.totalCompanies}` : "Carregando...",
      time: "Atualizado agora",
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold">Dashboard Global</h1>
          <p className="text-muted-foreground">Visão geral do sistema</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
          <Button onClick={handleNewCompany} className="w-full sm:w-auto">
            <PlusCircle className="mr-2 h-4 w-4" />
            Nova Empresa
          </Button>
          <Button variant="outline" onClick={handleManageSubscriptions} className="w-full sm:w-auto">
            <CreditCard className="mr-2 h-4 w-4" />
            Assinaturas
          </Button>
          <Button variant="ghost" onClick={handleSettings} className="w-full sm:w-auto">
            <Settings className="mr-2 h-4 w-4" />
            Configurações
          </Button>
        </div>
      </div>

      <SuperAdminStats stats={stats} isLoading={isLoading} />

      <SuperAdminCharts
        companyGrowth={companyGrowth}
        companyUsage={companyUsage}
        isLoading={isLoading}
      />

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-primary" />
            Resumo do Sistema
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {notifications.map((notification) => (
              <div
                key={notification.id}
                className="flex flex-col sm:flex-row sm:items-center sm:justify-between p-4 rounded-lg border bg-card gap-3"
              >
                <div className="flex items-start gap-3">
                  <Building2 className="h-5 w-5 text-muted-foreground mt-0.5" />
                  <div>
                    <p className="text-sm font-medium">{notification.message}</p>
                    <p className="text-sm text-muted-foreground">{notification.company}</p>
                  </div>
                </div>
                <span className="text-xs text-muted-foreground">{notification.time}</span>
              </div>
            ))}

            {!isLoading && stats && (
              <div className="p-4 rounded-lg border bg-muted/50">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div>
                    <p className="text-2xl font-bold text-primary">{stats.totalUsers}</p>
                    <p className="text-sm text-muted-foreground">Usuários Totais</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">{stats.totalServiceOrders}</p>
                    <p className="text-sm text-muted-foreground">Ordens de Serviço</p>
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-primary">
                      {stats.totalCompanies > 0 
                        ? Math.round((stats.activeCompanies / stats.totalCompanies) * 100) 
                        : 0}%
                    </p>
                    <p className="text-sm text-muted-foreground">Taxa de Pagamento</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default SuperAdminDashboard;
