import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";
import { ClientsTable } from "@/components/commercial/clients/ClientsTable";
import { NewClientDialog } from "@/components/commercial/clients/NewClientDialog";
import { ClientDetailSheet } from "@/components/commercial/clients/ClientDetailSheet";
import { toast } from "sonner";

const CommercialClients = () => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editingClient, setEditingClient] = useState<any>(null);
  const [detailOpen, setDetailOpen] = useState(false);
  const [detailClient, setDetailClient] = useState<any>(null);

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
    mutationFn: async ({ formData, buyer }: { formData: Record<string, any>; buyer?: Record<string, any> | null }) => {
      const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user!.id).single();
      if (!profile?.company_id) throw new Error('Empresa não encontrada');

      if (editingClient) {
        const { id, company_id, created_at, updated_at, ...updates } = formData;
        const { error } = await supabase.from('clients').update(updates).eq('id', editingClient.id);
        if (error) throw error;
      } else {
        const { data: newClient, error } = await supabase.from('clients').insert({ ...formData, company_id: profile.company_id }).select('id').single();
        if (error) throw error;
        
        // Create associated buyer if provided
        if (buyer && buyer.name?.trim() && newClient) {
          await supabase.from('crm_buyers').insert({
            ...buyer,
            client_id: newClient.id,
            company_id: profile.company_id,
            is_primary: true,
            is_active: true,
          });
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

  const handleEdit = (client: any) => {
    setEditingClient(client);
    setDialogOpen(true);
  };

  const handleNew = () => {
    setEditingClient(null);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Clientes</h2>
        <Button onClick={handleNew}><Plus className="h-4 w-4 mr-2" /> Novo Cliente</Button>
      </div>

      <ClientsTable clients={clients} isLoading={isLoading} onEdit={handleEdit} onRowClick={(c) => { setDetailClient(c); setDetailOpen(true); }} />

      <NewClientDialog
        open={dialogOpen}
        onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditingClient(null); }}
        onSave={(data, buyer) => saveMutation.mutate({ formData: data, buyer })}
        initialData={editingClient}
        isLoading={saveMutation.isPending}
      />

      <ClientDetailSheet
        open={detailOpen}
        onOpenChange={setDetailOpen}
        client={detailClient}
        onEdit={handleEdit}
      />
    </div>
  );
};

export default CommercialClients;
