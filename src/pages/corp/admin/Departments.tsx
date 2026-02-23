import { useState } from 'react';
import CorpLayout from '@/components/corp/CorpLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useDepartments } from '@/hooks/useDepartments';
import { useAllUsers } from '@/hooks/useAllUsers';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Pencil } from 'lucide-react';

const CorpDepartments = () => {
  const { departments, isLoading, createDepartment, updateDepartment } = useDepartments();
  const { users } = useAllUsers();
  const [createOpen, setCreateOpen] = useState(false);
  const [editDept, setEditDept] = useState<any>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [managerId, setManagerId] = useState('');

  const companyId = departments?.[0]?.company_id || '';

  const handleCreate = () => {
    if (!name.trim()) return;
    createDepartment.mutate({
      name, description: description || undefined,
      manager_id: managerId || undefined, company_id: companyId,
    }, {
      onSuccess: () => { setCreateOpen(false); setName(''); setDescription(''); setManagerId(''); }
    });
  };

  const handleEdit = () => {
    if (!editDept || !name.trim()) return;
    updateDepartment.mutate({
      id: editDept.id, name, description: description || undefined,
      manager_id: managerId || undefined,
    }, {
      onSuccess: () => { setEditDept(null); setName(''); setDescription(''); setManagerId(''); }
    });
  };

  const openEdit = (dept: any) => {
    setEditDept(dept);
    setName(dept.name);
    setDescription(dept.description || '');
    setManagerId(dept.manager_id || '');
  };

  return (
    <CorpLayout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Departamentos</h2>
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Novo Departamento</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo Departamento</DialogTitle></DialogHeader>
              <div className="space-y-4">
                <div><Label>Nome *</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
                <div><Label>Descrição</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} /></div>
                <div>
                  <Label>Gerente</Label>
                  <Select value={managerId} onValueChange={setManagerId}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {(users || []).map((u: any) => (
                        <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                  <Button onClick={handleCreate} disabled={!name.trim()}>Criar</Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>

        <Card>
          <CardContent className="p-0">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Gerente</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {departments.map((dept: any) => (
                  <TableRow key={dept.id}>
                    <TableCell className="font-medium">{dept.name}</TableCell>
                    <TableCell className="text-muted-foreground">{dept.description || '—'}</TableCell>
                    <TableCell>{dept.manager?.full_name || '—'}</TableCell>
                    <TableCell><Badge variant={dept.active ? 'success' : 'secondary'} size="sm">{dept.active ? 'Ativo' : 'Inativo'}</Badge></TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(dept)}><Pencil className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {departments.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum departamento.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={!!editDept} onOpenChange={open => { if (!open) setEditDept(null); }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Editar Departamento</DialogTitle></DialogHeader>
            <div className="space-y-4">
              <div><Label>Nome *</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
              <div><Label>Descrição</Label><Textarea value={description} onChange={e => setDescription(e.target.value)} /></div>
              <div>
                <Label>Gerente</Label>
                <Select value={managerId} onValueChange={setManagerId}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    {(users || []).map((u: any) => (
                      <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setEditDept(null)}>Cancelar</Button>
                <Button onClick={handleEdit} disabled={!name.trim()}>Salvar</Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </CorpLayout>
  );
};

export default CorpDepartments;
