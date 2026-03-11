import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Search, UserPlus, Edit, Phone, Mail, Ship, History, Loader2, Trash, Download, Eye, Link2, Unlink, Crown } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { exportToCSV } from "@/lib/exportUtils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { NewClientForm } from "@/components/admin/clients/NewClientForm";
import { ClientHistoryDialog } from "@/components/admin/clients/ClientHistoryDialog";
import { ClientViewDialog } from "@/components/admin/clients/ClientViewDialog";
import { ClientGroupDialog } from "@/components/commercial/clients/ClientGroupDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState, useMemo } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/components/ui/use-toast";
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

interface Client {
  id: string;
  name: string;
  cnpj: string | null;
  email: string | null;
  phone: string | null;
  address: string | null;
  contact_person: string | null;
  parent_client_id: string | null;
  segment: string | null;
  vessels: Array<{
    id: string;
    name: string;
    vessel_type: string | null;
  }>;
}

const Clients = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedClient, setSelectedClient] = useState<Client | null>(null);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [selectedClientForHistory, setSelectedClientForHistory] = useState<{ id: string; name: string } | null>(null);
  const [newClientDialogOpen, setNewClientDialogOpen] = useState(false);
  const [editClientDialogOpen, setEditClientDialogOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);
  const [viewDialogOpen, setViewDialogOpen] = useState(false);
  const [viewClient, setViewClient] = useState<Client | null>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [groupLoading, setGroupLoading] = useState(false);
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchClients = async () => {
    try {
      setLoading(true);

      // Get current user's company
      const { data: profileData } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user?.id)
        .single();

      if (!profileData?.company_id) {
        toast({
          title: "Erro",
          description: "Empresa não encontrada",
          variant: "destructive",
        });
        return;
      }

      // Fetch clients with their vessels
      const { data, error } = await supabase
        .from("clients")
        .select(`
          id,
          name,
          cnpj,
          email,
          phone,
          address,
          contact_person,
          parent_client_id,
          segment,
          vessels (
            id,
            name,
            vessel_type
          )
        `)
        .eq("company_id", profileData.company_id)
        .order("name");

      if (error) throw error;
      setClients((data as Client[]) || []);
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast({
        title: "Erro ao carregar clientes",
        description: "Não foi possível carregar a lista de clientes",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClients();
  }, []);

  const handleDeleteClient = async () => {
    if (!clientToDelete) return;

    try {
      // Delete associated vessels first
      const { error: vesselsError } = await supabase
        .from("vessels")
        .delete()
        .eq("client_id", clientToDelete);

      if (vesselsError) throw vesselsError;

      // Delete client
      const { error } = await supabase
        .from("clients")
        .delete()
        .eq("id", clientToDelete);

      if (error) throw error;

      toast({
        title: "Cliente excluído",
        description: "O cliente foi excluído com sucesso",
      });

      fetchClients();
    } catch (error) {
      console.error("Error deleting client:", error);
      toast({
        title: "Erro ao excluir cliente",
        description: "Não foi possível excluir o cliente",
        variant: "destructive",
      });
    } finally {
      setDeleteDialogOpen(false);
      setClientToDelete(null);
    }
  };

  const handleExport = () => {
    try {
      const exportData = filteredClients.map(client => ({
        nome: client.name,
        email: client.email || "-",
        telefone: client.phone || "-",
        endereco: client.address || "-",
        contato: client.contact_person || "-",
        embarcacoes: client.vessels.length,
      }));

      const headers = {
        nome: "Nome",
        email: "Email",
        telefone: "Telefone",
        endereco: "Endereço",
        contato: "Pessoa de Contato",
        embarcacoes: "Nº Embarcações",
      };

      exportToCSV(exportData, `clientes-${new Date().toISOString().split('T')[0]}`, headers);
      
      toast({
        title: "Exportação concluída",
        description: `${exportData.length} clientes exportados com sucesso`,
      });
    } catch (error: any) {
      toast({
        title: "Erro ao exportar",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const filteredClients = clients.filter(client =>
    client.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    client.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    ""
  );

  const childCountMap = useMemo(() => {
    const map: Record<string, number> = {};
    clients.forEach(c => {
      if (c.parent_client_id) {
        map[c.parent_client_id] = (map[c.parent_client_id] || 0) + 1;
      }
    });
    return map;
  }, [clients]);

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === filteredClients.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(filteredClients.map(c => c.id)));
    }
  };

  const selectedClients = filteredClients.filter(c => selectedIds.has(c.id));

  const handleGroup = async (parentId: string, childIds: string[]) => {
    setGroupLoading(true);
    try {
      for (const childId of childIds) {
        const { error } = await supabase
          .from("clients")
          .update({ parent_client_id: parentId })
          .eq("id", childId);
        if (error) throw error;
      }
      toast({ title: "Clientes agrupados com sucesso" });
      setGroupDialogOpen(false);
      setSelectedIds(new Set());
      fetchClients();
    } catch (error) {
      console.error(error);
      toast({ title: "Erro ao agrupar", variant: "destructive" });
    } finally {
      setGroupLoading(false);
    }
  };

  const handleUngroup = async () => {
    setGroupLoading(true);
    try {
      for (const id of selectedIds) {
        await supabase
          .from("clients")
          .update({ parent_client_id: null })
          .eq("id", id);
      }
      toast({ title: "Clientes desagrupados com sucesso" });
      setSelectedIds(new Set());
      fetchClients();
    } catch (error) {
      console.error(error);
      toast({ title: "Erro ao desagrupar", variant: "destructive" });
    } finally {
      setGroupLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-9 w-32" />
          <div className="flex gap-2">
            <Skeleton className="h-10 w-28" />
            <Skeleton className="h-10 w-40" />
          </div>
        </div>
        <Card>
          <CardHeader>
            <Skeleton className="h-10 w-64" />
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {[1, 2, 3, 4].map((i) => (
                <Skeleton key={i} className="h-24 w-full" />
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
        <h1 className="text-3xl font-bold">Clientes</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={handleExport} disabled={filteredClients.length === 0}>
            <Download className="mr-2 h-4 w-4" />
            Exportar
          </Button>
          <Dialog open={newClientDialogOpen} onOpenChange={setNewClientDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <UserPlus className="mr-2 h-4 w-4" />
                Novo Cliente
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Novo Cliente</DialogTitle>
              </DialogHeader>
              <NewClientForm 
                onSuccess={() => {
                  setNewClientDialogOpen(false);
                  fetchClients();
                }}
              />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Input 
              placeholder="Buscar clientes..." 
              className="max-w-sm"
              type="search"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
            <Button variant="outline">
              <Search className="h-4 w-4" />
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredClients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                Nenhum cliente encontrado
              </div>
            ) : (
              filteredClients.map((client) => (
                <div
                  key={client.id}
                  className="flex items-center justify-between p-4 border rounded-lg hover:bg-slate-50"
                >
                  <div className="flex items-center gap-4 flex-1">
                    <div className="bg-primary p-2 rounded-full">
                      <Users className="h-4 w-4 text-primary-foreground" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold">{client.name}</h4>
                      <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
                        {client.email && (
                          <span className="flex items-center gap-1">
                            <Mail className="h-3 w-3" />
                            {client.email}
                          </span>
                        )}
                        {client.phone && (
                          <span className="flex items-center gap-1">
                            <Phone className="h-3 w-3" />
                            {client.phone}
                          </span>
                        )}
                        {client.vessels.length > 0 && (
                          <span className="flex items-center gap-1">
                            <Ship className="h-3 w-3" />
                            {client.vessels.length} embarcaç{client.vessels.length === 1 ? "ão" : "ões"}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setViewClient(client);
                        setViewDialogOpen(true);
                      }}
                    >
                      <Eye className="mr-2 h-4 w-4" />
                      Visualizar
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedClientForHistory({ id: client.id, name: client.name });
                        setHistoryDialogOpen(true);
                      }}
                    >
                      <History className="mr-2 h-4 w-4" />
                      Histórico
                    </Button>
                    <Dialog open={editClientDialogOpen && selectedClient?.id === client.id} onOpenChange={(open) => {
                      setEditClientDialogOpen(open);
                      if (!open) {
                        setSelectedClient(null);
                        fetchClients();
                      }
                    }}>
                      <DialogTrigger asChild>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          onClick={() => {
                            setSelectedClient(client);
                            setEditClientDialogOpen(true);
                          }}
                        >
                          <Edit className="mr-2 h-4 w-4" />
                          Editar
                        </Button>
                      </DialogTrigger>
                      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                          <DialogTitle>Editar Cliente - {client.name}</DialogTitle>
                        </DialogHeader>
                        <NewClientForm 
                          clientData={selectedClient}
                          onSuccess={() => {
                            setEditClientDialogOpen(false);
                            setSelectedClient(null);
                            fetchClients();
                          }}
                        />
                      </DialogContent>
                    </Dialog>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setClientToDelete(client.id);
                        setDeleteDialogOpen(true);
                      }}
                    >
                      <Trash className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>

      {selectedClientForHistory && (
        <ClientHistoryDialog
          clientId={selectedClientForHistory.id}
          clientName={selectedClientForHistory.name}
          open={historyDialogOpen}
          onOpenChange={setHistoryDialogOpen}
        />
      )}

      <ClientViewDialog
        open={viewDialogOpen}
        onOpenChange={setViewDialogOpen}
        client={viewClient}
      />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>
              Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita e também excluirá todas as embarcações associadas.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setClientToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteClient} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Clients;
