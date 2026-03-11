import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Plus, Link2, Unlink } from "lucide-react";
import { ClientsTable } from "@/components/commercial/clients/ClientsTable";
import { NewClientDialog } from "@/components/commercial/clients/NewClientDialog";
import { ClientDetailSheet } from "@/components/commercial/clients/ClientDetailSheet";
import { ClientGroupDialog } from "@/components/commercial/clients/ClientGroupDialog";
import { toast } from "sonner";

const CommercialClients = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailClient, setDetailClient] = useState<any>(null);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);

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
        const { error } = await supabase
          .from('clients')
          .update({ parent_client_id: parentId } as any)
          .eq('id', childId);
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
        const { error } = await supabase
          .from('clients')
          .update({ parent_client_id: null } as any)
          .eq('id', id);
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

  const handleEdit = (client: any) => {
    setEditingClient(client);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditingClient(null);
    setDialogOpen(true);
  };

  const selectedClients = clients.filter((c: any) => selectedIds.has(c.id));
  const canGroup = selectedIds.size >= 2;
  const canUngroup = selectedClients.some((c: any) => c.parent_client_id);

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

      <ClientsTable
        clients={clients}
        isLoading={isLoading}
        onEdit={handleEdit}
        onRowClick={(c) => { setDetailClient(c); setDetailOpen(true); }}
        selectedIds={selectedIds}
        onSelectionChange={setSelectedIds}
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
    </div>
  );
};

export default CommercialClients;