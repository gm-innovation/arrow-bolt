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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Eye, FileText, Download, Clock, CheckCircle, XCircle, AlertCircle } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

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
  approved_at: string | null;
  rejection_reason: string | null;
  task: {
    title: string;
    service_order: {
      order_number: string;
      client: { name: string } | null;
      vessel: { name: string } | null;
    };
    technician: {
      user: { full_name: string };
    } | null;
  };
}

export function ServiceOrderReports({ filters }: ServiceOrderReportsProps) {
  const { user } = useAuth();
  const [selectedReport, setSelectedReport] = useState<ReportData | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);

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
          task_uuid
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
              service_orders!inner (
                id,
                order_number,
                company_id,
                created_at,
                created_by,
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

          return {
            ...report,
            task: {
              title: taskData.title,
              service_order: {
                order_number: taskData.service_orders.order_number,
                client: taskData.service_orders.clients,
                vessel: taskData.service_orders.vessels,
              },
              technician: {
                user: { full_name: technicianName },
              },
            },
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
      default:
        return <Badge variant="outline"><AlertCircle className="w-3 h-3 mr-1" /> {status}</Badge>;
    }
  };

  const handleViewReport = (report: ReportData) => {
    setSelectedReport(report);
    setDialogOpen(true);
  };

  const handleDownloadPdf = async (pdfPath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('reports')
        .download(pdfPath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = pdfPath.split('/').pop() || 'relatorio.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Error downloading PDF:', error);
    }
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
                          title="Ver detalhes"
                        >
                          <Eye className="w-4 h-4" />
                        </Button>
                        {report.pdf_path && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDownloadPdf(report.pdf_path!)}
                            title="Baixar PDF"
                          >
                            <Download className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                ))
              ) : (
                <TableRow>
                  <TableCell colSpan={8} className="text-center text-muted-foreground">
                    Nenhum relatório encontrado
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Report Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="max-w-3xl max-h-[80vh]">
          <DialogHeader>
            <DialogTitle>
              Detalhes do Relatório - OS {selectedReport?.task.service_order.order_number}
            </DialogTitle>
          </DialogHeader>
          <ScrollArea className="max-h-[60vh] pr-4">
            {selectedReport && (
              <div className="space-y-6">
                {/* Header Info */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm text-muted-foreground">Cliente</p>
                    <p className="font-medium">{selectedReport.task.service_order.client?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Embarcação</p>
                    <p className="font-medium">{selectedReport.task.service_order.vessel?.name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Técnico</p>
                    <p className="font-medium">{selectedReport.task.technician?.user.full_name || 'N/A'}</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Status</p>
                    {getStatusBadge(selectedReport.status)}
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Data de Criação</p>
                    <p className="font-medium">
                      {format(new Date(selectedReport.created_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                    </p>
                  </div>
                  {selectedReport.approved_at && (
                    <div>
                      <p className="text-sm text-muted-foreground">Data de Aprovação</p>
                      <p className="font-medium">
                        {format(new Date(selectedReport.approved_at), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}
                      </p>
                    </div>
                  )}
                </div>

                {selectedReport.rejection_reason && (
                  <div className="p-4 bg-destructive/10 rounded-lg">
                    <p className="text-sm text-muted-foreground">Motivo da Rejeição</p>
                    <p className="text-destructive">{selectedReport.rejection_reason}</p>
                  </div>
                )}

                {/* Report Data */}
                <div className="space-y-4">
                  <h4 className="font-semibold">Dados do Relatório</h4>
                  
                  {/* Time Entries */}
                  {selectedReport.report_data?.timeEntries && selectedReport.report_data.timeEntries.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Registros de Tempo</p>
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Tipo</TableHead>
                            <TableHead>Data</TableHead>
                            <TableHead>Início</TableHead>
                            <TableHead>Fim</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {selectedReport.report_data.timeEntries.map((entry: any, idx: number) => (
                            <TableRow key={idx}>
                              <TableCell>{entry.type}</TableCell>
                              <TableCell>{entry.date}</TableCell>
                              <TableCell>{entry.startTime}</TableCell>
                              <TableCell>{entry.endTime}</TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                  )}

                  {/* Notes */}
                  {selectedReport.report_data?.notes && (
                    <div>
                      <p className="text-sm font-medium mb-2">Observações</p>
                      <p className="p-3 bg-muted rounded-lg">{selectedReport.report_data.notes}</p>
                    </div>
                  )}

                  {/* Equipment Info */}
                  {selectedReport.report_data?.equipment && (
                    <div>
                      <p className="text-sm font-medium mb-2">Informações do Equipamento</p>
                      <div className="grid grid-cols-2 gap-2 p-3 bg-muted rounded-lg">
                        {Object.entries(selectedReport.report_data.equipment).map(([key, value]) => (
                          <div key={key}>
                            <span className="text-muted-foreground capitalize">{key}: </span>
                            <span>{String(value)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Steps */}
                  {selectedReport.report_data?.steps && selectedReport.report_data.steps.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Etapas Realizadas</p>
                      <ul className="list-disc list-inside space-y-1">
                        {selectedReport.report_data.steps.map((step: any, idx: number) => (
                          <li key={idx} className={step.completed ? 'text-green-600' : 'text-muted-foreground'}>
                            {step.name} {step.completed && '✓'}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {/* Photos */}
                  {selectedReport.report_data?.photos && selectedReport.report_data.photos.length > 0 && (
                    <div>
                      <p className="text-sm font-medium mb-2">Fotos ({selectedReport.report_data.photos.length})</p>
                      <div className="grid grid-cols-3 gap-2">
                        {selectedReport.report_data.photos.map((photo: any, idx: number) => (
                          <div key={idx} className="aspect-square bg-muted rounded-lg overflow-hidden">
                            <img 
                              src={photo.url || photo} 
                              alt={`Foto ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            )}
          </ScrollArea>
        </DialogContent>
      </Dialog>
    </>
  );
}
