import { DashboardStats } from "@/components/admin/dashboard/DashboardStats";
import { DashboardCharts } from "@/components/admin/dashboard/DashboardCharts";
import { ServiceCalendar } from "@/components/admin/calendar/ServiceCalendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Dialog } from "@/components/ui/dialog";
import { NewOrderDialog } from "@/components/admin/orders/NewOrderDialog";
import { useForm } from "react-hook-form";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);
  const [isCalendarExpanded, setIsCalendarExpanded] = useState(false);
  const [isCalendarFullscreen, setIsCalendarFullscreen] = useState(false);
  const form = useForm<{ orderNumber: string }>({
    defaultValues: {
      orderNumber: "",
    },
  });

  const handleCreateOS = () => {
    setIsNewOrderOpen(true);
  };

  const handleApproveReports = () => {
    navigate("/admin/reports");
    toast({
      title: "Aprovar Relatórios",
      description: "Redirecionando para a página de relatórios pendentes",
      duration: 3000,
    });
  };

  const handleManageTechnicians = () => {
    navigate("/admin/technicians");
    toast({
      title: "Gerenciar Técnicos",
      description: "Redirecionando para a página de gerenciamento de técnicos",
      duration: 3000,
    });
  };

  return (
    <div className="space-y-6">
      {!isCalendarFullscreen && (
        <>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 sm:gap-0">
            <h1 className="text-2xl sm:text-3xl font-bold">Dashboard</h1>
            <div className="flex flex-col sm:flex-row gap-2 sm:gap-4 w-full sm:w-auto">
              <Button onClick={handleCreateOS} className="w-full sm:w-auto">
                <PlusCircle className="mr-2 h-4 w-4" />
                Nova OS
              </Button>
              <Button variant="outline" onClick={handleApproveReports} className="w-full sm:w-auto">
                <FileText className="mr-2 h-4 w-4" />
                Aprovar Relatórios
              </Button>
            </div>
          </div>

          {!isCalendarExpanded && <DashboardStats />}
        </>
      )}
      
      <Card className={isCalendarFullscreen ? "h-screen" : "card-responsive overflow-visible"}>
        {!isCalendarFullscreen && (
          <CardHeader>
            <CardTitle>Agenda de Serviços</CardTitle>
          </CardHeader>
        )}
        <CardContent className="overflow-visible p-0 sm:p-6">
          <ServiceCalendar 
            isExpanded={isCalendarExpanded}
            onToggleExpanded={() => setIsCalendarExpanded(!isCalendarExpanded)}
            isFullscreen={isCalendarFullscreen}
            onToggleFullscreen={() => setIsCalendarFullscreen(!isCalendarFullscreen)}
          />
        </CardContent>
      </Card>

      {!isCalendarExpanded && !isCalendarFullscreen && <DashboardCharts />}

      <Dialog open={isNewOrderOpen} onOpenChange={setIsNewOrderOpen}>
        <NewOrderDialog form={form} />
      </Dialog>
    </div>
  );
};

export default AdminDashboard;
