import { useState, useEffect } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { Card, CardContent } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { TechnicianCard } from "@/components/admin/technicians/TechnicianCard";
import { NewTechnicianForm } from "@/components/admin/technicians/NewTechnicianForm";
import { Plus, Search, Download } from "lucide-react";
import { exportToCSV, formatBooleanForExport } from "@/lib/exportUtils";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

const Technicians = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [technicians, setTechnicians] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isNewTechnicianOpen, setIsNewTechnicianOpen] = useState(false);
  const [isEditTechnicianOpen, setIsEditTechnicianOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  useEffect(() => {
    fetchTechnicians();
  }, []);

  const fetchTechnicians = async () => {
    try {
      setLoading(true);
      const { data: profileData } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user?.id)
        .single();

      if (!profileData?.company_id) return;

      const { data, error } = await supabase
        .from("technicians")
        .select(`
          id,
          specialty,
          active,
          profiles:user_id (
            id,
            full_name,
            email,
            phone
          )
        `)
        .eq("company_id", profileData.company_id);

      if (error) throw error;

      const formattedData = data?.map((tech: any) => ({
        id: tech.id,
        name: tech.profiles?.full_name || "",
        email: tech.profiles?.email || "",
        phone: tech.profiles?.phone || "",
        role: tech.specialty || "",
        isActive: tech.active,
        userId: tech.profiles?.id,
      })) || [];

      setTechnicians(formattedData);
    } catch (error: any) {
      toast({
        title: "Erro ao carregar técnicos",
        description: error.message,
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  // Filter technicians based on search term and status filter
  const filteredTechnicians = technicians.filter((tech) => {
    const matchesSearch = tech.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         tech.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "active" && tech.isActive) || 
                         (statusFilter === "inactive" && !tech.isActive);
    
    return matchesSearch && matchesStatus;
  });

  const handleCreateTechnician = async (data: any) => {
    try {
      const { data: profileData } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user?.id)
        .single();

      if (!profileData?.company_id) throw new Error("Company not found");

      // Create auth user
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email: data.email,
        password: Math.random().toString(36).slice(-8) + "Aa1!",
        options: {
          data: {
            full_name: data.name,
          },
        },
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error("Failed to create user");

      // Update profile
      await supabase.from("profiles").update({
        full_name: data.name,
        phone: data.phone,
        company_id: profileData.company_id,
      }).eq("id", authData.user.id);

      // Create technician
      await supabase.from("technicians").insert({
        user_id: authData.user.id,
        company_id: profileData.company_id,
        specialty: data.role,
        active: data.isActive,
      });

      // Create role
      await supabase.from("user_roles").insert({
        user_id: authData.user.id,
        role: "technician",
      });

      setIsNewTechnicianOpen(false);
      fetchTechnicians();
      
      toast({
        title: "Técnico criado",
        description: `${data.name} foi adicionado com sucesso.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao criar técnico",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleEditClick = (id: string) => {
    const technician = technicians.find((t) => t.id === id);
    if (technician) {
      setSelectedTechnician(technician);
      setIsEditTechnicianOpen(true);
    }
  };

  const handleUpdateTechnician = async (data: any) => {
    try {
      if (!selectedTechnician) return;

      // Update profile
      await supabase.from("profiles").update({
        full_name: data.name,
        phone: data.phone,
      }).eq("id", selectedTechnician.userId);

      // Update technician
      await supabase.from("technicians").update({
        specialty: data.role,
        active: data.isActive,
      }).eq("id", selectedTechnician.id);

      setIsEditTechnicianOpen(false);
      setSelectedTechnician(null);
      fetchTechnicians();
      
      toast({
        title: "Técnico atualizado",
        description: `${data.name} foi atualizado com sucesso.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao atualizar técnico",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleDeleteClick = (id: string) => {
    const technician = technicians.find((t) => t.id === id);
    if (technician) {
      setSelectedTechnician(technician);
      setIsDeleteDialogOpen(true);
    }
  };

  const handleConfirmDelete = async () => {
    try {
      if (!selectedTechnician) return;

      // Delete technician record
      await supabase.from("technicians").delete().eq("id", selectedTechnician.id);

      setIsDeleteDialogOpen(false);
      setSelectedTechnician(null);
      fetchTechnicians();
      
      toast({
        title: "Técnico removido",
        description: `${selectedTechnician.name} foi removido com sucesso.`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao remover técnico",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const handleExport = () => {
    try {
      const exportData = filteredTechnicians.map(tech => ({
        nome: tech.name,
        email: tech.email,
        telefone: tech.phone || "-",
        especialidade: tech.role || "-",
        status: formatBooleanForExport(tech.isActive),
      }));

      const headers = {
        nome: "Nome",
        email: "Email",
        telefone: "Telefone",
        especialidade: "Especialidade",
        status: "Ativo",
      };

      exportToCSV(exportData, `tecnicos-${new Date().toISOString().split('T')[0]}`, headers);
      
      toast({
        title: "Exportação concluída",
        description: `${exportData.length} técnicos exportados com sucesso`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao exportar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Técnicos</h1>
        
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={filteredTechnicians.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          <Dialog open={isNewTechnicianOpen} onOpenChange={setIsNewTechnicianOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Novo Técnico
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <NewTechnicianForm 
                onSubmit={handleCreateTechnician}
                onCancel={() => setIsNewTechnicianOpen(false)}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>
      
      <div className="flex flex-col sm:flex-row justify-between gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={18} />
          <Input
            placeholder="Buscar técnicos..."
            className="pl-10"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-full sm:w-[180px]">
            <SelectValue placeholder="Filtrar por status" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos</SelectItem>
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="inactive">Inativos</SelectItem>
          </SelectContent>
        </Select>
      </div>
      
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <Card key={i}>
              <CardContent className="p-6">
                <div className="space-y-4">
                  <Skeleton className="h-12 w-12 rounded-full" />
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-4 w-1/2" />
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-full" />
                    <Skeleton className="h-4 w-2/3" />
                  </div>
                  <div className="flex gap-2">
                    <Skeleton className="h-9 flex-1" />
                    <Skeleton className="h-9 flex-1" />
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredTechnicians.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-8 text-center border rounded-lg border-dashed">
          <h3 className="text-lg font-medium">Nenhum técnico encontrado</h3>
          <p className="text-sm text-muted-foreground mt-1">
            Tente ajustar os filtros ou adicionar novos técnicos.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredTechnicians.map((technician) => (
            <TechnicianCard
              key={technician.id}
              id={technician.id}
              name={technician.name}
              role={technician.role}
              email={technician.email}
              phone={technician.phone}
              isActive={technician.isActive}
              onEdit={handleEditClick}
              onDelete={handleDeleteClick}
            />
          ))}
        </div>
      )}
      
      {/* Edit Dialog */}
      <Dialog open={isEditTechnicianOpen} onOpenChange={setIsEditTechnicianOpen}>
        <DialogContent className="max-w-2xl">
          {selectedTechnician && (
            <NewTechnicianForm
              initialData={selectedTechnician}
              onSubmit={handleUpdateTechnician}
              onCancel={() => setIsEditTechnicianOpen(false)}
              isEditing
            />
          )}
        </DialogContent>
      </Dialog>
      
      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir o técnico {selectedTechnician?.name}? Esta ação não pode ser desfeita.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleConfirmDelete} className="bg-red-500 hover:bg-red-600">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Technicians;
