import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Search, UserPlus, Edit, Phone, Mail, Ship, History, Loader2, Trash, Download, Eye, Link2, Unlink, Crown, ChevronDown, ChevronRight } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { exportToCSV } from "@/lib/exportUtils";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { NewClientForm } from "@/components/admin/clients/NewClientForm";
import { ClientHistoryDialog } from "@/components/admin/clients/ClientHistoryDialog";
import { ClientViewDialog } from "@/components/admin/clients/ClientViewDialog";
import { ClientGroupDialog } from "@/components/commercial/clients/ClientGroupDialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Badge } from "@/components/ui/badge";
import { useEffect, useState, useMemo, useCallback } from "react";
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
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const { user } = useAuth();
  const { toast } = useToast();

  const fetchClients = async () => {
    try {
      setLoading(true);
      const { data: profileData } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user?.id)
        .single();

      if (!profileData?.company_id) {
        toast({ title: "Erro", description: "Empresa não encontrada", variant: "destructive" });
        return;
      }

      const { data, error } = await supabase
        .from("clients")
        .select(`id, name, cnpj, email, phone, address, contact_person, parent_client_id, segment, vessels (id, name, vessel_type)`)
        .eq("company_id", profileData.company_id)
        .order("name");

      if (error) throw error;
      setClients((data as Client[]) || []);
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast({ title: "Erro ao carregar clientes", description: "Não foi possível carregar a lista de clientes", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchClients(); }, []);

  // Build children map
  const childrenMap = useMemo(() => {
    const map: Record<string, Client[]> = {};
    clients.forEach(c => {
      if (c.parent_client_id) {
        if (!map[c.parent_client_id]) map[c.parent_client_id] = [];
        map[c.parent_client_id].push(c);
      }
    });
    return map;
  }, [clients]);

  // Top-level clients: no parent OR parent not in current list (orphan reference)
  const topLevelClients = useMemo(() => {
    const clientIds = new Set(clients.map(c => c.id));
    return clients.filter(c => !c.parent_client_id || !clientIds.has(c.parent_client_id));
  }, [clients]);

  const filteredTopLevel = useMemo(() => {
    if (!searchTerm) return topLevelClients;
    const term = searchTerm.toLowerCase();
    return topLevelClients.filter(client => {
      // Match parent
      if (client.name.toLowerCase().includes(term) || client.email?.toLowerCase().includes(term)) return true;
      // Match any child
      const children = childrenMap[client.id] || [];
      return children.some(c => c.name.toLowerCase().includes(term) || c.email?.toLowerCase().includes(term));
    });
  }, [topLevelClients, childrenMap, searchTerm]);

  // For select all, include visible children too
  const allVisibleIds = useMemo(() => {
    const ids: string[] = [];
    filteredTopLevel.forEach(p => {
      ids.push(p.id);
      (childrenMap[p.id] || []).forEach(c => ids.push(c.id));
    });
    return ids;
  }, [filteredTopLevel, childrenMap]);

  const toggleExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  }, []);

  const handleDeleteClient = async () => {
    if (!clientToDelete) return;
    try {
      const { error: vesselsError } = await supabase.from("vessels").delete().eq("client_id", clientToDelete);
      if (vesselsError) throw vesselsError;
      const { error } = await supabase.from("clients").delete().eq("id", clientToDelete);
      if (error) throw error;
      toast({ title: "Cliente excluído", description: "O cliente foi excluído com sucesso" });
      fetchClients();
    } catch (error) {
      console.error("Error deleting client:", error);
      toast({ title: "Erro ao excluir cliente", description: "Não foi possível excluir o cliente", variant: "destructive" });
    } finally {
      setDeleteDialogOpen(false);
      setClientToDelete(null);
    }
  };

  const handleExport = () => {
    try {
      const exportData = allVisibleIds.map(id => {
        const client = clients.find(c => c.id === id)!;
        return {
          nome: client.name,
          email: client.email || "-",
          telefone: client.phone || "-",
          endereco: client.address || "-",
          contato: client.contact_person || "-",
          embarcacoes: client.vessels.length,
        };
      });
      const headers = { nome: "Nome", email: "Email", telefone: "Telefone", endereco: "Endereço", contato: "Pessoa de Contato", embarcacoes: "Nº Embarcações" };
      exportToCSV(exportData, `clientes-${new Date().toISOString().split('T')[0]}`, headers);
      toast({ title: "Exportação concluída", description: `${exportData.length} clientes exportados com sucesso` });
    } catch (error: any) {
      toast({ title: "Erro ao exportar", description: error.message, variant: "destructive" });
    }
  };

  const toggleSelect = (id: string) => {
    setSelectedIds(prev => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (selectedIds.size === allVisibleIds.length) {
      setSelectedIds(new Set());
    } else {
      setSelectedIds(new Set(allVisibleIds));
    }
  };

  const selectedClients = clients.filter(c => selectedIds.has(c.id));

  const handleGroup = async (parentId: string, childIds: string[]) => {
    setGroupLoading(true);
    try {
      for (const childId of childIds) {
        const { error } = await supabase.from("clients").update({ parent_client_id: parentId }).eq("id", childId);
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
        await supabase.from("clients").update({ parent_client_id: null }).eq("id", id);
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

  const renderClientRow = (client: Client, isChild: boolean = false) => (
    <div
      key={client.id}
      className={`flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors ${
        isChild ? "ml-10 border-dashed bg-muted/30" : ""
      } ${selectedIds.has(client.id) ? "bg-accent/30" : ""}`}
    >
      <div className="flex items-center gap-4 flex-1">
        <Checkbox
          checked={selectedIds.has(client.id)}
          onCheckedChange={() => toggleSelect(client.id)}
        />
        {!isChild && (childrenMap[client.id]?.length > 0) ? (
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => toggleExpand(client.id)}>
            {expandedIds.has(client.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        ) : (
          <div className={isChild ? "" : "w-8"} />
        )}
        <div className="bg-primary p-2 rounded-full">
          <Users className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold">{client.name}</h4>
            {(childrenMap[client.id]?.length > 0) && (
              <Badge variant="info" size="sm" className="gap-1">
                <Crown className="h-3 w-3" />
                {childrenMap[client.id].length} vinculado{childrenMap[client.id].length > 1 ? "s" : ""}
              </Badge>
            )}
            {client.parent_client_id && (
              <Badge variant="outline" size="sm" className="gap-1">
                <Link2 className="h-3 w-3" />
                Vinculado
              </Badge>
            )}
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground flex-wrap">
            {client.email && <span className="flex items-center gap-1"><Mail className="h-3 w-3" />{client.email}</span>}
            {client.phone && <span className="flex items-center gap-1"><Phone className="h-3 w-3" />{client.phone}</span>}
            {client.vessels.length > 0 && <span className="flex items-center gap-1"><Ship className="h-3 w-3" />{client.vessels.length} embarcaç{client.vessels.length === 1 ? "ão" : "ões"}</span>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <Button variant="outline" size="sm" onClick={() => { setViewClient(client); setViewDialogOpen(true); }}>
          <Eye className="mr-2 h-4 w-4" />Visualizar
        </Button>
        <Button variant="outline" size="sm" onClick={() => { setSelectedClientForHistory({ id: client.id, name: client.name }); setHistoryDialogOpen(true); }}>
          <History className="mr-2 h-4 w-4" />Histórico
        </Button>
        <Dialog open={editClientDialogOpen && selectedClient?.id === client.id} onOpenChange={(open) => {
          setEditClientDialogOpen(open);
          if (!open) { setSelectedClient(null); fetchClients(); }
        }}>
          <DialogTrigger asChild>
            <Button variant="outline" size="sm" onClick={() => { setSelectedClient(client); setEditClientDialogOpen(true); }}>
              <Edit className="mr-2 h-4 w-4" />Editar
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader><DialogTitle>Editar Cliente - {client.name}</DialogTitle></DialogHeader>
            <NewClientForm clientData={selectedClient} onSuccess={() => { setEditClientDialogOpen(false); setSelectedClient(null); fetchClients(); }} />
          </DialogContent>
        </Dialog>
        <Button variant="outline" size="sm" onClick={() => { setClientToDelete(client.id); setDeleteDialogOpen(true); }}>
          <Trash className="h-4 w-4 text-destructive" />
        </Button>
      </div>
    </div>
  );

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <Skeleton className="h-9 w-32" />
          <div className="flex gap-2"><Skeleton className="h-10 w-28" /><Skeleton className="h-10 w-40" /></div>
        </div>
        <Card>
          <CardHeader><Skeleton className="h-10 w-64" /></CardHeader>
          <CardContent>
            <div className="space-y-4">{[1, 2, 3, 4].map((i) => <Skeleton key={i} className="h-24 w-full" />)}</div>
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
          <Button variant="outline" onClick={handleExport} disabled={allVisibleIds.length === 0}>
            <Download className="mr-2 h-4 w-4" />Exportar
          </Button>
          {selectedIds.size >= 2 && (
            <Button variant="outline" onClick={() => setGroupDialogOpen(true)} disabled={groupLoading}>
              <Link2 className="mr-2 h-4 w-4" />Agrupar ({selectedIds.size})
            </Button>
          )}
          {selectedIds.size >= 1 && selectedClients.some(c => c.parent_client_id) && (
            <Button variant="outline" onClick={handleUngroup} disabled={groupLoading}>
              <Unlink className="mr-2 h-4 w-4" />Desagrupar
            </Button>
          )}
          <Dialog open={newClientDialogOpen} onOpenChange={setNewClientDialogOpen}>
            <DialogTrigger asChild>
              <Button><UserPlus className="mr-2 h-4 w-4" />Novo Cliente</Button>
            </DialogTrigger>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader><DialogTitle>Novo Cliente</DialogTitle></DialogHeader>
              <NewClientForm onSuccess={() => { setNewClientDialogOpen(false); fetchClients(); }} />
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-4">
            <Checkbox
              checked={allVisibleIds.length > 0 && selectedIds.size === allVisibleIds.length}
              onCheckedChange={toggleAll}
            />
            <Input placeholder="Buscar clientes..." className="max-w-sm" type="search" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            <Button variant="outline"><Search className="h-4 w-4" /></Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {filteredTopLevel.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">Nenhum cliente encontrado</div>
            ) : (
              filteredTopLevel.map((client) => {
                const children = childrenMap[client.id] || [];
                const isExpanded = expandedIds.has(client.id);
                return (
                  <div key={client.id}>
                    {renderClientRow(client, false)}
                    {children.length > 0 && isExpanded && (
                      <div className="space-y-2 mt-2">
                        {children.map(child => renderClientRow(child, true))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        </CardContent>
      </Card>

      {selectedClientForHistory && (
        <ClientHistoryDialog clientId={selectedClientForHistory.id} clientName={selectedClientForHistory.name} open={historyDialogOpen} onOpenChange={setHistoryDialogOpen} />
      )}

      <ClientViewDialog open={viewDialogOpen} onOpenChange={setViewDialogOpen} client={viewClient} />

      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja excluir este cliente? Esta ação não pode ser desfeita e também excluirá todas as embarcações associadas.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel onClick={() => setClientToDelete(null)}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteClient} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">Excluir</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      <ClientGroupDialog open={groupDialogOpen} onOpenChange={setGroupDialogOpen} selectedClients={selectedClients} onConfirm={handleGroup} isLoading={groupLoading} />
    </div>
  );
};

export default Clients;
