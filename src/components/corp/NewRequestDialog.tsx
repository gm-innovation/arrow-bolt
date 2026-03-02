import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus } from 'lucide-react';
import { useCorpRequests } from '@/hooks/useCorpRequests';
import { useCorpRequestTypes } from '@/hooks/useCorpRequestTypes';
import { useDepartments } from '@/hooks/useDepartments';
import { useUsers } from '@/hooks/useUsers';
import { useAuth } from '@/contexts/AuthContext';

interface NewRequestDialogProps {
  companyId: string;
}

const NewRequestDialog = ({ companyId }: NewRequestDialogProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [amount, setAmount] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [typeId, setTypeId] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const { createRequest } = useCorpRequests();
  const { requestTypes } = useCorpRequestTypes();
  const { departments } = useDepartments();
  const { users } = useUsers();
  const { user } = useAuth();

  const selectedType = requestTypes.find(t => t.id === typeId);

  const determineStatus = () => {
    if (!selectedType || !selectedType.requires_approval) return 'open';
    return 'pending_manager';
  };

  const handleSubmit = () => {
    if (!title.trim()) return;
    createRequest.mutate({
      company_id: companyId,
      title,
      description: description || undefined,
      priority,
      amount: amount ? parseFloat(amount) : undefined,
      department_id: departmentId || undefined,
      type_id: typeId || undefined,
      target_user_id: targetUserId || undefined,
      status: determineStatus(),
    }, {
      onSuccess: () => {
        setOpen(false);
        setTitle('');
        setDescription('');
        setPriority('medium');
        setAmount('');
        setDepartmentId('');
        setTypeId('');
        setTargetUserId('');
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="h-4 w-4" /> Nova Solicitação</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Nova Solicitação</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Título *</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título da solicitação" />
          </div>
          <div>
            <Label>Descrição</Label>
            <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descreva a solicitação..." />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Departamento</Label>
              <Select value={departmentId} onValueChange={setDepartmentId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {departments.map(d => (
                    <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Tipo</Label>
              <Select value={typeId} onValueChange={setTypeId}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {requestTypes.filter(t => t.active).map(t => (
                    <SelectItem key={t.id} value={t.id}>{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label>Destinatário (opcional)</Label>
            <Select value={targetUserId} onValueChange={setTargetUserId}>
              <SelectTrigger><SelectValue placeholder="Selecione um destinatário" /></SelectTrigger>
              <SelectContent>
                {users.filter(u => u.id !== user?.id).map(u => (
                  <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Prioridade</Label>
              <Select value={priority} onValueChange={setPriority}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="low">Baixa</SelectItem>
                  <SelectItem value="medium">Média</SelectItem>
                  <SelectItem value="high">Alta</SelectItem>
                  <SelectItem value="urgent">Urgente</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Valor (se aplicável)</Label>
              <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" />
            </div>
          </div>

          {selectedType?.requires_approval && (
            <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
              ⓘ Este tipo requer aprovação
              {selectedType.requires_director_approval && ' do gerente e da diretoria'}
              {!selectedType.requires_director_approval && ' do gerente'}.
              {selectedType.director_threshold_value && amount && parseFloat(amount) > selectedType.director_threshold_value && 
                ` Valor acima de R$ ${selectedType.director_threshold_value?.toLocaleString('pt-BR')} — requer aprovação da diretoria.`}
            </p>
          )}

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!title.trim() || createRequest.isPending}>
              {createRequest.isPending ? 'Criando...' : 'Criar Solicitação'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewRequestDialog;
