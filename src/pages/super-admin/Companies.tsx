import { useState, useMemo } from "react";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
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
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Building2, Download, MoreHorizontal, Plus } from "lucide-react";
import { format } from "date-fns";
import { useCompanies, type Company } from "@/hooks/useCompanies";
import { NewCompanyDialog } from "@/components/super-admin/companies/NewCompanyDialog";
import { EditCompanyDialog } from "@/components/super-admin/companies/EditCompanyDialog";
import { exportToCSV } from "@/lib/exportUtils";
import { toast } from "sonner";

const Companies = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [planFilter, setPlanFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [newDialogOpen, setNewDialogOpen] = useState(false);
  const [editDialogOpen, setEditDialogOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [companyToDelete, setCompanyToDelete] = useState<Company | null>(null);

  const { companies, isLoading, deleteCompany } = useCompanies();

  const filteredCompanies = useMemo(() => {
    return companies.filter((company) => {
      const matchesSearch = company.name
        .toLowerCase()
        .includes(searchTerm.toLowerCase());
      const matchesPlan = !planFilter || company.subscription_plan === planFilter;
      const matchesStatus = !statusFilter || company.payment_status === statusFilter;
      return matchesSearch && matchesPlan && matchesStatus;
    });
  }, [companies, searchTerm, planFilter, statusFilter]);

  const handleExport = () => {
    const exportData = filteredCompanies.map((c) => ({
      Nome: c.name,
      Email: c.email || "",
      Telefone: c.phone || "",
      Endereço: c.address || "",
      Plano: c.subscription_plan || "",
      Status: c.payment_status || "",
      "Data de Criação": format(new Date(c.created_at), "dd/MM/yyyy"),
    }));
    exportToCSV(exportData, "empresas");
    toast.success("Lista exportada com sucesso!");
  };

  const handleEdit = (company: Company) => {
    setSelectedCompany(company);
    setEditDialogOpen(true);
  };

  const handleDeleteClick = (company: Company) => {
    setCompanyToDelete(company);
    setDeleteDialogOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!companyToDelete) return;
    
    try {
      await deleteCompany.mutateAsync(companyToDelete.id);
      toast.success("Empresa excluída com sucesso!");
      setDeleteDialogOpen(false);
      setCompanyToDelete(null);
    } catch (error: any) {
      console.error("Erro ao excluir empresa:", error);
      toast.error(error.message || "Erro ao excluir empresa");
    }
  };

  const getStatusBadgeColor = (status: string | null) => {
    switch (status) {
      case "paid":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400";
      case "pending":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400";
      case "overdue":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400";
      default:
        return "bg-muted text-muted-foreground";
    }
  };

  const getStatusLabel = (status: string | null) => {
    switch (status) {
      case "paid":
        return "Pago";
      case "pending":
        return "Pendente";
      case "overdue":
        return "Atrasado";
      default:
        return "N/A";
    }
  };

  const getPlanLabel = (plan: string | null) => {
    switch (plan) {
      case "basic":
        return "Basic";
      case "professional":
        return "Professional";
      case "enterprise":
        return "Enterprise";
      default:
        return "N/A";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold">Empresas</h1>
          <p className="text-muted-foreground">
            Gerencie as empresas cadastradas na plataforma
          </p>
        </div>
        <div className="flex gap-4">
          <Button onClick={() => setNewDialogOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Nova Empresa
          </Button>
          <Button variant="outline" onClick={handleExport} disabled={filteredCompanies.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Exportar Lista
          </Button>
        </div>
      </div>

      <div className="flex gap-4 items-end">
        <div className="flex-1">
          <Input
            placeholder="Buscar por nome da empresa..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        <div className="w-[200px]">
          <Select value={planFilter} onValueChange={setPlanFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Filtrar por plano" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos os planos</SelectItem>
              <SelectItem value="basic">Basic</SelectItem>
              <SelectItem value="professional">Professional</SelectItem>
              <SelectItem value="enterprise">Enterprise</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="w-[200px]">
          <Select value={statusFilter} onValueChange={setStatusFilter}>
            <SelectTrigger>
              <SelectValue placeholder="Status de pagamento" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">Todos os status</SelectItem>
              <SelectItem value="paid">Pago</SelectItem>
              <SelectItem value="pending">Pendente</SelectItem>
              <SelectItem value="overdue">Atrasado</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="border rounded-lg">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Empresa</TableHead>
              <TableHead>Plano</TableHead>
              <TableHead>Status de Pagamento</TableHead>
              <TableHead>Data de Criação</TableHead>
              <TableHead className="w-[70px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              Array.from({ length: 5 }).map((_, i) => (
                <TableRow key={i}>
                  <TableCell><Skeleton className="h-4 w-[200px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[80px]" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-[100px]" /></TableCell>
                  <TableCell><Skeleton className="h-8 w-8" /></TableCell>
                </TableRow>
              ))
            ) : filteredCompanies.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center py-8 text-muted-foreground">
                  Nenhuma empresa encontrada
                </TableCell>
              </TableRow>
            ) : (
              filteredCompanies.map((company) => (
                <TableRow key={company.id}>
                  <TableCell className="font-medium">
                    <div className="flex items-center gap-2">
                      <Building2 className="h-4 w-4 text-muted-foreground" />
                      {company.name}
                    </div>
                  </TableCell>
                  <TableCell>{getPlanLabel(company.subscription_plan)}</TableCell>
                  <TableCell>
                    <div
                      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusBadgeColor(company.payment_status)}`}
                    >
                      {getStatusLabel(company.payment_status)}
                    </div>
                  </TableCell>
                  <TableCell>
                    {format(new Date(company.created_at), "dd/MM/yyyy")}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem onClick={() => handleEdit(company)}>
                          Editar
                        </DropdownMenuItem>
                        <DropdownMenuItem className="text-destructive" onClick={() => handleDeleteClick(company)}>
                          Excluir
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>

      <NewCompanyDialog open={newDialogOpen} onOpenChange={setNewDialogOpen} />
      <EditCompanyDialog 
        open={editDialogOpen} 
        onOpenChange={setEditDialogOpen}
        company={selectedCompany}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar Exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir a empresa "{companyToDelete?.name}"? 
              Esta ação não pode ser desfeita e todos os dados relacionados serão removidos.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Companies;