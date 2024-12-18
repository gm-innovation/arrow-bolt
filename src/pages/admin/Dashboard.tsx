import { DashboardStats } from "@/components/admin/dashboard/DashboardStats";
import { DashboardCharts } from "@/components/admin/dashboard/DashboardCharts";
import { ServiceCalendar } from "@/components/admin/calendar/ServiceCalendar";
import { Button } from "@/components/ui/button";
import { PlusCircle, FileText, UserCheck } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";

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

      <DashboardStats />
      
      <Card>
        <CardHeader>
          <CardTitle>Agenda de Serviços</CardTitle>
        </CardHeader>
        <CardContent>
          <ServiceCalendar />
        </CardContent>
      </Card>

      <DashboardCharts />
    </div>
  );
};

export default AdminDashboard;