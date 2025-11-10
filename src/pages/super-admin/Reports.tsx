
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
import { Eye, Download, CheckSquare, XOctagon, Filter, Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useSuperAdminReports } from "@/hooks/useSuperAdminReports";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Textarea } from "@/components/ui/textarea";
import { useIsMobile } from "@/hooks/use-mobile";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
  SheetClose,
} from "@/components/ui/sheet";

const Reports = () => {
  const { toast } = useToast();
  const [vesselFilter, setVesselFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [filterSheetOpen, setFilterSheetOpen] = useState(false);
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const isMobile = useIsMobile();

  const { reports, isLoading, approveReport, rejectReport, downloadReport } = useSuperAdminReports({
    searchTerm,
    vesselFilter,
    dateFilter,
    statusFilter,
  });

  const handleViewReport = (reportId: string) => {
    toast({
      title: "Visualizar Relatório",
      description: `Visualizando relatório ${reportId}`,
      duration: 3000,
    });
  };

  const handleRejectReport = (reportId: string) => {
    setSelectedReportId(reportId);
    setRejectDialogOpen(true);
  };

  const confirmRejectReport = () => {
    if (selectedReportId && rejectionReason.trim()) {
      rejectReport({ reportId: selectedReportId, reason: rejectionReason });
      setRejectDialogOpen(false);
      setRejectionReason("");
      setSelectedReportId(null);
    } else {
      toast({
        title: "Erro",
        description: "Por favor, insira um motivo para a recusa",
        variant: "destructive",
      });
    }
  };

  const handleDownloadReport = (pdfPath: string, reportId: string) => {
    downloadReport(pdfPath, reportId);
  };

  const handleApproveReport = (reportId: string) => {
    approveReport(reportId);
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  const renderStatusBadge = (status: string) => {
    if (status === "pending") {
      return <Badge variant="warning">Pendente</Badge>;
    } else if (status === "approved") {
      return <Badge variant="success">Aprovado</Badge>;
    } else {
      return <Badge variant="destructive">Recusado</Badge>;
    }
  };

  const renderMobileCard = (report: any) => (
    <Card key={report.id} className="mb-4">
      <CardContent className="pt-6">
        <div className="flex justify-between items-start">
          <div>
            <div className="font-semibold">{report.orderNumber}</div>
            <div className="text-sm text-muted-foreground">{report.vesselName}</div>
            <div className="text-xs text-muted-foreground">{report.companyName}</div>
          </div>
          {renderStatusBadge(report.status)}
        </div>
        
        <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
          <div className="text-muted-foreground">Técnico:</div>
          <div>{report.technician}</div>
          
          <div className="text-muted-foreground">Data:</div>
          <div>{report.date.toLocaleDateString()}</div>
        </div>
        
        <div className="mt-4 flex justify-end space-x-2">
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2"
            onClick={() => handleViewReport(report.id)}
          >
            <Eye className="h-4 w-4" />
          </Button>
          <Button
            variant="outline"
            size="sm"
            className="h-8 px-2"
            onClick={() => handleDownloadReport(report.pdfPath, report.id)}
          >
            <Download className="h-4 w-4" />
          </Button>
          {report.status === "pending" && (
            <>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 text-green-600 hover:text-green-700 hover:bg-green-50"
                onClick={() => handleApproveReport(report.id)}
              >
                <CheckSquare className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-8 px-2 text-red-600 hover:text-red-700 hover:bg-red-50"
                onClick={() => handleRejectReport(report.id)}
              >
                <XOctagon className="h-4 w-4" />
              </Button>
            </>
          )}
        </div>
      </CardContent>
    </Card>
  );

  // Filters for mobile as a sheet
  const renderMobileFilters = () => (
    <>
      <Button 
        variant="outline" 
        size="sm" 
        className="flex items-center gap-2"
        onClick={() => setFilterSheetOpen(true)}
      >
        <Filter className="h-4 w-4" />
        <span>Filtros</span>
      </Button>
      
      <Sheet open={filterSheetOpen} onOpenChange={setFilterSheetOpen}>
        <SheetContent side="bottom" className="h-[80vh] sm:h-[60vh] p-4">
          <SheetHeader>
            <SheetTitle>Filtros</SheetTitle>
          </SheetHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Buscar</label>
              <Input
                placeholder="Buscar por OS, navio ou técnico..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Embarcação</label>
              <Select value={vesselFilter} onValueChange={setVesselFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Embarcação" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="navio-alpha">Navio Alpha</SelectItem>
                  <SelectItem value="navio-beta">Navio Beta</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Data</label>
              <Input
                type="date"
                value={dateFilter}
                onChange={(e) => setDateFilter(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <label className="text-sm font-medium">Status</label>
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
          
          <SheetFooter>
            <Button className="w-full" onClick={() => setFilterSheetOpen(false)}>
              Aplicar Filtros
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </>
  );

  // Regular desktop filters
  const renderDesktopFilters = () => (
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
                <SelectItem value="navio-alpha">Navio Alpha</SelectItem>
                <SelectItem value="navio-beta">Navio Beta</SelectItem>
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
  );

  const renderMobileActionMenu = (report: any) => (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="outline" size="sm">
          Ações
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={() => handleViewReport(report.id)}>
          <Eye className="mr-2 h-4 w-4" />
          <span>Visualizar</span>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={() => handleDownloadReport(report.pdfPath, report.id)}>
          <Download className="mr-2 h-4 w-4" />
          <span>Baixar</span>
        </DropdownMenuItem>
        {report.status === "pending" && (
          <>
            <DropdownMenuItem onClick={() => handleApproveReport(report.id)}>
              <CheckSquare className="mr-2 h-4 w-4 text-green-600" />
              <span>Aprovar</span>
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => handleRejectReport(report.id)}>
              <XOctagon className="mr-2 h-4 w-4 text-red-600" />
              <span>Recusar</span>
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl md:text-3xl font-bold">Relatórios</h1>
          <p className="text-muted-foreground">
            Gerencie os relatórios de serviço
          </p>
        </div>
      </div>

      {/* Filters */}
      {isMobile ? renderMobileFilters() : renderDesktopFilters()}

      {/* Mobile view - cards */}
      {isMobile && (
        <div className="mt-4">
          {reports.map(report => renderMobileCard(report))}
        </div>
      )}

      {/* Desktop view - table */}
      {!isMobile && (
        <Card>
          <CardContent className="pt-6 overflow-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>OS</TableHead>
                  <TableHead>Empresa</TableHead>
                  <TableHead>Embarcação</TableHead>
                  <TableHead>Data</TableHead>
                  <TableHead>Técnico</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {reports.map((report) => (
                  <TableRow key={report.id}>
                    <TableCell className="font-medium">{report.orderNumber}</TableCell>
                    <TableCell>{report.companyName}</TableCell>
                    <TableCell>{report.vesselName}</TableCell>
                    <TableCell>
                      {report.date.toLocaleDateString()}
                    </TableCell>
                    <TableCell>{report.technician}</TableCell>
                    <TableCell>
                      {renderStatusBadge(report.status)}
                    </TableCell>
                    <TableCell className="text-right space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleViewReport(report.id)}
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadReport(report.pdfPath, report.id)}
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                      {report.status === "pending" && (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-green-600 hover:text-green-700 hover:bg-green-50"
                            onClick={() => handleApproveReport(report.id)}
                          >
                            <CheckSquare className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-600 hover:text-red-700 hover:bg-red-50"
                            onClick={() => handleRejectReport(report.id)}
                          >
                            <XOctagon className="h-4 w-4" />
                          </Button>
                        </>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}

      {/* Reject Dialog */}
      <AlertDialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Recusar Relatório</AlertDialogTitle>
            <AlertDialogDescription>
              Por favor, informe o motivo da recusa do relatório.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <Textarea
            placeholder="Digite o motivo da recusa..."
            value={rejectionReason}
            onChange={(e) => setRejectionReason(e.target.value)}
            className="min-h-[100px]"
          />
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => {
              setRejectionReason("");
              setSelectedReportId(null);
            }}>
              Cancelar
            </AlertDialogCancel>
            <AlertDialogAction onClick={confirmRejectReport}>
              Confirmar Recusa
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Reports;
