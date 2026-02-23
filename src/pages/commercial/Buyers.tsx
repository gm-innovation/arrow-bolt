import { useState, useMemo } from "react";
import { useBuyers } from "@/hooks/useBuyers";
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Pencil, Trash2, Search } from "lucide-react";
import { NewBuyerDialog } from "@/components/commercial/buyers/NewBuyerDialog";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";

const influenceColors: Record<string, string> = {
  decisor: 'bg-purple-100 text-purple-800',
  influenciador: 'bg-blue-100 text-blue-800',
  usuario: 'bg-gray-100 text-gray-800',
};

const influenceLabels: Record<string, string> = {
  decisor: 'Decisor', influenciador: 'Influenciador', usuario: 'Usuário',
};

const CommercialBuyers = () => {
  const { user } = useAuth();
  const { buyers, isLoading, createBuyer, updateBuyer, deleteBuyer } = useBuyers();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editData, setEditData] = useState<any>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [clientFilter, setClientFilter] = useState('all');

  const { data: clients = [] } = useQuery({
    queryKey: ['commercial-clients-select', user?.id],
    queryFn: async () => {
      const { data: profile } = await supabase.from('profiles').select('company_id').eq('id', user!.id).single();
      if (!profile?.company_id) return [];
      const { data } = await supabase.from('clients').select('id, name').eq('company_id', profile.company_id).order('name');
      return data || [];
    },
    enabled: !!user?.id,
  });

  const filtered = useMemo(() => {
    return buyers.filter(b => {
      const matchSearch = !search || b.name.toLowerCase().includes(search.toLowerCase());
      const matchClient = clientFilter === 'all' || b.client_id === clientFilter;
      return matchSearch && matchClient;
    });
  }, [buyers, search, clientFilter]);

  const handleSave = (data: Record<string, any>) => {
    if (editData) {
      updateBuyer.mutate({ id: editData.id, ...data }, { onSuccess: () => { setDialogOpen(false); setEditData(null); } });
    } else {
      createBuyer.mutate(data, { onSuccess: () => setDialogOpen(false) });
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-foreground">Compradores</h2>
        <Button onClick={() => { setEditData(null); setDialogOpen(true); }}>
          <Plus className="h-4 w-4 mr-2" /> Novo Comprador
        </Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder="Buscar..." value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={clientFilter} onValueChange={setClientFilter}>
          <SelectTrigger className="w-[200px]"><SelectValue placeholder="Cliente" /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os clientes</SelectItem>
            {clients.map(c => <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>

      {isLoading ? (
        <div className="space-y-2">{[1,2,3].map(i => <div key={i} className="h-12 bg-muted animate-pulse rounded" />)}</div>
      ) : filtered.length === 0 ? (
        <p className="text-center text-muted-foreground py-8">Nenhum comprador encontrado</p>
      ) : (
        <div className="rounded-md border">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nome</TableHead>
                <TableHead className="hidden md:table-cell">Cargo</TableHead>
                <TableHead>Cliente</TableHead>
                <TableHead className="hidden lg:table-cell">Email</TableHead>
                <TableHead className="hidden lg:table-cell">Telefone</TableHead>
                <TableHead>Influência</TableHead>
                <TableHead className="text-right">Ações</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filtered.map(buyer => (
                <TableRow key={buyer.id}>
                  <TableCell className="font-medium">{buyer.name}</TableCell>
                  <TableCell className="hidden md:table-cell">{buyer.role || '—'}</TableCell>
                  <TableCell>{buyer.client_name}</TableCell>
                  <TableCell className="hidden lg:table-cell">{buyer.email || '—'}</TableCell>
                  <TableCell className="hidden lg:table-cell">{buyer.phone || '—'}</TableCell>
                  <TableCell>
                    {buyer.influence_level ? (
                      <Badge variant="secondary" className={influenceColors[buyer.influence_level] || ''}>
                        {influenceLabels[buyer.influence_level] || buyer.influence_level}
                      </Badge>
                    ) : '—'}
                  </TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button variant="ghost" size="icon" onClick={() => { setEditData(buyer); setDialogOpen(true); }}>
                        <Pencil className="h-4 w-4" />
                      </Button>
                      <Button variant="ghost" size="icon" onClick={() => setDeleteId(buyer.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}

      <NewBuyerDialog
        open={dialogOpen}
        onOpenChange={(o) => { setDialogOpen(o); if (!o) setEditData(null); }}
        onSave={handleSave}
        clients={clients}
        initialData={editData}
        isLoading={createBuyer.isPending || updateBuyer.isPending}
      />

      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Confirmar exclusão</AlertDialogTitle>
            <AlertDialogDescription>Tem certeza que deseja remover este comprador?</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancelar</AlertDialogCancel>
            <AlertDialogAction onClick={() => { if (deleteId) deleteBuyer.mutate(deleteId); setDeleteId(null); }}>
              Excluir
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default CommercialBuyers;
