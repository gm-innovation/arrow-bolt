
import { useState, useEffect } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Eye, Download, CheckCircle, XOctagon, Loader2, FileDown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { exportToCSV, formatDateForExport } from "@/lib/exportUtils";
import { PDFPreviewDialog } from "@/components/tech/reports/PDFPreviewDialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { useToast } from "@/hooks/use-toast";
import { TaskReport } from "@/components/tech/reports/types";
import { supabase } from "@/integrations/supabase/client";

interface Report {
  id: string;
  task_id: string;
  status: string;
  created_at: string;
  report_data: TaskReport;
  pdf_path: string | null;
  rejection_reason: string | null;
  task?: {
    assigned_to?: string;
    service_order?: {
      order_number: string;
      vessel?: {
        name: string;
      };
      client?: {
        name: string;
      };
    };
  };
  technician?: {
    user_id?: string;
    profile?: {
      full_name: string;
    };
  };
}

const StatusBadge = ({ status }: { status: string }) => {
  const variants: Record<string, any> = {
    draft: { variant: "outline", className: "bg-gray-50 text-gray-800 border-gray-300", label: "Rascunho" },
    submitted: { variant: "outline", className: "bg-yellow-50 text-yellow-800 border-yellow-300", label: "Submetido" },
    approved: { variant: "outline", className: "bg-green-50 text-green-800 border-green-300", label: "Aprovado" },
    rejected: { variant: "outline", className: "bg-red-50 text-red-800 border-red-300", label: "Recusado" },
  };

  const config = variants[status] || variants.draft;
  return <Badge variant={config.variant} className={config.className}>{config.label}</Badge>;
};

const Reports = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedReport, setSelectedReport] = useState<Report | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [isPDFPreviewOpen, setIsPDFPreviewOpen] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchReports();
  }, []);

  const fetchReports = async () => {
    try {
      setLoading(true);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from('profiles')
        .select('company_id')
        .eq('id', user.id)
        .single();

      if (!profile?.company_id) return;

      const { data, error } = await supabase
        .from('task_reports')
        .select(`
          *,
          task:tasks!task_reports_task_uuid_fkey (
            assigned_to,
            service_order:service_orders (
              order_number,
              vessel:vessels (name),
              client:clients (name)
            )
          )
        `)
        .in('status', ['submitted', 'approved', 'rejected'])
        .order('created_at', { ascending: false });

      if (error) throw error;

      // Fetch technician info for each report
      const reportsWithTechs = await Promise.all(
        (data || []).map(async (report: any) => {
          if (report.task?.assigned_to) {
            const { data: techData } = await supabase
              .from('technicians')
              .select('user_id, profile:profiles(full_name)')
              .eq('id', report.task.assigned_to)
              .single();
            
            return { ...report, technician: techData };
          }
          return report;
        })
      );

      setReports(reportsWithTechs);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar relatórios",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleApproveReport = async (reportId: string) => {
    try {
      setProcessingId(reportId);
      
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      const { error } = await supabase
        .from('task_reports')
        .update({
          status: 'approved',
          approved_by: user.id,
          approved_at: new Date().toISOString(),
          rejection_reason: null,
        })
        .eq('id', reportId);

      if (error) throw error;

      toast({
        title: "Relatório aprovado",
        description: "O relatório foi aprovado com sucesso.",
      });

      fetchReports();
    } catch (error: any) {
      toast({
        title: "Erro ao aprovar relatório",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleRejectReport = async () => {
    if (!selectedReport) return;
    
    try {
      setProcessingId(selectedReport.id);

      const { error } = await supabase
        .from('task_reports')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
          approved_by: null,
          approved_at: null,
        })
        .eq('id', selectedReport.id);

      if (error) throw error;

      toast({
        title: "Relatório recusado",
        description: "O relatório foi recusado e o técnico será notificado.",
      });

      setRejectionReason("");
      setShowRejectModal(false);
      setSelectedReport(null);
      fetchReports();
    } catch (error: any) {
      toast({
        title: "Erro ao recusar relatório",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setProcessingId(null);
    }
  };

  const handleDownloadReport = async (pdfPath: string) => {
    try {
      const { data, error } = await supabase.storage
        .from('reports')
        .download(pdfPath);

      if (error) throw error;

      const url = URL.createObjectURL(data);
      const a = document.createElement('a');
      a.href = url;
      a.download = pdfPath.split('/').pop() || 'report.pdf';
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      toast({
        title: "Download iniciado",
        description: "O relatório está sendo baixado.",
      });
    } catch (error: any) {
      toast({
        title: "Erro ao baixar relatório",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleViewReport = (report: Report) => {
    setSelectedReport(report);
    setIsPDFPreviewOpen(true);
  };

  const handleExportReports = () => {
    try {
      const exportData = reports.map(report => ({
        id: report.task_id,
        tecnico: report.technician?.profile?.full_name || '-',
        cliente: report.task?.service_order?.client?.name || '-',
        embarcacao: report.task?.service_order?.vessel?.name || '-',
        dataCriacao: formatDateForExport(report.created_at),
        status: report.status === "draft" ? "Rascunho" :
                report.status === "submitted" ? "Submetido" :
                report.status === "approved" ? "Aprovado" : "Recusado",
      }));

      const headers = {
        id: "ID",
        tecnico: "Técnico",
        cliente: "Cliente",
        embarcacao: "Embarcação",
        dataCriacao: "Data de Criação",
        status: "Status",
      };

      exportToCSV(exportData, `relatorios-${new Date().toISOString().split('T')[0]}`, headers);
      
      toast({
        title: "Exportação concluída",
        description: `${exportData.length} relatórios exportados com sucesso`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao exportar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-9 w-40" />
          <Skeleton className="h-10 w-44" />
        </div>
        <Card>
          <CardContent className="p-6">
            <div className="space-y-4">
              {[1, 2, 3, 4, 5].map((i) => (
                <div key={i} className="border rounded-lg p-4">
                  <div className="flex justify-between items-start">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-6 w-48" />
                      <Skeleton className="h-4 w-64" />
                      <Skeleton className="h-4 w-32" />
                    </div>
                    <Skeleton className="h-6 w-24" />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground">
            Gerencie os relatórios de serviços
          </p>
        </div>
        <Button variant="outline" onClick={handleExportReports} disabled={reports.length === 0}>
          <FileDown className="mr-2 h-4 w-4" />
          Exportar Relatórios
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Relatórios de Serviço</CardTitle>
          <CardDescription>
            Revise e aprove relatórios enviados pelos técnicos
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>ID</TableHead>
                <TableHead>Técnico</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead>Embarcação</TableHead>
                <TableHead>Data de Criação</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {reports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell className="font-medium">{report.task_id}</TableCell>
                  <TableCell>{report.technician?.profile?.full_name || '-'}</TableCell>
                  <TableCell>{report.task?.service_order?.client?.name || '-'}</TableCell>
                  <TableCell>{report.task?.service_order?.vessel?.name || '-'}</TableCell>
                  <TableCell>{format(new Date(report.created_at), "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                  <TableCell>
                    <StatusBadge status={report.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      {report.pdf_path && (
                        <>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleViewReport(report)}
                            title="Visualizar"
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => handleDownloadReport(report.pdf_path!)}
                            title="Baixar"
                          >
                            <Download className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                      {report.status === "submitted" && (
                        <>
                          <Button
                            variant="outline"
                            size="icon"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => handleApproveReport(report.id)}
                            disabled={processingId === report.id}
                            title="Aprovar"
                          >
                            {processingId === report.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <CheckCircle className="h-4 w-4" />
                            )}
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => {
                              setSelectedReport(report);
                              setShowRejectModal(true);
                            }}
                            disabled={processingId === report.id}
                            title="Recusar"
                          >
                            <XOctagon className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* PDF Preview Dialog */}
      {selectedReport && selectedReport.report_data && (
        <PDFPreviewDialog
          open={isPDFPreviewOpen}
          onOpenChange={setIsPDFPreviewOpen}
          report={selectedReport.report_data}
          taskId={selectedReport.task_id}
        />
      )}

      {/* Reject Report Dialog */}
      <Dialog open={showRejectModal} onOpenChange={setShowRejectModal}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Recusar Relatório</DialogTitle>
            <DialogDescription>
              Por favor, informe o motivo da recusa para que o técnico possa fazer as correções necessárias.
            </DialogDescription>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="rejection-reason">Motivo da recusa</Label>
              <Textarea
                id="rejection-reason"
                placeholder="Informe o motivo da recusa..."
                value={rejectionReason}
                onChange={(e) => setRejectionReason(e.target.value)}
                rows={5}
              />
            </div>
          </div>
          
          <DialogFooter>
            <Button 
              variant="outline" 
              onClick={() => setShowRejectModal(false)}
              disabled={!!processingId}
            >
              Cancelar
            </Button>
            <Button 
              variant="destructive" 
              onClick={handleRejectReport}
              disabled={!rejectionReason.trim() || !!processingId}
            >
              {processingId ? (
                <><Loader2 className="h-4 w-4 mr-2 animate-spin" /> Processando...</>
              ) : (
                "Recusar Relatório"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default Reports;
