import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Plus, ExternalLink, Trash2, Handshake, Edit } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { usePartnerships, Partnership } from '@/hooks/usePartnerships';
import { Skeleton } from '@/components/ui/skeleton';
import { Switch } from '@/components/ui/switch';

const emptyForm: Partial<Partnership> = { name: '', category: '', description: '', benefit: '', contact: '', link: '', is_active: true };

const Partnerships = () => {
  const { partnerships, isLoading, create, update, remove } = usePartnerships();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Partnership | null>(null);
  const [form, setForm] = useState<Partial<Partnership>>(emptyForm);

  const openNew = () => { setEditing(null); setForm(emptyForm); setDialogOpen(true); };
  const openEdit = (p: Partnership) => { setEditing(p); setForm(p); setDialogOpen(true); };

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (editing) {
      await update.mutateAsync({ id: editing.id, ...form });
    } else {
      await create.mutateAsync(form);
    }
    setDialogOpen(false);
  };

  if (isLoading) return <div className="space-y-6"><h1 className="text-3xl font-bold">Parcerias</h1><Skeleton className="h-96" /></div>;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold flex items-center gap-2"><Handshake className="h-7 w-7" /> Parcerias</h1>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild><Button onClick={openNew}><Plus className="h-4 w-4 mr-2" />Nova Parceria</Button></DialogTrigger>
          <DialogContent>
            <DialogHeader><DialogTitle>{editing ? 'Editar Parceria' : 'Nova Parceria'}</DialogTitle></DialogHeader>
            <form onSubmit={submit} className="space-y-3">
              <div className="space-y-2"><Label>Nome *</Label><Input required value={form.name || ''} onChange={(e) => setForm({ ...form, name: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Categoria</Label><Input placeholder="Saúde, Educação..." value={form.category || ''} onChange={(e) => setForm({ ...form, category: e.target.value })} /></div>
                <div className="space-y-2"><Label>Contato</Label><Input value={form.contact || ''} onChange={(e) => setForm({ ...form, contact: e.target.value })} /></div>
              </div>
              <div className="space-y-2"><Label>Benefício</Label><Input placeholder="Ex.: 20% de desconto" value={form.benefit || ''} onChange={(e) => setForm({ ...form, benefit: e.target.value })} /></div>
              <div className="space-y-2"><Label>Descrição</Label><Textarea value={form.description || ''} onChange={(e) => setForm({ ...form, description: e.target.value })} /></div>
              <div className="space-y-2"><Label>Link</Label><Input type="url" value={form.link || ''} onChange={(e) => setForm({ ...form, link: e.target.value })} /></div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2"><Label>Válido de</Label><Input type="date" value={form.valid_from || ''} onChange={(e) => setForm({ ...form, valid_from: e.target.value })} /></div>
                <div className="space-y-2"><Label>Válido até</Label><Input type="date" value={form.valid_until || ''} onChange={(e) => setForm({ ...form, valid_until: e.target.value })} /></div>
              </div>
              <div className="flex items-center gap-2"><Switch checked={!!form.is_active} onCheckedChange={(v) => setForm({ ...form, is_active: v })} /><Label>Ativa</Label></div>
              <div className="flex justify-end gap-2"><Button type="button" variant="outline" onClick={() => setDialogOpen(false)}>Cancelar</Button><Button type="submit">Salvar</Button></div>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {partnerships.length === 0 ? (
        <Card><CardContent className="py-12 text-center text-muted-foreground">Nenhuma parceria cadastrada</CardContent></Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {partnerships.map((p) => (
            <Card key={p.id}>
              <CardHeader>
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <CardTitle className="text-lg">{p.name}</CardTitle>
                    {p.category && <Badge variant="secondary" className="mt-1">{p.category}</Badge>}
                  </div>
                  <Badge variant={p.is_active ? 'default' : 'outline'}>{p.is_active ? 'Ativa' : 'Inativa'}</Badge>
                </div>
              </CardHeader>
              <CardContent className="space-y-2 text-sm">
                {p.benefit && <p className="font-medium text-primary">{p.benefit}</p>}
                {p.description && <p className="text-muted-foreground">{p.description}</p>}
                {p.contact && <p><span className="text-muted-foreground">Contato:</span> {p.contact}</p>}
                {(p.valid_from || p.valid_until) && (
                  <p className="text-xs text-muted-foreground">Vigência: {p.valid_from ? format(parseISO(p.valid_from), 'dd/MM/yyyy') : '—'} → {p.valid_until ? format(parseISO(p.valid_until), 'dd/MM/yyyy') : '—'}</p>
                )}
                <div className="flex items-center gap-2 pt-2">
                  {p.link && <Button variant="outline" size="sm" asChild><a href={p.link} target="_blank" rel="noreferrer"><ExternalLink className="h-3 w-3 mr-1" />Acessar</a></Button>}
                  <Button variant="ghost" size="icon" onClick={() => openEdit(p)}><Edit className="h-4 w-4" /></Button>
                  <Button variant="ghost" size="icon" onClick={() => { if (confirm('Remover esta parceria?')) remove.mutate(p.id); }}><Trash2 className="h-4 w-4 text-destructive" /></Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Partnerships;
