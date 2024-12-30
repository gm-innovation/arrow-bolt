import { DashboardStats } from "@/components/admin/dashboard/DashboardStats";
import { DashboardCharts } from "@/components/admin/dashboard/DashboardCharts";
import { ServiceCalendar } from "@/components/admin/calendar/ServiceCalendar";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { PlusCircle, FileText } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { NewOrderForm } from "@/components/admin/orders/NewOrderForm";

const AdminDashboard = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [isNewOrderOpen, setIsNewOrderOpen] = useState(false);

  const handleCreateOS = () => {
    setIsNewOrderOpen(true);
  };

  const handleApproveReports = () => {
    navigate("/admin/reports/pending");
    toast({
      title: "Aprovar Relatórios",
      description: "Redirecionando para relatórios pendentes",
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

      <Dialog open={isNewOrderOpen} onOpenChange={setIsNewOrderOpen}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <NewOrderForm />
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AdminDashboard;