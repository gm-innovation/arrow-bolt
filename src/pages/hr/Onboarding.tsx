import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { UserPlus, Eye, Settings, Copy, Check } from 'lucide-react';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';
import { useOnboardingProcesses, useOnboardingDocumentTypes } from '@/hooks/useOnboarding';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import OnboardingDetailDialog from '@/components/hr/OnboardingDetailDialog';
import { toast } from '@/hooks/use-toast';

const statusLabels: Record<string, string> = {
  pending: 'Pendente', in_progress: 'Em Andamento', completed: 'Concluído', archived: 'Arquivado',
};
const statusColors: Record<string, string> = {
  pending: 'secondary', in_progress: 'default', completed: 'outline', archived: 'secondary',
};

const HROnboarding = () => {
  const { processes, isLoading, createProcess } = useOnboardingProcesses();
  const { docTypes } = useOnboardingDocumentTypes();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [candidateName, setCandidateName] = useState('');
  const [candidateEmail, setCandidateEmail] = useState('');
  const [positionTag, setPositionTag] = useState('');
  const [notes, setNotes] = useState('');
  const [detailProcess, setDetailProcess] = useState<any>(null);
  const [createdLink, setCreatedLink] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  const companyId = profile?.company_id || '';

  const handleCreate = () => {
    if (!candidateName.trim() || !candidateEmail.trim() || !companyId) return;
    createProcess.mutate(
      { company_id: companyId, candidate_name: candidateName.trim(), candidate_email: candidateEmail.trim(), notes, position_tag: positionTag.trim() || null },
      {
        onSuccess: (data: any) => {
          const link = `${window.location.origin}/onboarding/${data.access_token}`;
          setCreatedLink(link);
          setCandidateName('');
          setCandidateEmail('');
          setPositionTag('');
          setNotes('');
        },
      }
    );
  };

  const handleCopyLink = (link: string) => {
    navigator.clipboard.writeText(link);
    setCopied(true);
    toast({ title: 'Link copiado!' });
    setTimeout(() => setCopied(false), 2000);
  };

  const handleCloseDialog = (isOpen: boolean) => {
    setOpen(isOpen);
    if (!isOpen) {
      setCreatedLink(null);
      setCopied(false);
    }
  };

  const getProcessLink = (p: any) => `${window.location.origin}/onboarding/${p.access_token}`;

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
        <h2 className="text-xl font-semibold">Portal de Admissão</h2>
        <div className="flex gap-2">
          <Button variant="outline" onClick={() => navigate('/hr/onboarding/settings')} className="gap-2">
            <Settings className="h-4 w-4" /> Configurar Docs
          </Button>
          <Dialog open={open} onOpenChange={handleCloseDialog}>
            <DialogTrigger asChild>
              <Button className="gap-2"><UserPlus className="h-4 w-4" /> Nova Admissão</Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Novo Processo de Admissão</DialogTitle>
              </DialogHeader>
              {createdLink ? (
                <div className="space-y-4">
                  <p className="text-sm text-muted-foreground">
                    Processo criado com sucesso! Envie o link abaixo para o candidato acessar e enviar os documentos:
                  </p>
                  <div className="flex items-center gap-2">
                    <Input value={createdLink} readOnly className="text-xs" />
                    <Button size="icon" variant="outline" onClick={() => handleCopyLink(createdLink)}>
                      {copied ? <Check className="h-4 w-4 text-green-500" /> : <Copy className="h-4 w-4" />}
                    </Button>
                  </div>
                  <div className="flex justify-end">
                    <Button variant="outline" onClick={() => handleCloseDialog(false)}>Fechar</Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-4">
                  <div>
                    <Label>Nome do candidato *</Label>
                    <Input value={candidateName} onChange={e => setCandidateName(e.target.value)} placeholder="Nome completo" />
                  </div>
                  <div>
                    <Label>Email do candidato *</Label>
                    <Input type="email" value={candidateEmail} onChange={e => setCandidateEmail(e.target.value)} placeholder="email@exemplo.com" />
                  </div>
                  <div>
                    <Label>Observações</Label>
                    <Textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="Observações sobre a admissão..." />
                  </div>
                  <div className="flex justify-end gap-2">
                    <Button variant="outline" onClick={() => handleCloseDialog(false)}>Cancelar</Button>
                    <Button onClick={handleCreate} disabled={!candidateName.trim() || !candidateEmail.trim() || createProcess.isPending}>
                      {createProcess.isPending ? 'Criando...' : 'Criar'}
                    </Button>
                  </div>
                </div>
              )}
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
                  <TableHead>Candidato</TableHead>
                  <TableHead>Email</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="hidden lg:table-cell">Criado em</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {processes.map((p: any) => (
                  <TableRow key={p.id}>
                    <TableCell className="font-medium">{p.candidate_name || '—'}</TableCell>
                    <TableCell className="text-muted-foreground text-sm">{p.candidate_email || '—'}</TableCell>
                    <TableCell>
                      <Badge variant={statusColors[p.status] as any}>{statusLabels[p.status] || p.status}</Badge>
                    </TableCell>
                    <TableCell className="hidden lg:table-cell text-muted-foreground">
                      {format(new Date(p.created_at), "dd/MM/yy", { locale: ptBR })}
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button variant="ghost" size="icon" onClick={() => handleCopyLink(getProcessLink(p))} title="Copiar link">
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="icon" onClick={() => setDetailProcess(p)}>
                          <Eye className="h-4 w-4" />
                        </Button>
                      </div>
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
