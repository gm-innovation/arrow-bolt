import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, UserPlus, Eye, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useOnboardingProcesses, useOnboardingDocuments, useOnboardingDocumentTypes } from '@/hooks/useOnboarding';
import { useDepartments } from '@/hooks/useDepartments';
import { useDepartmentMembers } from '@/hooks/useDepartmentMembers';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import OnboardingDetailDialog from '@/components/hr/OnboardingDetailDialog';

const statusLabels: Record<string, string> = {
  pending: 'Pendente', in_progress: 'Em Andamento', completed: 'Concluído', archived: 'Arquivado',
};
const statusColors: Record<string, string> = {
  pending: 'secondary', in_progress: 'default', completed: 'outline', archived: 'secondary',
};

const HROnboarding = () => {
  const { processes, isLoading, createProcess } = useOnboardingProcesses();
  const { docTypes } = useOnboardingDocumentTypes();
  const { departments } = useDepartments();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [departmentId, setDepartmentId] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [notes, setNotes] = useState('');
  const [detailProcess, setDetailProcess] = useState<any>(null);
  const { members, isLoading: membersLoading } = useDepartmentMembers(departmentId || undefined);

  const companyId = user?.user_metadata?.company_id || (processes as any[])?.[0]?.company_id || '';

  const handleCreate = () => {
    if (!selectedUserId || !companyId) return;
    createProcess.mutate({ company_id: companyId, user_id: selectedUserId, notes }, {
      onSuccess: () => {
        setOpen(false);
        setDepartmentId('');
        setSelectedUserId('');
        setNotes('');
      },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="text-xl font-semibold">Portal de Admissão</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/hr/onboarding/settings')} className="gap-2">
            <Settings className="h-4 w-4" /> Configurar Docs
          </Button>
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button className="gap-2"><UserPlus className="h-4 w-4" /> Nova Admissão</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Processo de Admissão</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div>
                  <Label>Departamento *</Label>
                  <Select value={departmentId} onValueChange={(val) => { setDepartmentId(val); setSelectedUserId(''); }}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {departments.map((d: any) => (
                        <SelectItem key={d.id} value={d.id}>{d.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                {departmentId && (
                  <div>
                    <Label>Colaborador *</Label>
                    <Select value={selectedUserId} onValueChange={setSelectedUserId} disabled={membersLoading}>
                      <SelectTrigger><SelectValue placeholder={membersLoading ? 'Carregando...' : 'Selecione'} /></SelectTrigger>
                      <SelectContent>
                        {members.map((m: any) => (
                          <SelectItem key={m.user_id} value={m.user_id}>{m.profile?.full_name || m.profile?.email || m.user_id}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}
                <div>
                  <Label>Observações</Label>
                  <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observações sobre a admissão..." />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
                  <Button onClick={handleCreate} disabled={!selectedUserId || createProcess.isPending}>
                    {createProcess.isPending ? 'Criando...' : 'Criar'}
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6"><Skeleton className="h-40 w-full" /></div>
          ) : processes.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Nenhum processo de admissão encontrado.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Colaborador</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden md:table-cell">Documentos</TableHead>
                  <TableHead className="hidden lg:table-cell">Iniciado em</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processes.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.employee?.full_name || p.employee?.email || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={statusColors[p.status] as any}>{statusLabels[p.status] || p.status}</Badge>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-muted-foreground">
                      {docTypes.length > 0 ? `${docTypes.length} tipos configurados` : '—'}
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {format(new Date(p.started_at || p.created_at), "dd/MM/yy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => setDetailProcess(p)}>
                        <Eye className="h-4 w-4" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {detailProcess && (
        <OnboardingDetailDialog
          process={detailProcess}
          open={!!detailProcess}
          onOpenChange={(open) => !open && setDetailProcess(null)}
        />
      )}
    </div>
  );
};

export default HROnboarding;
