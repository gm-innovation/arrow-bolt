
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
import { FileText, Download, Eye } from "lucide-react";
import { PDFPreviewDialog } from "@/components/tech/reports/PDFPreviewDialog";
import { TaskReport } from "@/components/tech/reports/types";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";

// Update mock data to include id
const mockReports = [
  {
    id: "REL001",
    vesselName: "Navio Alpha",
    status: "in_progress",
    createdAt: new Date(),
    modelInfo: "Modelo XYZ",
    brandInfo: "Marca ABC",
    serialNumber: "123456",
    reportedIssue: "Problema no motor",
    executedWork: "Manutenção preventiva",
    result: "Equipamento funcionando normalmente",
    nextVisitWork: "Próxima manutenção em 6 meses",
    suppliedMaterial: "Óleo lubrificante, filtros",
    photos: [],
    timeEntries: [],
  },
];

const TechReports = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [vesselFilter, setVesselFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedReport, setSelectedReport] = useState<TaskReport | null>(null);
  const [isPDFOpen, setIsPDFOpen] = useState(false);
  const [storedReports, setStoredReports] = useState<{
    id: string;
    name: string;
    taskId: string;
    created_at: string;
    updated_at: string;
    url: string;
  }[]>([]);

  useEffect(() => {
    fetchStoredReports();
  }, []);

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

  const handleOpenPDF = (report: TaskReport) => {
    setSelectedReport(report);
    setIsPDFOpen(true);
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

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-3xl font-bold tracking-tight">Relatórios</h2>
        <div className="space-x-2">
          <Button variant="outline" onClick={handleExportReports}>
            <Download className="h-4 w-4 mr-2" />
            Exportar
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-2">
              <label>Embarcação</label>
              <Select value={vesselFilter} onValueChange={setVesselFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="vessel1">Navio Alpha</SelectItem>
                  <SelectItem value="vessel2">Navio Beta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label>Data de Criação</label>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label>Status</label>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="in_progress">Em Andamento</SelectItem>
                  <SelectItem value="pending">Aguardando Aprovação</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Relatórios em Andamento</CardTitle>
        </CardHeader>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Número</TableHead>
                <TableHead>Embarcação</TableHead>
                <TableHead>Status</TableHead>
                <TableHead>Data de Criação</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {mockReports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell>{report.id}</TableCell>
                  <TableCell>{report.vesselName}</TableCell>
                  <TableCell>
                    <div
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${
                          report.status === "in_progress"
                            ? "bg-yellow-100 text-yellow-800"
                            : report.status === "pending"
                            ? "bg-blue-100 text-blue-800"
                            : "bg-green-100 text-green-800"
                        }`}
                    >
                      {report.status === "in_progress"
                        ? "Em Andamento"
                        : report.status === "pending"
                        ? "Aguardando Aprovação"
                        : "Aprovado"}
                    </div>
                  </TableCell>
                  <TableCell>
                    {report.createdAt.toLocaleDateString()}
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => navigate(`/tech/reports/${report.id}/edit`)}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      Editar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenPDF(report)}
                    >
                      <FileText className="h-4 w-4 mr-2" />
                      PDF
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {storedReports.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Relatórios Salvos no Servidor</CardTitle>
          </CardHeader>
          <CardContent className="pt-6">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>ID da Tarefa</TableHead>
                  <TableHead>Nome do Arquivo</TableHead>
                  <TableHead>Data de Criação</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {storedReports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell>{report.taskId}</TableCell>
                    <TableCell>{report.name}</TableCell>
                    <TableCell>
                      {new Date(report.created_at).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => window.open(report.url, '_blank')}
                      >
                        <Eye className="h-4 w-4 mr-2" />
                        Visualizar
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
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

      {selectedReport && (
        <PDFPreviewDialog
          open={isPDFOpen}
          onOpenChange={setIsPDFOpen}
          report={selectedReport}
          taskId={selectedReport.id}
        />
      )}
    </div>
  );
};

export default TechReports;
