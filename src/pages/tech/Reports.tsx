
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { FileText, Download, Eye, Filter, Search, Plus, ArrowRight } from "lucide-react";
import { PDFPreviewDialog } from "@/components/tech/reports/PDFPreviewDialog";
import { TaskReport } from "@/components/tech/reports/types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";

// Definir uma interface para os relatórios salvos
interface SavedReport {
  id: string;
  task_id: string;
  status: string;
  created_at: string;
  updated_at: string;
  report_data: Record<string, TaskReport>;
  pdf_path?: string | null;
  task_uuid?: string | null;
  approved_at?: string | null;
  approved_by?: string | null;
  rejection_reason?: string | null;
  task?: {
    id: string;
    title: string;
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
}

const TechReports = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [vesselFilter, setVesselFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedReport, setSelectedReport] = useState<TaskReport | null>(null);
  const [selectedTaskId, setSelectedTaskId] = useState<string>("");
  const [isPDFOpen, setIsPDFOpen] = useState(false);
  const [storedReports, setStoredReports] = useState<{
    id: string;
    name: string;
    taskId: string;
    created_at: string;
    updated_at: string;
    url: string;
  }[]>([]);
  const [savedReports, setSavedReports] = useState<SavedReport[]>([]);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  useEffect(() => {
    fetchSavedReports();
    fetchStoredReports();
  }, []);

  const fetchSavedReports = async () => {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return;

      // Get technician ID for current user
      const { data: techData } = await supabase
        .from('technicians')
        .select('id')
        .eq('user_id', user.id)
        .single();

      if (!techData) return;

      const { data, error } = await supabase
        .from('task_reports')
        .select('*')
        .order('updated_at', { ascending: false });
      
      if (error) {
        console.error("Error fetching saved reports:", error);
        return;
      }
      
      if (data) {
        console.log("Saved reports:", data);
        
        // Fetch task details separately for each report
        const reportsWithTasks = await Promise.all(
          data.map(async (report) => {
            if (!report.task_uuid) {
              return {
                ...report,
                report_data: report.report_data as unknown as Record<string, TaskReport>,
              };
            }

            const { data: taskData } = await supabase
              .from('tasks')
              .select(`
                id,
                title,
                assigned_to,
                service_order:service_orders (
                  order_number,
                  vessel:vessels (name),
                  client:clients (name)
                )
              `)
              .eq('id', report.task_uuid)
              .single();

            return {
              ...report,
              report_data: report.report_data as unknown as Record<string, TaskReport>,
              task: taskData || undefined,
            };
          })
        );
        
        // Filter for current technician's tasks
        const technicianReports = reportsWithTasks.filter(
          (report) => 'task' in report && report.task?.assigned_to === techData.id
        );
        
        setSavedReports(technicianReports);
      }
    } catch (error) {
      console.error("Error in fetchSavedReports:", error);
    }
  };

  const fetchStoredReports = async () => {
    try {
      const { data, error } = await supabase.storage.from('reports').list();
      
      if (error) {
        console.error("Error fetching reports:", error);
        return;
      }
      
      if (data) {
        // If we have task folders, list all files in each folder
        const reportFiles = [];
        
        for (const item of data) {
          if (item.id && !item.name.includes('.')) {
            const { data: folderFiles, error: folderError } = await supabase.storage
              .from('reports')
              .list(item.name);
              
            if (!folderError && folderFiles) {
              for (const file of folderFiles) {
                // Get file URL
                const { data: urlData } = await supabase.storage
                  .from('reports')
                  .getPublicUrl(`${item.name}/${file.name}`);
                  
                reportFiles.push({
                  id: `${item.name}-${file.name}`,
                  name: file.name,
                  taskId: item.name,
                  created_at: file.created_at || '',
                  updated_at: file.updated_at || '',
                  url: urlData.publicUrl
                });
              }
            }
          }
        }
        
        setStoredReports(reportFiles);
      }
    } catch (error) {
      console.error("Error in fetchStoredReports:", error);
    }
  };

  const handleExportReports = () => {
    console.log("Exporting reports...");
    toast({
      title: "Exportação iniciada",
      description: "Os relatórios estão sendo exportados.",
    });
  };

  const handleViewReport = (report: SavedReport) => {
    navigate(`/tech/reports/edit?taskId=${report.task_id}`);
  };

  const handleOpenPDF = (report: TaskReport, taskId: string) => {
    setSelectedReport(report);
    setSelectedTaskId(taskId);
    setIsPDFOpen(true);
  };

  const handleOpenReportPDF = async (reportData: Record<string, TaskReport>, taskId: string) => {
    try {
      // Pegamos o primeiro relatório disponível deste taskId
      const firstTaskKey = Object.keys(reportData)[0];
      if (firstTaskKey) {
        setSelectedReport(reportData[firstTaskKey]);
        setSelectedTaskId(taskId);
        setIsPDFOpen(true);
      } else {
        toast({
          title: "Erro ao abrir PDF",
          description: "Não foi possível encontrar dados do relatório.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Error opening report PDF:", error);
      toast({
        title: "Erro ao abrir PDF",
        description: "Ocorreu um erro ao tentar abrir o PDF.",
        variant: "destructive",
      });
    }
  };

  const handleDownloadStoredReport = async (url: string, fileName: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = URL.createObjectURL(blob);
      
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      
      toast({
        title: "Download concluído",
        description: "O PDF foi baixado com sucesso.",
      });
    } catch (error) {
      console.error("Erro ao fazer download do PDF:", error);
      toast({
        title: "Erro no download",
        description: "Não foi possível baixar o PDF. Tente novamente.",
        variant: "destructive",
      });
    }
  };

  const formatStatus = (status: string) => {
    switch (status) {
      case "draft":
        return { 
          text: "Rascunho", 
          className: "bg-yellow-100 text-yellow-800 border-yellow-300" 
        };
      case "submitted":
        return { 
          text: "Enviado para Aprovação", 
          className: "bg-blue-100 text-blue-800 border-blue-300" 
        };
      case "approved":
        return { 
          text: "Aprovado", 
          className: "bg-green-100 text-green-800 border-green-300" 
        };
      default:
        return { 
          text: status, 
          className: "bg-gray-100 text-gray-800 border-gray-300" 
        };
    }
  };

  const toggleFilters = () => {
    setIsFiltersOpen(!isFiltersOpen);
  };

  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight text-gray-900">Relatórios</h2>
        <div className="space-x-2">
          <Button 
            variant="outline" 
            onClick={() => navigate("/tech/reports/new")}
            className="bg-white border-blue-300 text-blue-700 hover:bg-blue-50"
          >
            <FileText className="h-4 w-4 mr-2" />
            Novo Relatório
          </Button>
          <Button 
            variant="outline" 
            onClick={handleExportReports}
            className="bg-white border-green-300 text-green-700 hover:bg-green-50"
          >
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      <Card className="border border-gray-200 shadow-sm overflow-hidden">
        <CardHeader className="bg-gray-50 border-b border-gray-200">
          <div className="flex justify-between items-center">
            <CardTitle className="text-gray-800">Filtros</CardTitle>
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={toggleFilters}
              className="text-gray-500"
            >
              <Filter className="h-4 w-4 mr-2" />
              {isFiltersOpen ? "Ocultar Filtros" : "Mostrar Filtros"}
            </Button>
          </div>
        </CardHeader>
        {isFiltersOpen && (
          <CardContent className="pt-6 bg-white">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Embarcação</label>
                <Select value={vesselFilter} onValueChange={setVesselFilter}>
                  <SelectTrigger className="border-gray-300 focus:ring-blue-500 focus:border-blue-500">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="vessel1">Navio Alpha</SelectItem>
                    <SelectItem value="vessel2">Navio Beta</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Data de Criação</label>
                <Input
                  type="date"
                  value={dateFilter}
                  onChange={(e) => setDateFilter(e.target.value)}
                  className="border-gray-300 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">Status</label>
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger className="border-gray-300 focus:ring-blue-500 focus:border-blue-500">
                    <SelectValue placeholder="Selecione..." />
                  </SelectTrigger>
                  <SelectContent className="bg-white">
                    <SelectItem value="draft">Rascunho</SelectItem>
                    <SelectItem value="submitted">Enviado para Aprovação</SelectItem>
                    <SelectItem value="approved">Aprovado</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="mt-4 flex justify-end">
              <Button 
                variant="outline" 
                size="sm"
                className="mr-2 border-gray-300"
                onClick={() => {
                  setVesselFilter("");
                  setDateFilter("");
                  setStatusFilter("");
                }}
              >
                Limpar
              </Button>
              <Button 
                size="sm"
                className="bg-blue-600 hover:bg-blue-700"
              >
                <Search className="h-4 w-4 mr-2" />
                Aplicar Filtros
              </Button>
            </div>
          </CardContent>
        )}
      </Card>

      {savedReports.length > 0 && (
        <Card className="border border-gray-200 shadow-sm overflow-hidden card-transition">
          <CardHeader className="bg-gradient-to-r from-blue-50 to-blue-100 border-b border-gray-200">
            <CardTitle className="text-blue-800">Relatórios</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 bg-white p-0">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="font-semibold">OS</TableHead>
                  <TableHead className="font-semibold">Cliente</TableHead>
                  <TableHead className="font-semibold">Embarcação</TableHead>
                  <TableHead className="font-semibold">Status</TableHead>
                  <TableHead className="font-semibold">Última Atualização</TableHead>
                  <TableHead className="text-right font-semibold">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {savedReports
                  .filter(report => 
                    !statusFilter || report.status === statusFilter
                  )
                  .map((report) => {
                    const statusInfo = formatStatus(report.status);
                    const task = report.task as any;
                    return (
                      <TableRow key={report.id} className="hover:bg-blue-50 transition-colors">
                        <TableCell className="font-medium text-blue-800">
                          {task?.service_order?.order_number || report.task_id}
                        </TableCell>
                        <TableCell>{task?.service_order?.client?.name || '-'}</TableCell>
                        <TableCell>{task?.service_order?.vessel?.name || '-'}</TableCell>
                        <TableCell>
                          <Badge className={`font-medium border ${statusInfo.className}`}>
                            {statusInfo.text}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {new Date(report.updated_at).toLocaleString('pt-BR')}
                        </TableCell>
                        <TableCell className="text-right space-x-2">
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-blue-300 text-blue-700 hover:bg-blue-50"
                            onClick={() => handleViewReport(report)}
                          >
                            <FileText className="h-4 w-4 mr-2" />
                            Editar
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="border-gray-300 text-gray-700 hover:bg-gray-50"
                            onClick={() => handleOpenReportPDF(report.report_data as Record<string, TaskReport>, report.task_id)}
                          >
                            <Eye className="h-4 w-4 mr-2" />
                            PDF
                          </Button>
                        </TableCell>
                      </TableRow>
                    );
                  })}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {storedReports.length > 0 && (
        <Card className="border border-gray-200 shadow-sm overflow-hidden card-transition">
          <CardHeader className="bg-gradient-to-r from-green-50 to-green-100 border-b border-gray-200">
            <CardTitle className="text-green-800">Arquivos PDF no Servidor</CardTitle>
          </CardHeader>
          <CardContent className="pt-6 bg-white p-0">
            <Table>
              <TableHeader className="bg-gray-50">
                <TableRow>
                  <TableHead className="font-semibold">ID da Tarefa</TableHead>
                  <TableHead className="font-semibold">Nome do Arquivo</TableHead>
                  <TableHead className="font-semibold">Data de Criação</TableHead>
                  <TableHead className="text-right font-semibold">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {storedReports.map((report) => (
                  <TableRow key={report.id} className="hover:bg-green-50 transition-colors">
                    <TableCell className="font-medium text-green-800">{report.taskId}</TableCell>
                    <TableCell>{report.name}</TableCell>
                    <TableCell>
                      {new Date(report.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-blue-300 text-blue-700 hover:bg-blue-50"
                        onClick={() => window.open(report.url, '_blank')}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Visualizar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        className="border-green-300 text-green-700 hover:bg-green-50"
                        onClick={() => handleDownloadStoredReport(report.url, report.name)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Baixar
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {!savedReports.length && !storedReports.length && (
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="py-12">
            <div className="text-center space-y-4">
              <FileText className="h-12 w-12 text-gray-400 mx-auto" />
              <h3 className="text-lg font-medium text-gray-900">Nenhum relatório encontrado</h3>
              <p className="text-gray-500 max-w-md mx-auto">
                Você ainda não criou nenhum relatório. Clique no botão abaixo para criar seu primeiro relatório.
              </p>
              <Button 
                onClick={() => navigate("/tech/reports/new")}
                className="mt-4 bg-blue-600 hover:bg-blue-700"
              >
                <Plus className="h-4 w-4 mr-2" />
                Criar Relatório
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {selectedReport && (
        <PDFPreviewDialog
          open={isPDFOpen}
          onOpenChange={setIsPDFOpen}
          report={selectedReport}
          taskId={selectedTaskId}
        />
      )}
    </div>
  );
};

export default TechReports;
