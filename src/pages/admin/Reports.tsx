import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Eye, Download, CheckSquare, XOctagon } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { PDFPreviewDialog } from "@/components/tech/reports/PDFPreviewDialog";

// Mock data - replace with real data when backend is integrated
const mockReports = [
  {
    id: "OS001",
    vesselName: "Navio Alpha",
    date: new Date("2024-03-15"),
    technician: "João Silva",
    status: "pending",
  },
  {
    id: "OS002",
    vesselName: "Navio Beta",
    date: new Date("2024-03-16"),
    technician: "Maria Santos",
    status: "approved",
  },
];

const Reports = () => {
  const { toast } = useToast();
  const [vesselFilter, setVesselFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedReport, setSelectedReport] = useState(null);
  const [isPDFOpen, setIsPDFOpen] = useState(false);

  // Filter reports based on search and filter criteria
  const filteredReports = mockReports.filter((report) => {
    const matchesSearch =
      !searchTerm ||
      report.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.vesselName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      report.technician.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesVessel =
      !vesselFilter || report.vesselName === vesselFilter;

    const matchesDate =
      !dateFilter ||
      report.date.toISOString().split("T")[0] === dateFilter;

    const matchesStatus =
      !statusFilter || report.status === statusFilter;

    return matchesSearch && matchesVessel && matchesDate && matchesStatus;
  });

  const handleViewReport = (report) => {
    setSelectedReport(report);
    setIsPDFOpen(true);
    toast({
      title: "Visualizar Relatório",
      description: `Visualizando relatório ${report.id}`,
    });
  };

  const handleRejectReport = (reportId) => {
    toast({
      title: "Recusar Relatório",
      description: `Relatório ${reportId} recusado`,
      variant: "destructive",
    });
  };

  const handleDownloadReport = (reportId) => {
    toast({
      title: "Baixar Relatório",
      description: `Baixando relatório ${reportId}`,
    });
  };

  const handleApproveReport = (reportId) => {
    toast({
      title: "Aprovar Relatório",
      description: `Relatório ${reportId} aprovado`,
      variant: "success",
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground">
            Gerencie os relatórios de serviço
          </p>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Filtros</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="space-y-2">
              <Input
                placeholder="Buscar por OS, navio ou técnico..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Select value={vesselFilter} onValueChange={setVesselFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Embarcação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Navio Alpha">Navio Alpha</SelectItem>
                  <SelectItem value="Navio Beta">Navio Beta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="pending">Pendente</SelectItem>
                  <SelectItem value="approved">Aprovado</SelectItem>
                  <SelectItem value="rejected">Recusado</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="pt-6">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>OS</TableHead>
                <TableHead>Embarcação</TableHead>
                <TableHead>Data</TableHead>
                <TableHead>Técnico</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredReports.map((report) => (
                <TableRow key={report.id}>
                  <TableCell>{report.id}</TableCell>
                  <TableCell>{report.vesselName}</TableCell>
                  <TableCell>
                    {report.date.toLocaleDateString()}
                  </TableCell>
                  <TableCell>{report.technician}</TableCell>
                  <TableCell>
                    <div
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
                        ${
                          report.status === "pending"
                            ? "bg-yellow-100 text-yellow-800"
                            : report.status === "approved"
                            ? "bg-green-100 text-green-800"
                            : "bg-red-100 text-red-800"
                        }`}
                    >
                      {report.status === "pending"
                        ? "Pendente"
                        : report.status === "approved"
                        ? "Aprovado"
                        : "Recusado"}
                    </div>
                  </TableCell>
                  <TableCell className="text-right space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleViewReport(report)}
                    >
                      <Eye className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleRejectReport(report.id)}
                    >
                      <XOctagon className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDownloadReport(report.id)}
                    >
                      <Download className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleApproveReport(report.id)}
                    >
                      <CheckSquare className="h-4 w-4" />
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

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

export default Reports;