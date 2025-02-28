
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
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Eye, Download, CheckCircle, XOctagon, X } from "lucide-react";
import { ReportPDFViewer } from "@/components/tech/reports/ReportPDF";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/use-toast";
import { TaskReport } from "@/components/tech/reports/types";

// Define the status type to ensure type safety
type ReportStatus = "pending" | "approved" | "rejected";

// Mock data for reports
const mockReports = [
  {
    id: "REP-001",
    taskId: "TSK-001",
    technicianName: "João Silva",
    clientName: "Petrobras S.A.",
    vesselName: "PB-001",
    createdAt: new Date(2023, 5, 15),
    status: "pending" as ReportStatus,
    approvedBy: null,
    rejectionReason: null,
  },
  {
    id: "REP-002",
    taskId: "TSK-002",
    technicianName: "Maria Santos",
    clientName: "Shell Brasil",
    vesselName: "SH-001",
    createdAt: new Date(2023, 5, 20),
    status: "approved" as ReportStatus,
    approvedBy: "Carlos Oliveira",
    rejectionReason: null,
  },
  {
    id: "REP-003",
    taskId: "TSK-003",
    technicianName: "Pedro Costa",
    clientName: "Petrobras S.A.",
    vesselName: "PB-002",
    createdAt: new Date(2023, 6, 5),
    status: "rejected" as ReportStatus,
    approvedBy: null,
    rejectionReason: "Informações técnicas insuficientes. Por favor, detalhe melhor o problema encontrado.",
  },
];

// Mock service order data (for PDF rendering)
const mockServiceOrder = {
  id: "SO-001",
  date: new Date(),
  location: "Rio de Janeiro, RJ",
  access: "Via marítima",
  requester: {
    name: "Antonio Ferreira",
    role: "Gerente de Operações",
  },
  supervisor: {
    name: "Roberto Gomes",
  },
  team: {
    leadTechnician: "João Silva",
    assistants: ["Maria Santos"],
  },
  service: "Manutenção preventiva em sistema de navegação",
};

// Mock report data (for PDF rendering)
const mockReportData: TaskReport = {
  modelInfo: "NavSys 2000",
  brandInfo: "Navtec",
  serialNumber: "NS2000-567890",
  reportedIssue: "Sistema apresentando falhas intermitentes na exibição de dados.",
  executedWork: "Substituição de componentes eletrônicos e recalibração do sistema.",
  result: "Sistema operando normalmente após os reparos.",
  nextVisitWork: "Verificação de calibração em 6 meses.",
  suppliedMaterial: "2x Placas de circuito NS-2000-PCB, 1x Kit de cabos NS-2000-CBL",
  photos: [],
  timeEntries: [],
};

type StatusProps = {
  status: ReportStatus;
};

const StatusBadge = ({ status }: StatusProps) => {
  if (status === "pending") {
    return <Badge variant="outline" className="bg-yellow-50 text-yellow-800 border-yellow-300">Pendente</Badge>;
  } else if (status === "approved") {
    return <Badge variant="outline" className="bg-green-50 text-green-800 border-green-300">Aprovado</Badge>;
  } else {
    return <Badge variant="outline" className="bg-red-50 text-red-800 border-red-300">Recusado</Badge>;
  }
};

const Reports = () => {
  const [reports, setReports] = useState(mockReports);
  const [selectedReport, setSelectedReport] = useState<null | typeof mockReports[0]>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [showViewModal, setShowViewModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);

  useEffect(() => {
    console.log("View modal state:", showViewModal);
    console.log("Selected report:", selectedReport);
  }, [showViewModal, selectedReport]);

  useEffect(() => {
    console.log("Reject modal state:", showRejectModal);
  }, [showRejectModal]);

  const handleApproveReport = (reportId: string) => {
    console.log("Approving report:", reportId);
    setReports(prevReports => 
      prevReports.map(report => 
        report.id === reportId 
          ? { ...report, status: "approved" as ReportStatus, approvedBy: "Admin Atual", rejectionReason: null } 
          : report
      )
    );
    
    toast({
      title: "Relatório aprovado",
      description: "O relatório foi aprovado com sucesso.",
    });
  };

  const handleRejectReport = () => {
    if (!selectedReport) return;
    console.log("Rejecting report:", selectedReport.id);
    
    setReports(prevReports => 
      prevReports.map(report => 
        report.id === selectedReport.id 
          ? { ...report, status: "rejected" as ReportStatus, approvedBy: null, rejectionReason } 
          : report
      )
    );
    
    setRejectionReason("");
    setShowRejectModal(false);
    
    toast({
      title: "Relatório recusado",
      description: "O relatório foi recusado e o técnico será notificado.",
    });
  };

  const handleDownloadReport = (reportId: string) => {
    console.log("Downloading report:", reportId);
    
    toast({
      title: "Download iniciado",
      description: "O relatório será baixado em alguns instantes.",
    });
  };

  const handleViewReport = (report: typeof mockReports[0]) => {
    console.log("Viewing report:", report.id);
    setSelectedReport(report);
    setShowViewModal(true);
  };

  const handleOpenRejectDialog = (report: typeof mockReports[0]) => {
    console.log("Opening reject dialog for report:", report.id);
    setSelectedReport(report);
    setShowRejectModal(true);
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold">Relatórios</h1>
        <p className="text-muted-foreground">
          Gerencie os relatórios de serviços
        </p>
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
                  <TableCell className="font-medium">{report.id}</TableCell>
                  <TableCell>{report.technicianName}</TableCell>
                  <TableCell>{report.clientName}</TableCell>
                  <TableCell>{report.vesselName}</TableCell>
                  <TableCell>{format(report.createdAt, "dd/MM/yyyy", { locale: ptBR })}</TableCell>
                  <TableCell>
                    <StatusBadge status={report.status} />
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end space-x-2">
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleViewReport(report)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleDownloadReport(report.id)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {report.status === "pending" && (
                        <>
                          <Button
                            variant="outline"
                            size="icon"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => handleApproveReport(report.id)}
                          >
                            <CheckCircle className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="icon"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleOpenRejectDialog(report)}
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

      {/* Custom View Modal */}
      {showViewModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-5xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-bold">
                Visualizar Relatório {selectedReport.id}
              </h2>
              <Button variant="ghost" size="icon" onClick={() => setShowViewModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-4">
              <p className="text-sm text-muted-foreground mb-4">
                Relatório de serviço enviado por {selectedReport.technicianName} para {selectedReport.clientName}
              </p>
              
              <div className="bg-muted p-4 rounded-md mb-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-semibold">Status</p>
                    <StatusBadge status={selectedReport.status} />
                  </div>
                  <div>
                    <p className="text-sm font-semibold">Data</p>
                    <p>{format(selectedReport.createdAt, "dd/MM/yyyy", { locale: ptBR })}</p>
                  </div>
                  
                  {selectedReport.status === "approved" && selectedReport.approvedBy && (
                    <div>
                      <p className="text-sm font-semibold">Aprovado por</p>
                      <p>{selectedReport.approvedBy}</p>
                    </div>
                  )}
                  
                  {selectedReport.status === "rejected" && selectedReport.rejectionReason && (
                    <div className="col-span-2">
                      <p className="text-sm font-semibold">Motivo da recusa</p>
                      <p className="text-red-600">{selectedReport.rejectionReason}</p>
                    </div>
                  )}
                </div>
              </div>
              
              <div className="w-full h-[500px] border border-gray-200 rounded-md overflow-hidden">
                <ReportPDFViewer 
                  report={mockReportData} 
                  taskId={selectedReport.taskId} 
                  serviceOrder={mockServiceOrder} 
                />
              </div>
            </div>
            
            <div className="flex justify-end space-x-2 p-4 border-t">
              <Button variant="outline" onClick={() => setShowViewModal(false)}>
                Fechar
              </Button>
              <Button variant="default" onClick={() => handleDownloadReport(selectedReport.id)}>
                <Download className="mr-2 h-4 w-4" />
                Baixar PDF
              </Button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Reject Modal */}
      {showRejectModal && selectedReport && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
          <div className="bg-white rounded-lg max-w-md w-full">
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-xl font-bold">Recusar Relatório</h2>
              <Button variant="ghost" size="icon" onClick={() => setShowRejectModal(false)}>
                <X className="h-4 w-4" />
              </Button>
            </div>
            
            <div className="p-4">
              <p className="text-sm text-muted-foreground mb-4">
                Por favor, informe o motivo da recusa para que o técnico possa fazer as correções necessárias.
              </p>
              
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
            
            <div className="flex justify-end space-x-2 p-4 border-t">
              <Button variant="outline" onClick={() => setShowRejectModal(false)}>
                Cancelar
              </Button>
              <Button 
                variant="destructive" 
                onClick={handleRejectReport}
                disabled={!rejectionReason.trim()}
              >
                Recusar Relatório
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;
