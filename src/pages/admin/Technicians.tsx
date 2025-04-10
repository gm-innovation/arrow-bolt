
import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogTrigger } from "@/components/ui/dialog";
import { TechnicianCard } from "@/components/admin/technicians/TechnicianCard";
import { NewTechnicianForm } from "@/components/admin/technicians/NewTechnicianForm";
import { Plus, Search } from "lucide-react";
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

// Mock data for technicians
const mockTechnicians = [
  {
    id: "1",
    name: "João Silva",
    role: "Técnico de Manutenção",
    email: "joao.silva@naval.com",
    phone: "(11) 98765-4321",
    isActive: true,
  },
  {
    id: "2",
    name: "Maria Oliveira",
    role: "Técnico de Refrigeração",
    email: "maria.oliveira@naval.com",
    phone: "(21) 98765-4321",
    isActive: true,
  },
  {
    id: "3",
    name: "Pedro Santos",
    role: "Técnico de Eletrônica",
    email: "pedro.santos@naval.com",
    phone: "(31) 98765-4321",
    isActive: false,
  },
  {
    id: "4",
    name: "Ana Costa",
    role: "Técnico de Mecânica",
    email: "ana.costa@naval.com",
    phone: "(41) 98765-4321",
    isActive: true,
  },
  {
    id: "5",
    name: "Carlos Ferreira",
    role: "Auxiliar Técnico",
    email: "carlos.ferreira@naval.com",
    phone: "(51) 98765-4321",
    isActive: true,
  },
];

const Technicians = () => {
  const { toast } = useToast();
  const [technicians, setTechnicians] = useState(mockTechnicians);
  const [isNewTechnicianOpen, setIsNewTechnicianOpen] = useState(false);
  const [isEditTechnicianOpen, setIsEditTechnicianOpen] = useState(false);
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false);
  const [selectedTechnician, setSelectedTechnician] = useState<any>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");

  // Filter technicians based on search term and status filter
  const filteredTechnicians = technicians.filter((tech) => {
    const matchesSearch = tech.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                         tech.email.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = statusFilter === "all" || 
                         (statusFilter === "active" && tech.isActive) || 
                         (statusFilter === "inactive" && !tech.isActive);
    
    return matchesSearch && matchesStatus;
  });

  const handleCreateTechnician = (data: any) => {
    const newTechnician = {
      id: (technicians.length + 1).toString(),
      ...data,
    };
    
    setTechnicians([...technicians, newTechnician]);
    setIsNewTechnicianOpen(false);
    
    toast({
      title: "Técnico adicionado",
      description: `${data.name} foi adicionado com sucesso.`,
    });
  };

  const handleEditClick = (id: string) => {
    const technician = technicians.find((t) => t.id === id);
    if (technician) {
      setSelectedTechnician(technician);
      setIsEditTechnicianOpen(true);
    }
  };

  const handleUpdateTechnician = (data: any) => {
    setTechnicians(
      technicians.map((tech) =>
        tech.id === selectedTechnician.id ? { ...tech, ...data } : tech
      )
    );
    
    setIsEditTechnicianOpen(false);
    setSelectedTechnician(null);
    
    toast({
      title: "Técnico atualizado",
      description: `${data.name} foi atualizado com sucesso.`,
    });
  };

  const handleDeleteClick = (id: string) => {
    const technician = technicians.find((t) => t.id === id);
    if (technician) {
      setSelectedTechnician(technician);
      setIsDeleteDialogOpen(true);
    }
  };

  const handleConfirmDelete = () => {
    setTechnicians(technicians.filter((tech) => tech.id !== selectedTechnician.id));
    setIsDeleteDialogOpen(false);
    
    toast({
      title: "Técnico removido",
      description: `${selectedTechnician.name} foi removido com sucesso.`,
    });
    
    setSelectedTechnician(null);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <h1 className="text-2xl sm:text-3xl font-bold">Técnicos</h1>
        
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
      
      {filteredTechnicians.length === 0 ? (
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
