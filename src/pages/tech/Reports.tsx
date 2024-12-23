import { useState } from "react";
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
import { FileText, Download } from "lucide-react";

// Mock data - replace with real API calls
const mockReports = [
  {
    id: "REL001",
    vesselName: "Navio Alpha",
    status: "in_progress",
    createdAt: new Date(),
  },
];

const TechReports = () => {
  const navigate = useNavigate();
  const [vesselFilter, setVesselFilter] = useState("");
  const [dateFilter, setDateFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  const handleExportReports = () => {
    console.log("Exporting reports...");
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
                      Editar
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
};

export default TechReports;