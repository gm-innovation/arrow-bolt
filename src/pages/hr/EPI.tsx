import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, HardHat, Trash2, AlertTriangle, Calendar } from 'lucide-react';
import { format, parseISO, isBefore, addDays } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useEPI, EpiItem } from '@/hooks/useEPI';
import { useAllUsers } from '@/hooks/useAllUsers';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const EPI = () => {
  const { items, deliveries, isLoading, createItem, deleteItem, createDelivery } = useEPI();
  const { users } = useAllUsers();
  const [itemDialog, setItemDialog] = useState(false);
  const [deliveryDialog, setDeliveryDialog] = useState(false);
  const [itemForm, setItemForm] = useState<Partial<EpiItem>>({ name: '', min_stock: 0, current_stock: 0, is_active: true });
  const [deliveryForm, setDeliveryForm] = useState<any>({ epi_item_id: '', recipient_profile_id: '', quantity: 1, delivered_at: format(new Date(), 'yyyy-MM-dd') });

  const today = new Date();
  const soon = addDays(today, 30);

  if (isLoading) {
    return <div className="space-y-6"><h1 className="text-3xl font-bold">Gestão de EPI</h1><Skeleton className="h-96" /></div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2"><HardHat className="h-7 w-7" /> Gestão de EPI</h1>
      </div>

      <Tabs defaultValue="catalog">
        <TabsList>
          <TabsTrigger value="catalog">Catálogo</TabsTrigger>
          <TabsTrigger value="deliveries">Entregas</TabsTrigger>
          <TabsTrigger value="expirations">Vencimentos</TabsTrigger>
        </TabsList>

        <TabsContent value="catalog" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={itemDialog} onOpenChange={setItemDialog}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Novo EPI</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Novo EPI</DialogTitle></DialogHeader>
                <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); await createItem.mutateAsync(itemForm); setItemDialog(false); setItemForm({ name: '', min_stock: 0, current_stock: 0, is_active: true }); }}>
                  <div className="space-y-2"><Label>Nome *</Label><Input required value={itemForm.name || ''} onChange={(e) => setItemForm({ ...itemForm, name: e.target.value })} /></div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2"><Label>Tamanho</Label><Input value={itemForm.size || ''} onChange={(e) => setItemForm({ ...itemForm, size: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Estoque mín.</Label><Input type="number" value={itemForm.min_stock ?? 0} onChange={(e) => setItemForm({ ...itemForm, min_stock: Number(e.target.value) })} /></div>
                    <div className="space-y-2"><Label>Estoque atual</Label><Input type="number" value={itemForm.current_stock ?? 0} onChange={(e) => setItemForm({ ...itemForm, current_stock: Number(e.target.value) })} /></div>
                  </div>
                  <div className="space-y-2"><Label>Descrição</Label><Textarea value={itemForm.description || ''} onChange={(e) => setItemForm({ ...itemForm, description: e.target.value })} /></div>
                  <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setItemDialog(false)}>Cancelar</Button><Button type="submit">Salvar</Button></div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader><TableRow><TableHead>Nome</TableHead><TableHead>Tamanho</TableHead><TableHead>Estoque</TableHead><TableHead>Ações</TableHead></TableRow></TableHeader>
                <TableBody>
                  {items.length === 0 ? (
                    <TableRow><TableCell colSpan={4} className="text-center text-muted-foreground py-8">Nenhum EPI cadastrado</TableCell></TableRow>
                  ) : items.map((it) => (
                    <TableRow key={it.id}>
                      <TableCell className="font-medium">{it.name}</TableCell>
                      <TableCell>{it.size || '-'}</TableCell>
                      <TableCell>
                        <Badge variant={it.current_stock < it.min_stock ? 'destructive' : 'secondary'}>{it.current_stock}</Badge>
                      </TableCell>
                      <TableCell><Button variant="ghost" size="icon" onClick={() => { if (confirm('Remover este EPI?')) deleteItem.mutate(it.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="deliveries" className="space-y-4">
          <div className="flex justify-end">
            <Dialog open={deliveryDialog} onOpenChange={setDeliveryDialog}>
              <DialogTrigger asChild><Button><Plus className="h-4 w-4 mr-2" />Nova Entrega</Button></DialogTrigger>
              <DialogContent>
                <DialogHeader><DialogTitle>Nova Entrega</DialogTitle></DialogHeader>
                <form className="space-y-3" onSubmit={async (e) => { e.preventDefault(); await createDelivery.mutateAsync(deliveryForm); setDeliveryDialog(false); setDeliveryForm({ epi_item_id: '', recipient_profile_id: '', quantity: 1, delivered_at: format(new Date(), 'yyyy-MM-dd') }); }}>
                  <div className="space-y-2"><Label>EPI *</Label>
                    <Select value={deliveryForm.epi_item_id} onValueChange={(v) => setDeliveryForm({ ...deliveryForm, epi_item_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{items.map((it) => <SelectItem key={it.id} value={it.id}>{it.name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2"><Label>Colaborador *</Label>
                    <Select value={deliveryForm.recipient_profile_id} onValueChange={(v) => setDeliveryForm({ ...deliveryForm, recipient_profile_id: v })}>
                      <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                      <SelectContent>{(users || []).map((u: any) => <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>)}</SelectContent>
                    </Select>
                  </div>
                  <div className="grid grid-cols-3 gap-3">
                    <div className="space-y-2"><Label>Qtd.</Label><Input type="number" value={deliveryForm.quantity} onChange={(e) => setDeliveryForm({ ...deliveryForm, quantity: Number(e.target.value) })} /></div>
                    <div className="space-y-2"><Label>Data</Label><Input type="date" value={deliveryForm.delivered_at} onChange={(e) => setDeliveryForm({ ...deliveryForm, delivered_at: e.target.value })} /></div>
                    <div className="space-y-2"><Label>Vencimento</Label><Input type="date" value={deliveryForm.expires_at || ''} onChange={(e) => setDeliveryForm({ ...deliveryForm, expires_at: e.target.value })} /></div>
                  </div>
                  <div className="space-y-2"><Label>Observações</Label><Textarea value={deliveryForm.notes || ''} onChange={(e) => setDeliveryForm({ ...deliveryForm, notes: e.target.value })} /></div>
                  <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setDeliveryDialog(false)}>Cancelar</Button><Button type="submit" disabled={!deliveryForm.epi_item_id || !deliveryForm.recipient_profile_id}>Registrar</Button></div>
                </form>
              </DialogContent>
            </Dialog>
          </div>
          <Card>
            <CardContent className="pt-6">
              <Table>
                <TableHeader><TableRow><TableHead>Colaborador</TableHead><TableHead>EPI</TableHead><TableHead>Qtd.</TableHead><TableHead>Entrega</TableHead><TableHead>Vencimento</TableHead><TableHead>Obs.</TableHead></TableRow></TableHeader>
                <TableBody>
                  {deliveries.length === 0 ? (
                    <TableRow><TableCell colSpan={6} className="text-center text-muted-foreground py-8">Nenhuma entrega registrada</TableCell></TableRow>
                  ) : deliveries.map((d) => (
                    <TableRow key={d.id}>
                      <TableCell>{d.recipient?.full_name || '-'}</TableCell>
                      <TableCell>{d.epi_item?.name || '-'}</TableCell>
                      <TableCell>{d.quantity}</TableCell>
                      <TableCell>{format(parseISO(d.delivered_at), 'dd/MM/yyyy', { locale: ptBR })}</TableCell>
                      <TableCell>{d.expires_at ? format(parseISO(d.expires_at), 'dd/MM/yyyy') : '-'}</TableCell>
                      <TableCell className="max-w-[200px] truncate">{d.notes || '-'}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="expirations">
          <Card>
            <CardHeader><CardTitle className="flex items-center gap-2"><AlertTriangle className="h-5 w-5" /> Próximos 30 dias</CardTitle></CardHeader>
            <CardContent>
              <Table>
                <TableHeader><TableRow><TableHead>EPI</TableHead><TableHead>Colaborador</TableHead><TableHead>Vencimento</TableHead></TableRow></TableHeader>
                <TableBody>
                  {deliveries.filter(d => d.expires_at && isBefore(parseISO(d.expires_at), soon)).length === 0 ? (
                    <TableRow><TableCell colSpan={3} className="text-center text-muted-foreground py-8">Nenhum vencimento nos próximos 30 dias</TableCell></TableRow>
                  ) : deliveries
                    .filter(d => d.expires_at && isBefore(parseISO(d.expires_at), soon))
                    .sort((a, b) => (a.expires_at || '').localeCompare(b.expires_at || ''))
                    .map((d) => (
                      <TableRow key={d.id}>
                        <TableCell>{d.epi_item?.name}</TableCell>
                        <TableCell>{d.recipient?.full_name}</TableCell>
                        <TableCell className="flex items-center gap-1">
                          <Calendar className="h-3 w-3" />
                          {format(parseISO(d.expires_at!), 'dd/MM/yyyy')}
                          {isBefore(parseISO(d.expires_at!), today) && <Badge variant="destructive" className="ml-2">Vencido</Badge>}
                        </TableCell>
                      </TableRow>
                    ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EPI;
