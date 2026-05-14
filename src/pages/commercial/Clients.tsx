import { useState, useMemo } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Plus, Link2, Unlink, X } from "lucide-react";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ClientsTable } from "@/components/commercial/clients/ClientsTable";
import { NewClientDialog } from "@/components/commercial/clients/NewClientDialog";
import { ClientDetailSheet } from "@/components/commercial/clients/ClientDetailSheet";
import { ClientGroupDialog } from "@/components/commercial/clients/ClientGroupDialog";
import { toast } from "sonner";

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

const chunk = <T,>(arr: T[], size: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
};

const CommercialClients = () => {
  const { user, userRole } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailClient, setDetailClient] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);

  const [bulkAction, setBulkAction] = useState<BulkAction | "">("");
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [alsoBlocklist, setAlsoBlocklist] = useState(true);
  const [singleDeleteId, setSingleDeleteId] = useState<string | null>(null);

  const canManage = userRole === "coordinator" || userRole === "super_admin";

  const { data: clients = [], isLoading } = useQuery({
    queryKey: ['commercial-clients', user?.id],
    queryFn: async () => {
      const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user!.id).single();
      if (!profile?.company_id) throw new Error('Empresa não encontrada');
      const { data, error } = await supabase.from('clients').select('*').eq('company_id', profile.company_id).order('name');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user?.id,
  });

  const saveMutation = useMutation({
    mutationFn: async ({ formData, buyer, legalEntities, addresses }: { formData: Record<string, any>; buyer?: Record<string, any> | null; legalEntities?: any[]; addresses?: any[] }) => {
      const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user!.id).single();
      if (!profile?.company_id) throw new Error('Empresa não encontrada');

      let clientId: string;

      if (editingClient) {
        const { id, company_id, created_at, updated_at, ...updates } = formData;
        const { error } = await supabase.from('clients').update(updates).eq('id', editingClient.id);
        if (error) throw error;
        clientId = editingClient.id;
      } else {
        const { data: newClient, error } = await supabase.from('clients').insert({ ...formData, company_id: profile.company_id } as any).select('id').single();
        if (error) throw error;
        clientId = newClient.id;

        if (buyer && buyer.name?.trim()) {
          await supabase.from('crm_buyers').insert({
            ...buyer, client_id: clientId, company_id: profile.company_id, is_primary: true, is_active: true,
          } as any);
        }
      }

      if (legalEntities && legalEntities.length > 0) {
        for (const le of legalEntities) {
          await supabase.from('client_legal_entities').insert({
            client_id: clientId, legal_name: le.legal_name, cnpj: le.cnpj || null, is_primary: le.is_primary,
          } as any);
        }
      }

      if (addresses && addresses.length > 0) {
        for (const addr of addresses) {
          await supabase.from('client_addresses').insert({
            client_id: clientId, label: addr.label, cep: addr.cep || null, street: addr.street || null,
            street_number: addr.street_number || null, city: addr.city || null, state: addr.state || null, is_primary: addr.is_primary,
          } as any);
        }
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commercial-clients'] });
      toast.success(editingClient ? 'Cliente atualizado' : 'Cliente criado');
      setDialogOpen(false);
      setEditingClient(null);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const groupMutation = useMutation({
    mutationFn: async ({ parentId, childIds }: { parentId: string; childIds: string[] }) => {
      for (const childId of childIds) {
        const { error } = await supabase.from('clients').update({ parent_client_id: parentId } as any).eq('id', childId);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commercial-clients'] });
      toast.success('Clientes agrupados com sucesso');
      setGroupDialogOpen(false);
      setSelectedIds(new Set());
    },
    onError: (e: any) => toast.error(e.message),
  });

  const ungroupMutation = useMutation({
    mutationFn: async (clientIds: string[]) => {
      for (const id of clientIds) {
        const { error } = await supabase.from('clients').update({ parent_client_id: null } as any).eq('id', id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['commercial-clients'] });
      toast.success('Clientes desagrupados');
      setSelectedIds(new Set());
    },
    onError: (e: any) => toast.error(e.message),
  });

  const bulkDeleteMutation = useMutation({
    mutationFn: async ({ ids, addToBlocklist }: { ids: string[]; addToBlocklist: boolean }) => {
      const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user!.id).single();
      if (!profile?.company_id) throw new Error('Empresa não encontrada');

      const targets = clients.filter((c: any) => ids.includes(c.id));

      if (addToBlocklist) {
        const blockRows = targets
          .filter((c: any) => c.omie_client_id || c.cnpj)
          .map((c: any) => ({
            company_id: profile.company_id,
            omie_client_id: c.omie_client_id ? String(c.omie_client_id) : null,
            cnpj: c.cnpj || null,
            reason: 'Excluído manualmente',
            blocked_by: user!.id,
          }));
        if (blockRows.length > 0) {
          const { error: blErr } = await supabase.from('omie_sync_blocklist').insert(blockRows as any);
          if (blErr) throw blErr;
        }
      }

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
      return { deleted, failed, errs };
    },
    onSuccess: ({ deleted, failed, errs }) => {
      queryClient.invalidateQueries({ queryKey: ['commercial-clients'] });
      setSelectedIds(new Set());
      if (failed === 0) toast.success(`${deleted} cliente(s) excluído(s)`);
      else toast.warning(`${deleted} excluído(s), ${failed} não puderam (com vínculos): ${errs[0] || ''}`);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const bulkUpdateMutation = useMutation({
    mutationFn: async ({ ids, patch }: { ids: string[]; patch: Record<string, any> }) => {
      for (const batch of chunk(ids, 200)) {
        const { error } = await supabase.from('clients').update(patch as any).in('id', batch);
        if (error) throw error;
      }
    },
    onSuccess: (_d, vars) => {
      queryClient.invalidateQueries({ queryKey: ['commercial-clients'] });
      toast.success(`${vars.ids.length} cliente(s) atualizado(s)`);
      setSelectedIds(new Set());
    },
    onError: (e: any) => toast.error(e.message),
  });

  const handleEdit = (client: any) => { setEditingClient(client); setDialogOpen(true); };
  const handleNew = () => { setEditingClient(null); setDialogOpen(true); };

  const selectedClients = useMemo(() => clients.filter((c: any) => selectedIds.has(c.id)), [clients, selectedIds]);
  const canGroup = selectedIds.size >= 2;
  const canUngroup = selectedClients.some((c: any) => c.parent_client_id);
  const selectedHasOmie = selectedClients.some((c: any) => c.omie_client_id);

  const openBulkConfirm = () => {
    if (!bulkAction || selectedIds.size === 0) return;
    setAlsoBlocklist(selectedHasOmie);
    setConfirmOpen(true);
  };

  const runBulk = async () => {
    const ids = Array.from(selectedIds);
    if (bulkAction === "delete") {
      bulkDeleteMutation.mutate({ ids, addToBlocklist: alsoBlocklist });
    } else if (bulkAction === "ignore_omie") {
      bulkUpdateMutation.mutate({ ids, patch: { ignore_omie_sync: true } });
    } else if (bulkAction === "unignore_omie") {
      bulkUpdateMutation.mutate({ ids, patch: { ignore_omie_sync: false } });
    } else if (bulkAction && STATUS_BY_ACTION[bulkAction]) {
      bulkUpdateMutation.mutate({ ids, patch: { commercial_status: STATUS_BY_ACTION[bulkAction] } });
    }
    setConfirmOpen(false);
    setBulkAction("");
  };

  const requestSingleDelete = (id: string) => { setSingleDeleteId(id); };
  const confirmSingleDelete = () => {
    if (!singleDeleteId) return;
    const client: any = clients.find((c: any) => c.id === singleDeleteId);
    bulkDeleteMutation.mutate({
      ids: [singleDeleteId],
      addToBlocklist: !!client?.omie_client_id,
    });
    setSingleDeleteId(null);
  };

  const bulkLabels: Record<string, string> = {
    delete: "Excluir selecionados",
    ignore_omie: "Ignorar na sincronização do Omie",
    unignore_omie: "Voltar a sincronizar com Omie",
    status_active: "Marcar como Ativo",
    status_inactive: "Marcar como Inativo",
    status_prospect: "Marcar como Prospect",
    status_churned: "Marcar como Perdido",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Clientes</h2>
        <div className="flex items-center gap-2">
          {selectedIds.size > 0 && (
            <>
              {canGroup && (
                <Button variant="outline" onClick={() => setGroupDialogOpen(true)} className="gap-1">
                  <Link2 className="h-4 w-4" /> Agrupar ({selectedIds.size})
                </Button>
              )}
              {canUngroup && (
                <Button
                  variant="outline"
                  onClick={() => ungroupMutation.mutate(selectedClients.filter((c: any) => c.parent_client_id).map((c: any) => c.id))}
                  className="gap-1"
                >
                  <Unlink className="h-4 w-4" /> Desagrupar
                </Button>
              )}
            </>
          )}
          <Button onClick={handleNew}><Plus className="h-4 w-4 mr-2" /> Novo Cliente</Button>
        </div>
      </div>

      {canManage && selectedIds.size > 0 && (
        <div className="flex flex-wrap items-center gap-3 rounded-md border bg-muted/40 px-3 py-2">
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
          <Button onClick={openBulkConfirm} disabled={!bulkAction} size="sm">Aplicar</Button>
        </div>
      )}

      <ClientsTable
        clients={clients}
        isLoading={isLoading}
        onEdit={handleEdit}
        onRowClick={(c) => { setDetailClient(c); setDetailOpen(true); }}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
        canManage={canManage}
        onDelete={canManage ? requestSingleDelete : undefined}
      />

      <NewClientDialog
        open={dialogOpen}
        onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditingClient(null); }}
        onSave={(data, buyer, legalEntities, addresses) => saveMutation.mutate({ formData: data, buyer, legalEntities, addresses })}
        initialData={editingClient}
        isLoading={saveMutation.isPending}
      />

      <ClientDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        client={detailClient}
        onEdit={handleEdit}
      />

      <ClientGroupDialog
        open={groupDialogOpen}
        onOpenChange={setGroupDialogOpen}
        selectedClients={selectedClients}
        onConfirm={(parentId, childIds) => groupMutation.mutate({ parentId, childIds })}
        isLoading={groupMutation.isPending}
      />

      {/* Confirmação de ação em massa */}
      <AlertDialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              {bulkAction ? bulkLabels[bulkAction] : ""}
            </AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação afetará <strong>{selectedIds.size}</strong> cliente(s).
              {bulkAction === "delete" && " A exclusão é permanente. Clientes com OS, oportunidades ou outros vínculos não poderão ser removidos."}
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
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={runBulk}>Confirmar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmação de exclusão individual */}
      <AlertDialog open={!!singleDeleteId} onOpenChange={(o) => !o && setSingleDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Excluir cliente</AlertDialogTitle>
            <AlertDialogDescription>
              Esta ação é permanente. Se o cliente tiver OS, oportunidades ou outros vínculos, a exclusão falhará.
              {(() => {
                const c: any = clients.find((c: any) => c.id === singleDeleteId);
                return c?.omie_client_id
                  ? " O cliente é oriundo do Omie e será adicionado à lista de bloqueio para não voltar na próxima sincronização."
                  : "";
              })()}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={confirmSingleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CommercialClients;
