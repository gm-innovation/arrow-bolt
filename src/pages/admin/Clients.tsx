import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Users, Search, UserPlus, Edit, Phone, Mail, Ship, History, Loader2, Trash, Download, Eye, Link2, Unlink, Crown, ChevronDown, ChevronRight, ChevronLeft, X, EyeOff } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
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
import { useDebounce } from "@/hooks/useDebounce";
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
  omie_client_id: string | number | null;
  ignore_omie_sync: boolean | null;
  vessels: Array<{
    id: string;
    name: string;
    vessel_type: string | null;
  }>;
}

type BulkAction =
  | "delete"
  | "ignore_omie"
  | "unignore_omie"
  | "status_active"
  | "status_inactive"
  | "status_prospect"
  | "status_churned";

const STATUS_BY_ACTION: Record<string, string> = {
  status_active: "active",
  status_inactive: "inactive",
  status_prospect: "prospect",
  status_churned: "churned",
};

const BULK_LABELS: Record<string, string> = {
  delete: "Excluir selecionados",
  ignore_omie: "Ignorar na sincronização do Omie",
  unignore_omie: "Voltar a sincronizar com Omie",
  status_active: "Marcar como Ativo",
  status_inactive: "Marcar como Inativo",
  status_prospect: "Marcar como Prospect",
  status_churned: "Marcar como Perdido",
};

const chunk = <T,>(arr: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

type OriginFilter = "all" | "manual" | "omie" | "omie_ignored";

const PAGE_SIZE = 50;

const Clients = () => {
  const [searchTerm, setSearchTerm] = useState("");
  const debouncedSearch = useDebounce(searchTerm, 400);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(0);
  const [companyId, setCompanyId] = useState<string | null>(null);
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
  const [originFilter, setOriginFilter] = useState<OriginFilter>("all");
  const [bulkAction, setBulkAction] = useState<BulkAction | "">("");
  const [bulkConfirmOpen, setBulkConfirmOpen] = useState(false);
  const [alsoBlocklist, setAlsoBlocklist] = useState(true);
  const [bulkRunning, setBulkRunning] = useState(false);
  const { user, userRole } = useAuth();
  const { toast } = useToast();

  const canManage = userRole === "coordinator" || userRole === "super_admin";

  // Get company_id once
  useEffect(() => {
    const getCompanyId = async () => {
      const { data } = await supabase
        .from("profiles")
        .select("company_id")
        .eq("id", user?.id)
        .single();
      if (data?.company_id) setCompanyId(data.company_id);
    };
    getCompanyId();
  }, [user?.id]);

  const fetchClients = useCallback(async () => {
    if (!companyId) return;
    try {
      setLoading(true);

      // Build query with server-side search
      let query = supabase
        .from("clients")
        .select(`id, name, cnpj, email, phone, address, contact_person, parent_client_id, segment, omie_client_id, ignore_omie_sync, vessels (id, name, vessel_type)`, { count: "exact" })
        .eq("company_id", companyId)
        .order("name");

      if (debouncedSearch.length >= 2) {
        query = query.ilike("name", `%${debouncedSearch}%`);
      }

      if (originFilter === "manual") {
        query = query.is("omie_client_id", null);
      } else if (originFilter === "omie") {
        query = query.not("omie_client_id", "is", null).eq("ignore_omie_sync", false);
      } else if (originFilter === "omie_ignored") {
        query = query.eq("ignore_omie_sync", true);
      }

      // Pagination
      const from = page * PAGE_SIZE;
      const to = from + PAGE_SIZE - 1;
      query = query.range(from, to);

      const { data, error, count } = await query;
      if (error) throw error;
      setClients((data as Client[]) || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error("Error fetching clients:", error);
      toast({ title: "Erro ao carregar clientes", description: "Não foi possível carregar a lista de clientes", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [companyId, debouncedSearch, page, originFilter]);

  useEffect(() => {
    fetchClients();
  }, [fetchClients]);

  // Reset page when search/filter changes
  useEffect(() => {
    setPage(0);
  }, [debouncedSearch, originFilter]);

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

  // For select all, include visible children too
  const allVisibleIds = useMemo(() => {
    const ids: string[] = [];
    topLevelClients.forEach(p => {
      ids.push(p.id);
      (childrenMap[p.id] || []).forEach(c => ids.push(c.id));
    });
    return ids;
  }, [topLevelClients, childrenMap]);

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
  const selectedHasOmie = selectedClients.some(c => c.omie_client_id);

  const openBulkConfirm = () => {
    if (!bulkAction || selectedIds.size === 0) return;
    setAlsoBlocklist(selectedHasOmie);
    setBulkConfirmOpen(true);
  };

  const runBulk = async () => {
    if (!companyId || !bulkAction) return;
    const ids = Array.from(selectedIds);
    setBulkRunning(true);
    try {
      if (bulkAction === "delete") {
        if (alsoBlocklist) {
          const targets = clients.filter(c => ids.includes(c.id));
          const blockRows = targets
            .filter(c => c.omie_client_id || c.cnpj)
            .map(c => ({
              company_id: companyId,
              omie_client_id: c.omie_client_id ? String(c.omie_client_id) : null,
              cnpj: c.cnpj || null,
              reason: 'Excluído manualmente',
              blocked_by: user?.id ?? null,
            }));
          if (blockRows.length > 0) {
            const { error: blErr } = await supabase.from('omie_sync_blocklist' as any).insert(blockRows as any);
            if (blErr) throw blErr;
          }
        }
        // Remove vessels first to avoid FK violations
        await supabase.from("vessels").delete().in("client_id", ids);

        let deleted = 0;
        let failed = 0;
        const errs: string[] = [];
        for (const batch of chunk(ids, 100)) {
          const { error, count } = await supabase
            .from('clients')
            .delete({ count: 'exact' })
            .in('id', batch);
          if (error) {
            failed += batch.length;
            errs.push(error.message);
          } else {
            deleted += count || 0;
          }
        }
        if (failed === 0) {
          toast({ title: `${deleted} cliente(s) excluído(s)` });
        } else {
          toast({ title: `${deleted} excluído(s), ${failed} com vínculos`, description: errs[0] || '', variant: "destructive" });
        }
      } else if (bulkAction === "ignore_omie" || bulkAction === "unignore_omie") {
        const patch = { ignore_omie_sync: bulkAction === "ignore_omie" };
        for (const batch of chunk(ids, 200)) {
          const { error } = await supabase.from('clients').update(patch as any).in('id', batch);
          if (error) throw error;
        }
        toast({ title: `${ids.length} cliente(s) atualizado(s)` });
      } else if (STATUS_BY_ACTION[bulkAction]) {
        const patch = { commercial_status: STATUS_BY_ACTION[bulkAction] };
        for (const batch of chunk(ids, 200)) {
          const { error } = await supabase.from('clients').update(patch as any).in('id', batch);
          if (error) throw error;
        }
        toast({ title: `${ids.length} cliente(s) atualizado(s)` });
      }
      setSelectedIds(new Set());
      setBulkConfirmOpen(false);
      setBulkAction("");
      fetchClients();
    } catch (e: any) {
      toast({ title: "Erro na ação em massa", description: e.message, variant: "destructive" });
    } finally {
      setBulkRunning(false);
    }
  };


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

  const totalPages = Math.ceil(totalCount / PAGE_SIZE);

  const renderClientRow = (client: Client, isChild: boolean = false) => (
    <div
      key={client.id}
      className={`flex items-center justify-between p-4 border rounded-lg hover:bg-accent/50 transition-colors ${
        isChild ? "ml-10 border-dashed bg-muted/30" : ""
      } ${selectedIds.has(client.id) ? "bg-accent/30" : ""}`}
    >
      <div className="flex items-center gap-4 flex-1 min-w-0">
        <Checkbox
          checked={selectedIds.has(client.id)}
          onCheckedChange={() => toggleSelect(client.id)}
          className="shrink-0"
        />
        {!isChild && (childrenMap[client.id]?.length > 0) ? (
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" onClick={() => toggleExpand(client.id)}>
            {expandedIds.has(client.id) ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        ) : (
          <div className={isChild ? "" : "w-8 shrink-0"} />
        )}
        <div className="bg-primary p-2 rounded-full shrink-0">
          <Users className="h-4 w-4 text-primary-foreground" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 min-w-0">
            <h4 className="font-semibold truncate">{client.name}</h4>
...
          </div>
          <div className="flex items-center gap-4 text-sm text-muted-foreground min-w-0">
            {client.email && (
              <span
                className="flex items-center gap-1 min-w-0 max-w-[420px]"
                title={client.email}
              >
                <Mail className="h-3 w-3 shrink-0" />
                <span className="truncate">{client.email}</span>
              </span>
            )}
            {client.phone && <span className="flex items-center gap-1 whitespace-nowrap shrink-0"><Phone className="h-3 w-3" />{client.phone}</span>}
            {client.vessels.length > 0 && <span className="flex items-center gap-1 whitespace-nowrap shrink-0"><Ship className="h-3 w-3" />{client.vessels.length} embarcaç{client.vessels.length === 1 ? "ão" : "ões"}</span>}
          </div>
        </div>
      </div>
      <div className="flex items-center gap-2 shrink-0">
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

  if (loading && clients.length === 0) {
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
          <div className="flex items-center gap-4 flex-wrap">
            <Checkbox
              checked={allVisibleIds.length > 0 && selectedIds.size === allVisibleIds.length}
              onCheckedChange={toggleAll}
            />
            <Input placeholder="Buscar clientes..." className="max-w-sm" type="search" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
            {canManage && (
              <Select value={originFilter} onValueChange={(v) => setOriginFilter(v as OriginFilter)}>
                <SelectTrigger className="w-[200px] h-9">
                  <SelectValue placeholder="Origem" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Todas as origens</SelectItem>
                  <SelectItem value="manual">Manual</SelectItem>
                  <SelectItem value="omie">Omie</SelectItem>
                  <SelectItem value="omie_ignored">Omie ignorado</SelectItem>
                </SelectContent>
              </Select>
            )}
            {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
            <span className="text-sm text-muted-foreground whitespace-nowrap">
              {totalCount} cliente{totalCount !== 1 ? "s" : ""}
            </span>
          </div>
          {canManage && selectedIds.size > 0 && (
            <div className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/40 px-3 py-2 mt-3">
              <span className="text-sm font-medium">{selectedIds.size} selecionado(s)</span>
              <Button variant="ghost" size="sm" className="gap-1 h-7" onClick={() => setSelectedIds(new Set())}>
                <X className="h-3 w-3" /> Limpar
              </Button>
              <div className="flex-1" />
              <Select value={bulkAction} onValueChange={(v) => setBulkAction(v as BulkAction)}>
                <SelectTrigger className="w-[280px] h-9 bg-background">
                  <SelectValue placeholder="Ações em massa..." />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="status_active">Marcar como Ativo</SelectItem>
                  <SelectItem value="status_prospect">Marcar como Prospect</SelectItem>
                  <SelectItem value="status_inactive">Marcar como Inativo</SelectItem>
                  <SelectItem value="status_churned">Marcar como Perdido</SelectItem>
                  <SelectItem value="ignore_omie">Ignorar na sincronização do Omie</SelectItem>
                  <SelectItem value="unignore_omie">Voltar a sincronizar com Omie</SelectItem>
                  <SelectItem value="delete">Excluir selecionados</SelectItem>
                </SelectContent>
              </Select>
              <Button onClick={openBulkConfirm} disabled={!bulkAction || bulkRunning} size="sm">Aplicar</Button>
            </div>
          )}
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {topLevelClients.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                {debouncedSearch.length >= 2 ? "Nenhum cliente encontrado" : "Nenhum cliente cadastrado"}
              </div>
            ) : (
              topLevelClients.map((client) => {
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

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between mt-4 pt-4 border-t">
              <span className="text-sm text-muted-foreground">
                Página {page + 1} de {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.max(0, p - 1))}
                  disabled={page === 0}
                >
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Anterior
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setPage(p => Math.min(totalPages - 1, p + 1))}
                  disabled={page >= totalPages - 1}
                >
                  Próximo
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              </div>
            </div>
          )}
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

      <AlertDialog open={bulkConfirmOpen} onOpenChange={setBulkConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{bulkAction ? BULK_LABELS[bulkAction] : ""}</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação afetará <strong>{selectedIds.size}</strong> cliente(s).
              {bulkAction === "delete" && " A exclusão é permanente. Embarcações associadas também serão removidas. Clientes com OS, oportunidades ou outros vínculos não poderão ser removidos."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          {bulkAction === "delete" && selectedHasOmie && (
            <div className="flex items-start gap-2 rounded-md border p-3 bg-muted/40">
              <Checkbox
                id="blocklist"
                checked={alsoBlocklist}
                onCheckedChange={(v) => setAlsoBlocklist(!!v)}
              />
              <Label htmlFor="blocklist" className="text-sm font-normal leading-snug cursor-pointer">
                Marcar também para <strong>ignorar nas próximas sincronizações do Omie</strong> (impede que voltem a ser criados).
              </Label>
            </div>
          )}
          <AlertDialogFooter>
            <AlertDialogCancel disabled={bulkRunning}>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={runBulk} disabled={bulkRunning}>
              {bulkRunning ? "Aplicando..." : "Confirmar"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default Clients;
