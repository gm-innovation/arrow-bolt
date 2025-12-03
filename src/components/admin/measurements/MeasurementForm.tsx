import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Loader2, FileText, FileSpreadsheet } from "lucide-react";
import { useMeasurements } from "@/hooks/useMeasurements";
import { useServiceRates } from "@/hooks/useServiceRates";
import { supabase } from "@/integrations/supabase/client";
import { BasicInfoTab } from "./BasicInfoTab";
import { ManHoursTab } from "./ManHoursTab";
import { MaterialsTab } from "./MaterialsTab";
import { ServicesTab } from "./ServicesTab";
import { TravelsTab } from "./TravelsTab";
import { ExpensesTab } from "./ExpensesTab";
import { MeasurementSummary } from "./MeasurementSummary";
import { MeasurementPDFPreview } from "./MeasurementPDFPreview";
import { exportMeasurementToExcel } from "@/lib/exportMeasurements";
import { useToast } from "@/hooks/use-toast";

interface MeasurementFormProps {
  serviceOrderId: string;
  onClose?: () => void;
}

export interface TechnicianTimeEntry {
  id: string;
  entry_date: string;
  start_time: string;
  end_time: string;
  entry_type: string;
  technician_name: string;
  role_type: 'tecnico' | 'auxiliar';
  total_hours: number;
  hourly_rate: number;
  total_value: number;
}

export const MeasurementForm = ({ serviceOrderId, onClose }: MeasurementFormProps) => {
  const { measurement, isLoading, finalizeMeasurement } = useMeasurements(serviceOrderId);
  const { rates } = useServiceRates();
  const [activeTab, setActiveTab] = useState("basic");
  const [showPDFPreview, setShowPDFPreview] = useState(false);
  const { toast } = useToast();

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

  // Fetch technician time entries for PDF
  const { data: technicianTimeEntries = [] } = useQuery({
    queryKey: ['time-entries-for-pdf', serviceOrderId, rates],
    queryFn: async (): Promise<TechnicianTimeEntry[]> => {
      // 1. Buscar todas as tasks da OS
      const { data: tasks, error: tasksError } = await supabase
        .from('tasks')
        .select('id')
        .eq('service_order_id', serviceOrderId);

      if (tasksError) throw tasksError;
      if (!tasks || tasks.length === 0) return [];

      const taskIds = tasks.map(t => t.id);

      // 2. Buscar time_entries com dados do técnico
      const { data: entries, error: entriesError } = await supabase
        .from('time_entries')
        .select(`
          id,
          entry_date,
          start_time,
          end_time,
          entry_type,
          technician_id,
          technician:technicians!inner (
            id,
            user_id,
            profiles:user_id (
              full_name
            )
          )
        `)
        .in('task_id', taskIds);

      if (entriesError) throw entriesError;
      if (!entries || entries.length === 0) return [];

      // 3. Buscar todas as visitas da OS
      const { data: visits, error: visitsError } = await supabase
        .from('service_visits')
        .select('id')
        .eq('service_order_id', serviceOrderId);

      if (visitsError) throw visitsError;
      if (!visits || visits.length === 0) return [];

      const visitIds = visits.map(v => v.id);

      // 4. Buscar visit_technicians para saber is_lead
      const { data: visitTechs, error: visitTechsError } = await supabase
        .from('visit_technicians')
        .select('technician_id, is_lead')
        .in('visit_id', visitIds);

      if (visitTechsError) throw visitTechsError;

      // Criar um mapa de technician_id -> is_lead
      const isLeadMap = new Map<string, boolean>();
      visitTechs?.forEach(vt => {
        if (vt.is_lead) {
          isLeadMap.set(vt.technician_id, true);
        } else if (!isLeadMap.has(vt.technician_id)) {
          isLeadMap.set(vt.technician_id, false);
        }
      });

      // 5. Processar cada entry e calcular valores
      const processedEntries: TechnicianTimeEntry[] = entries.map(entry => {
        const technicianId = entry.technician_id;
        const isLead = isLeadMap.get(technicianId) ?? false;
        const roleType = isLead ? 'tecnico' : 'auxiliar';

        // Calcular horas
        const startTime = new Date(`1970-01-01T${entry.start_time}`);
        const endTime = new Date(`1970-01-01T${entry.end_time}`);
        const diffMs = endTime.getTime() - startTime.getTime();
        const totalHours = Math.round((diffMs / (1000 * 60 * 60)) * 100) / 100;

        // Buscar taxa
        const rate = rates.find(
          r => r.role_type === roleType && 
              r.hour_type === entry.entry_type && 
              r.work_type === 'trabalho'
        );
        const hourlyRate = rate?.rate_value || 0;
        const totalValue = hourlyRate * totalHours;

        const technicianData = entry.technician as any;
        const technicianName = technicianData?.profiles?.full_name || 'Técnico';

        return {
          id: entry.id,
          entry_date: entry.entry_date,
          start_time: entry.start_time,
          end_time: entry.end_time,
          entry_type: entry.entry_type,
          technician_name: technicianName,
          role_type: roleType,
          total_hours: totalHours,
          hourly_rate: hourlyRate,
          total_value: totalValue,
        };
      });

      return processedEntries;
    },
    enabled: !!serviceOrderId && rates.length >= 0,
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

  const handleExportExcel = () => {
    try {
      exportMeasurementToExcel(
        {
          id: measurement.id,
          category: measurement.category,
          status: measurement.status,
          created_at: measurement.created_at || '',
          finalized_at: measurement.finalized_at || undefined,
          subtotal_man_hours: measurement.subtotal_man_hours || 0,
          subtotal_materials: measurement.subtotal_materials || 0,
          subtotal_services: measurement.subtotal_services || 0,
          subtotal_travels: measurement.subtotal_travels || 0,
          subtotal_expenses: measurement.subtotal_expenses || 0,
          subtotal: measurement.subtotal || 0,
          tax_percentage: measurement.tax_percentage || 0,
          tax_amount: measurement.tax_amount || 0,
          total_amount: measurement.total_amount || 0,
          service_order: serviceOrder ? {
            order_number: serviceOrder.order_number,
            client: serviceOrder.client,
            vessel: serviceOrder.vessel,
          } : undefined,
        },
        (measurement.measurement_man_hours || []).map(h => ({
          technician_name: h.technician_name,
          technician_role: h.technician_role,
          hour_type: h.hour_type,
          work_type: h.work_type,
          entry_date: h.entry_date,
          start_time: h.start_time,
          end_time: h.end_time,
          total_hours: h.total_hours,
          hourly_rate: h.hourly_rate,
          total_value: h.total_value,
        })),
        (measurement.measurement_materials || []).map(m => ({
          name: m.name,
          quantity: m.quantity,
          unit_value: m.unit_value,
          markup_percentage: m.markup_percentage || 0,
          total_value: m.total_value,
        })),
        (measurement.measurement_travels || []).map(t => ({
          travel_type: t.travel_type,
          from_city: t.from_city,
          to_city: t.to_city,
          distance_km: t.distance_km || undefined,
          km_rate: t.km_rate || undefined,
          fixed_value: t.fixed_value || undefined,
          total_value: t.total_value,
          description: t.description || undefined,
        })),
        (measurement.measurement_expenses || []).map(e => ({
          expense_type: e.expense_type,
          description: e.description || undefined,
          base_value: e.base_value,
          admin_fee_percentage: e.admin_fee_percentage || 0,
          admin_fee_amount: e.admin_fee_amount,
          total_value: e.total_value,
        })),
        (measurement.measurement_services || []).map(s => ({
          name: s.name,
          description: s.description || undefined,
          value: s.value,
        }))
      );
      toast({
        title: "Exportação concluída",
        description: "O arquivo Excel foi baixado com sucesso.",
      });
    } catch (error) {
      console.error("Error exporting to Excel:", error);
      toast({
        title: "Erro na exportação",
        description: "Não foi possível exportar para Excel.",
        variant: "destructive",
      });
    }
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
          onClick={handleExportExcel}
        >
          <FileSpreadsheet className="h-4 w-4 mr-2" />
          Excel
        </Button>
        <Button
          variant="outline"
          onClick={() => setShowPDFPreview(true)}
          disabled={!serviceOrder}
        >
          <FileText className="h-4 w-4 mr-2" />
          PDF
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
          technicianTimeEntries={technicianTimeEntries}
          open={showPDFPreview}
          onOpenChange={setShowPDFPreview}
        />
      )}
    </div>
  );
};
