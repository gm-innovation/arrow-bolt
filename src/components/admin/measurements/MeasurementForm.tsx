import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, FileText } from "lucide-react";
import { useMeasurements } from "@/hooks/useMeasurements";
import { supabase } from "@/integrations/supabase/client";
import { BasicInfoTab } from "./BasicInfoTab";
import { ManHoursTab } from "./ManHoursTab";
import { MaterialsTab } from "./MaterialsTab";
import { ServicesTab } from "./ServicesTab";
import { TravelsTab } from "./TravelsTab";
import { ExpensesTab } from "./ExpensesTab";
import { MeasurementSummary } from "./MeasurementSummary";
import { MeasurementPDFPreview } from "./MeasurementPDFPreview";

interface MeasurementFormProps {
  serviceOrderId: string;
  onClose?: () => void;
}

export const MeasurementForm = ({ serviceOrderId, onClose }: MeasurementFormProps) => {
  const { measurement, isLoading, finalizeMeasurement } = useMeasurements(serviceOrderId);
  const [activeTab, setActiveTab] = useState("basic");
  const [showPDFPreview, setShowPDFPreview] = useState(false);

  // Fetch service order details for PDF with client, vessel and company
  const { data: serviceOrder } = useQuery({
    queryKey: ['service-order-full', serviceOrderId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('service_orders')
        .select(`
          *,
          client:clients (name),
          vessel:vessels (name),
          company:companies (name, cnpj, address, cep, phone, email, logo_url)
        `)
        .eq('id', serviceOrderId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!serviceOrderId,
  });

  // Fetch task reports to get technician materials
  const { data: taskReports } = useQuery({
    queryKey: ['task-reports-materials', serviceOrderId],
    queryFn: async () => {
      // Get tasks for this service order
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id')
        .eq('service_order_id', serviceOrderId);

      if (tasksError) throw tasksError;
      if (!tasks || tasks.length === 0) return [];

      const taskIds = tasks.map(t => t.id);

      // Get task reports - using task_uuid which is the UUID reference
      const { data: reports, error: reportsError } = await supabase
        .from('task_reports')
        .select('report_data')
        .in('task_uuid', taskIds);

      if (reportsError) throw reportsError;
      return reports || [];
    },
    enabled: !!serviceOrderId,
  });

  // Extract supplied materials from task reports
  const technicianMaterials: string[] = [];
  if (taskReports) {
    for (const report of taskReports) {
      const reportData = report.report_data as Record<string, any>;
      if (reportData) {
        // The report_data can have different structures, try to extract suppliedMaterial
        for (const key of Object.keys(reportData)) {
          const taskData = reportData[key];
          if (taskData?.suppliedMaterial && typeof taskData.suppliedMaterial === 'string' && taskData.suppliedMaterial.trim()) {
            technicianMaterials.push(taskData.suppliedMaterial);
          }
        }
        // Also check if suppliedMaterial is directly on report_data
        if (reportData.suppliedMaterial && typeof reportData.suppliedMaterial === 'string' && reportData.suppliedMaterial.trim()) {
          technicianMaterials.push(reportData.suppliedMaterial);
        }
      }
    }
  }

  if (isLoading) {
    return (
      <div className="flex items-center justify-center p-8">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!measurement) {
    return (
      <div className="text-center p-8 text-muted-foreground">
        Medição não encontrada
      </div>
    );
  }

  const isDraft = measurement.status === 'draft';

  const handleFinalize = async () => {
    await finalizeMeasurement.mutateAsync(measurement.id);
    onClose?.();
  };

  return (
    <div className="space-y-6">
      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList className="grid w-full grid-cols-6">
          <TabsTrigger value="basic">Básico</TabsTrigger>
          <TabsTrigger value="manhours">Mão de Obra</TabsTrigger>
          <TabsTrigger value="materials">Materiais</TabsTrigger>
          <TabsTrigger value="services">Serviços</TabsTrigger>
          <TabsTrigger value="travels">Deslocamento</TabsTrigger>
          <TabsTrigger value="expenses">Despesas</TabsTrigger>
        </TabsList>

        <Card className="mt-4">
          <CardContent className="pt-6">
            <TabsContent value="basic" className="mt-0">
              <BasicInfoTab 
                measurement={measurement} 
                serviceOrderId={serviceOrderId}
                disabled={!isDraft}
              />
            </TabsContent>

            <TabsContent value="manhours" className="mt-0">
              <ManHoursTab 
                measurementId={measurement.id}
                serviceOrderId={serviceOrderId}
                manHours={measurement.measurement_man_hours || []}
                disabled={!isDraft}
              />
            </TabsContent>

            <TabsContent value="materials" className="mt-0">
              <MaterialsTab 
                measurementId={measurement.id}
                materials={measurement.measurement_materials || []}
                disabled={!isDraft}
                technicianMaterials={technicianMaterials}
              />
            </TabsContent>

            <TabsContent value="services" className="mt-0">
              <ServicesTab 
                measurementId={measurement.id}
                services={measurement.measurement_services || []}
                disabled={!isDraft}
              />
            </TabsContent>

            <TabsContent value="travels" className="mt-0">
              <TravelsTab 
                measurementId={measurement.id}
                travels={measurement.measurement_travels || []}
                disabled={!isDraft}
              />
            </TabsContent>

            <TabsContent value="expenses" className="mt-0">
              <ExpensesTab 
                measurementId={measurement.id}
                expenses={measurement.measurement_expenses || []}
                disabled={!isDraft}
              />
            </TabsContent>
          </CardContent>
        </Card>
      </Tabs>

      <MeasurementSummary measurement={measurement} />

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onClose}>
          {isDraft ? 'Fechar' : 'Voltar'}
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowPDFPreview(true)}
          disabled={!serviceOrder}
        >
          <FileText className="h-4 w-4 mr-2" />
          Gerar PDF
        </Button>
        {isDraft && (
          <Button 
            onClick={handleFinalize}
            disabled={finalizeMeasurement.isPending}
          >
            {finalizeMeasurement.isPending && (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            )}
            Finalizar Medição
          </Button>
        )}
      </div>

      {/* PDF Preview Dialog */}
      {serviceOrder && (
        <MeasurementPDFPreview
          measurement={measurement}
          serviceOrder={serviceOrder}
          open={showPDFPreview}
          onOpenChange={setShowPDFPreview}
        />
      )}
    </div>
  );
};
