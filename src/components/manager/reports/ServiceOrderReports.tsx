import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Eye, FileText, Download, Clock, CheckCircle, XCircle, AlertCircle, Loader2, Layers } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { PDFPreviewDialog } from "@/components/tech/reports/PDFPreviewDialog";
import { TaskReport, TaskReportWithInfo } from "@/components/tech/reports/types";
import { loadPhotosFromStorage, generateReportPdfBlob, generateMultiTaskReportPdfBlob } from "@/components/tech/reports/ReportPDF";
import { useToast } from "@/hooks/use-toast";

interface ServiceOrderReportsProps {
  filters?: {
    startDate?: Date;
    endDate?: Date;
    coordinatorId?: string | null;
  };
}

interface ReportData {
  id: string;
  task_id: string;
  status: string;
  report_data: any;
  created_at: string;
  updated_at: string;
  pdf_path: string | null;
  signed_pdf_path?: string | null;
  approved_at: string | null;
  rejection_reason: string | null;
  visit_id?: string | null;
  task: {
    title: string;
    assigned_to?: string;
    service_order: {
      order_number: string;
      location?: string;
      access?: string;
      description?: string;
      scheduled_date?: string;
      service_date_time?: string;
      company_id?: string;
      is_docking?: boolean;
      parent_docking_id?: string;
      client: { name: string } | null;
      vessel: { name: string } | null;
    };
    technician: {
      user: { full_name: string };
    } | null;
  };
  supervisor?: {
    full_name: string;
  } | null;
  assistants?: Array<{
    technicians?: {
      profiles?: {
        full_name: string;
      };
    };
  }>;
  company?: {
    name: string;
    email: string;
    phone: string;
    address: string;
    cnpj: string;
    cep: string;
    logo_url: string;
  } | null;
}

export function ServiceOrderReports({ filters }: ServiceOrderReportsProps) {
  const { user } = useAuth();
  const { toast } = useToast();
  const [selectedReport, setSelectedReport] = useState<ReportData | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [consolidatingId, setConsolidatingId] = useState<string | null>(null);

  const { data: reports, isLoading } = useQuery({
    queryKey: ['manager-service-reports', user?.id, filters],
    queryFn: async () => {
      const { data: profileData } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user?.id)
        .single();

      if (!profileData?.company_id) throw new Error('Empresa não encontrada');

      // Get all task reports for the company
      let query = supabase
        .from('task_reports')
        .select(`
          id,
          task_id,
          status,
          report_data,
          created_at,
          updated_at,
          pdf_path,
          approved_at,
          rejection_reason,
          task_uuid,
          visit_id
        `)
        .order('created_at', { ascending: false });

      const { data: taskReports, error } = await query;
      if (error) throw error;

      // Fetch related task info
      const enrichedReports = await Promise.all(
        (taskReports || []).map(async (report) => {
          // Get task info
          const { data: taskData } = await supabase
            .from('tasks')
            .select(`
              id,
              title,
              assigned_to,
              docking_activity_group,
              service_orders!inner (
                id,
                order_number,
                client_reference,
                company_id,
                location,
                access,
                description,
                scheduled_date,
                service_date_time,
                supervisor_id,
                created_at,
                created_by,
                is_docking,
                parent_docking_id,
                clients (name),
                vessels (name)
              )
            `)
            .eq('id', report.task_uuid || report.task_id)
            .single();

          if (!taskData || taskData.service_orders?.company_id !== profileData.company_id) {
            return null;
          }

          // Apply filters
          if (filters?.startDate && new Date(taskData.service_orders.created_at) < filters.startDate) {
            return null;
          }
          if (filters?.endDate && new Date(taskData.service_orders.created_at) > filters.endDate) {
            return null;
          }
          if (filters?.coordinatorId && taskData.service_orders.created_by !== filters.coordinatorId) {
            return null;
          }

          // Get technician info
          let technicianName = 'N/A';
          if (taskData.assigned_to) {
            const { data: techData } = await supabase
              .from('technicians')
              .select('profiles!inner(full_name)')
              .eq('id', taskData.assigned_to)
              .single();
            
            if (techData?.profiles) {
              technicianName = (techData.profiles as any).full_name;
            }
          }

          // Fetch supervisor
          let supervisorData = null;
          if (taskData.service_orders?.supervisor_id) {
            const { data } = await supabase
              .from('profiles')
              .select('full_name')
              .eq('id', taskData.service_orders.supervisor_id)
              .single();
            supervisorData = data;
          }

          // Fetch visit technicians (assistants)
          let visitTechnicians: any[] = [];
          let visitId = report.visit_id;
          
          // If visit_id is null, try to get it from the service_order
          if (!visitId && taskData.service_orders?.id) {
            const { data: visitData } = await supabase
              .from('service_visits')
              .select('id')
              .eq('service_order_id', taskData.service_orders.id)
              .order('visit_number', { ascending: false })
              .limit(1)
              .maybeSingle();
            visitId = visitData?.id;
          }
          
          if (visitId) {
            const { data } = await supabase
              .from('visit_technicians')
              .select(`
                is_lead,
                technicians (
                  user_id,
                  profiles:user_id (full_name)
                )
              `)
              .eq('visit_id', visitId)
              .eq('is_lead', false);
            visitTechnicians = data || [];
          }

          // Fetch company data
          let companyData = null;
          if (taskData.service_orders?.company_id) {
            const { data } = await supabase
              .from('companies')
              .select('name, email, phone, address, cnpj, cep, logo_url')
              .eq('id', taskData.service_orders.company_id)
              .single();
            companyData = data;
          }

          return {
            ...report,
            visit_id: report.visit_id,
            task: {
              title: taskData.title,
              assigned_to: taskData.assigned_to,
              service_order: {
                order_number: taskData.service_orders.order_number,
                location: taskData.service_orders.location,
                access: taskData.service_orders.access,
                description: taskData.service_orders.description,
                scheduled_date: taskData.service_orders.scheduled_date,
                service_date_time: taskData.service_orders.service_date_time,
                company_id: taskData.service_orders.company_id,
                is_docking: (taskData.service_orders as any).is_docking,
                parent_docking_id: (taskData.service_orders as any).parent_docking_id,
                client: taskData.service_orders.clients,
                vessel: taskData.service_orders.vessels,
              },
              technician: {
                user: { full_name: technicianName },
              },
            },
            supervisor: supervisorData,
            assistants: visitTechnicians,
            company: companyData,
          };
        })
      );

      return enrichedReports.filter(Boolean) as ReportData[];
    },
    enabled: !!user?.id,
  });

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-500"><CheckCircle className="w-3 h-3 mr-1" /> Aprovado</Badge>;
      case 'rejected':
        return <Badge variant="destructive"><XCircle className="w-3 h-3 mr-1" /> Rejeitado</Badge>;
      case 'pending':
        return <Badge variant="secondary"><Clock className="w-3 h-3 mr-1" /> Pendente</Badge>;
      case 'submitted':
        return <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300"><Clock className="w-3 h-3 mr-1" /> Submetido</Badge>;
      default:
        return <Badge variant="outline"><AlertCircle className="w-3 h-3 mr-1" /> {status}</Badge>;
    }
  };

  const handleViewReport = (report: ReportData) => {
    setSelectedReport(report);
    setDialogOpen(true);
  };

  const handleDownloadPdf = async (report: ReportData) => {
    try {
      setDownloadingId(report.id);
      
      // Extract report data and service order data
      const reportData = extractReportData(report);
      const serviceOrderData = getServiceOrderData(report);
      
      // Load photos from storage
      const photos = reportData.photos || [];
      const base64Photos = await loadPhotosFromStorage(photos);
      
      // Generate PDF with photos
      const blob = await generateReportPdfBlob(
        reportData,
        report.task_id,
        serviceOrderData,
        base64Photos
      );
      
      // Generate filename with proper format - use service date, not today
      const orderNumber = report.task?.service_order?.order_number || 'N-A';
      const vesselName = report.task?.service_order?.vessel?.name || 'Embarcacao';
      const serviceDate = report.task?.service_order?.service_date_time 
        ? new Date(report.task.service_order.service_date_time)
        : report.task?.service_order?.scheduled_date 
          ? new Date(report.task.service_order.scheduled_date)
          : new Date(report.created_at);
      const date = format(serviceDate, 'dd-MM-yyyy', { locale: ptBR });
      const fileName = `Relatório - OS${orderNumber} - ${vesselName} - ${date}.pdf`;
      
      // Download
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download concluído",
        description: "O relatório foi baixado com sucesso.",
      });
    } catch (error: any) {
      console.error('Erro ao baixar relatório:', error);
      toast({
        title: "Erro ao baixar relatório",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setDownloadingId(null);
    }
  };

  // Helper function to extract report data from nested structure
  const extractReportData = (report: ReportData): TaskReport => {
    if (!report.report_data) {
      return {
        modelInfo: '',
        brandInfo: '',
        serialNumber: '',
        reportedIssue: '',
        executedWork: '',
        result: '',
        nextVisitWork: '',
        suppliedMaterial: '',
        photos: [],
        timeEntries: []
      };
    }
    
    // Try to access by task_id (UUID)
    if (report.report_data[report.task_id]) {
      return report.report_data[report.task_id];
    }
    
    // Fallback: find first valid object in report_data
    const keys = Object.keys(report.report_data);
    if (keys.length > 0) {
      const firstKey = keys[0];
      const data = report.report_data[firstKey];
      if (data && typeof data === 'object' && 'modelInfo' in data) {
        return data;
      }
    }
    
    // If report_data itself is already the report object
    if ('modelInfo' in report.report_data) {
      return report.report_data;
    }
    
    return {
      modelInfo: '',
      brandInfo: '',
      serialNumber: '',
      reportedIssue: '',
      executedWork: '',
      result: '',
      nextVisitWork: '',
      suppliedMaterial: '',
      photos: [],
      timeEntries: []
    };
  };

  // Prepare service order data for PDF
  const getServiceOrderData = (report: ReportData) => {
    const serviceOrder = report.task?.service_order as any;
    const company = report.company;
    
    return {
      id: serviceOrder?.order_number || 'N/A',
      clientReference: serviceOrder?.client_reference || undefined,
      date: serviceOrder?.service_date_time 
        ? new Date(serviceOrder.service_date_time) 
        : serviceOrder?.scheduled_date 
          ? new Date(serviceOrder.scheduled_date)
          : new Date(),
      location: serviceOrder?.location || 'Local não especificado',
      access: serviceOrder?.access || 'Acesso padrão',
      requester: {
        name: serviceOrder?.client?.name || 'N/A',
        role: 'Cliente',
      },
      supervisor: {
        name: report.supervisor?.full_name || 'N/A',
      },
      team: {
        leadTechnician: report.task?.technician?.user.full_name || 'N/A',
        assistants: report.assistants?.map((a: any) => a.technicians?.profiles?.full_name).filter(Boolean) || [],
      },
      service: report.task?.title || serviceOrder?.description || 'Serviço não especificado',
      company: {
        name: company?.name?.trim() || 'Empresa não especificada',
        email: company?.email?.trim() || '',
        phone: company?.phone?.trim() || '',
        address: company?.address?.trim() || '',
        cnpj: company?.cnpj?.trim() || '',
        cep: company?.cep?.trim() || '',
        logoUrl: company?.logo_url?.trim() || '',
      },
    };
  };

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {[...Array(5)].map((_, i) => (
              <Skeleton key={i} className="h-12 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="w-5 h-5" />
            Relatórios de Ordens de Serviço
          </CardTitle>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>OS</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Embarcação</TableHead>
                <TableHead>Tarefa</TableHead>
                <TableHead>Técnico</TableHead>
                <TableHead>Auxiliar(es)</TableHead>
                <TableHead>Supervisor</TableHead>
                <TableHead className="text-center">Status</TableHead>
                <TableHead>Data</TableHead>
                <TableHead className="text-center">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports && reports.length > 0 ? (
                reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">
                      {report.task.service_order.order_number}
                    </TableCell>
                    <TableCell>{report.task.service_order.client?.name || 'N/A'}</TableCell>
                    <TableCell>{report.task.service_order.vessel?.name || 'N/A'}</TableCell>
                    <TableCell>{report.task.title}</TableCell>
                    <TableCell>{report.task.technician?.user.full_name || 'N/A'}</TableCell>
                    <TableCell>
                      {report.assistants && report.assistants.length > 0
                        ? report.assistants.map((a: any) => a.technicians?.profiles?.full_name).filter(Boolean).join(', ') || 'N/A'
                        : 'N/A'}
                    </TableCell>
                    <TableCell>{report.supervisor?.full_name || 'N/A'}</TableCell>
                    <TableCell className="text-center">
                      {getStatusBadge(report.status)}
                    </TableCell>
                    <TableCell>
                      {format(new Date(report.created_at), "dd/MM/yyyy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleViewReport(report)}
                          title="Ver relatório completo"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDownloadPdf(report)}
                          disabled={downloadingId === report.id}
                          title="Baixar PDF"
                        >
                          {downloadingId === report.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Download className="w-4 h-4" />
                          )}
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={10} className="text-center text-muted-foreground">
                    Nenhum relatório encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* PDF Preview Dialog */}
      {selectedReport && (
        <PDFPreviewDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          report={extractReportData(selectedReport)}
          taskId={selectedReport.task_id}
          serviceOrder={getServiceOrderData(selectedReport)}
        />
      )}
    </>
  );
}
