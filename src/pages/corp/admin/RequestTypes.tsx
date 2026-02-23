import { useState } from 'react';
import CorpLayout from '@/components/corp/CorpLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useCorpRequestTypes } from '@/hooks/useCorpRequestTypes';
import { useDepartments } from '@/hooks/useDepartments';
import { Plus, Pencil } from 'lucide-react';

const CorpRequestTypes = () => {
  const { requestTypes, isLoading, createRequestType, updateRequestType } = useCorpRequestTypes();
  const { departments } = useDepartments();
  const [createOpen, setCreateOpen] = useState(false);
  const [editType, setEditType] = useState<any>(null);
  const [name, setName] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [requiresApproval, setRequiresApproval] = useState(false);
  const [requiresDirector, setRequiresDirector] = useState(false);
  const [threshold, setThreshold] = useState('');

  const companyId = requestTypes?.[0]?.company_id || '';

  const resetForm = () => {
    setName(''); setDepartmentId(''); setRequiresApproval(false);
    setRequiresDirector(false); setThreshold('');
  };

  const handleCreate = () => {
    if (!name.trim()) return;
    createRequestType.mutate({
      name, company_id: companyId,
      department_id: departmentId || undefined,
      requires_approval: requiresApproval,
      requires_director_approval: requiresDirector,
      director_threshold_value: threshold ? parseFloat(threshold) : undefined,
    }, { onSuccess: () => { setCreateOpen(false); resetForm(); } });
  };

  const handleEdit = () => {
    if (!editType || !name.trim()) return;
    updateRequestType.mutate({
      id: editType.id, name,
      department_id: departmentId || null,
      requires_approval: requiresApproval,
      requires_director_approval: requiresDirector,
      director_threshold_value: threshold ? parseFloat(threshold) : null,
    }, { onSuccess: () => { setEditType(null); resetForm(); } });
  };

  const openEdit = (t: any) => {
    setEditType(t); setName(t.name); setDepartmentId(t.department_id || '');
    setRequiresApproval(t.requires_approval); setRequiresDirector(t.requires_director_approval);
    setThreshold(t.director_threshold_value?.toString() || '');
  };

  const formFields = (
    <div className="space-y-4">
      <div><Label>Nome *</Label><Input value={name} onChange={e => setName(e.target.value)} /></div>
      <div>
        <Label>Departamento</Label>
        <Select value={departmentId} onValueChange={setDepartmentId}>
          <SelectTrigger><SelectValue placeholder="Opcional" /></SelectTrigger>
          <SelectContent>
            {departments.map((d: any) => <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>)}
          </SelectContent>
        </Select>
      </div>
      <div className="flex items-center gap-3">
        <Switch checked={requiresApproval} onCheckedChange={setRequiresApproval} />
        <Label>Requer aprovação do gerente</Label>
      </div>
      <div className="flex items-center gap-3">
        <Switch checked={requiresDirector} onCheckedChange={setRequiresDirector} />
        <Label>Requer aprovação da diretoria</Label>
      </div>
      {(requiresDirector || requiresApproval) && (
        <div>
          <Label>Valor limite p/ diretoria (R$)</Label>
          <Input type="number" value={threshold} onChange={e => setThreshold(e.target.value)} placeholder="Acima deste valor, exige diretoria" />
        </div>
      )}
    </div>
  );

  return (
    <CorpLayout>
      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Tipos de Requisição</h2>
          <Dialog open={createOpen} onOpenChange={o => { setCreateOpen(o); if (!o) resetForm(); }}>
            <DialogTrigger asChild>
              <Button className="gap-2"><Plus className="h-4 w-4" /> Novo Tipo</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader><DialogTitle>Novo Tipo de Requisição</DialogTitle></DialogHeader>
              {formFields}
              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => setCreateOpen(false)}>Cancelar</Button>
                <Button onClick={handleCreate} disabled={!name.trim()}>Criar</Button>
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
                  <TableHead>Departamento</TableHead>
                  <TableHead>Aprovação</TableHead>
                  <TableHead>Limite Diretoria</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {requestTypes.map((t: any) => (
                  <TableRow key={t.id}>
                    <TableCell className="font-medium">{t.name}</TableCell>
                    <TableCell>{t.department?.name || '—'}</TableCell>
                    <TableCell>
                      {!t.requires_approval && <Badge variant="secondary" size="sm">Sem aprovação</Badge>}
                      {t.requires_approval && !t.requires_director_approval && <Badge variant="warning" size="sm">Gerente</Badge>}
                      {t.requires_director_approval && <Badge variant="info" size="sm">Gerente + Diretoria</Badge>}
                    </TableCell>
                    <TableCell>{t.director_threshold_value ? `R$ ${Number(t.director_threshold_value).toLocaleString('pt-BR')}` : '—'}</TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => openEdit(t)}><Pencil className="h-4 w-4" /></Button>
                    </TableCell>
                  </TableRow>
                ))}
                {requestTypes.length === 0 && (
                  <TableRow><TableCell colSpan={5} className="text-center text-muted-foreground py-8">Nenhum tipo cadastrado.</TableCell></TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Dialog open={!!editType} onOpenChange={o => { if (!o) { setEditType(null); resetForm(); } }}>
          <DialogContent>
            <DialogHeader><DialogTitle>Editar Tipo</DialogTitle></DialogHeader>
            {formFields}
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setEditType(null)}>Cancelar</Button>
              <Button onClick={handleEdit} disabled={!name.trim()}>Salvar</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </CorpLayout>
  );
};

export default CorpRequestTypes;
