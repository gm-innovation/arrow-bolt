import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Plus, Trash2, ArrowLeft } from 'lucide-react';
import { useOnboardingDocumentTypes } from '@/hooks/useOnboarding';
import { useAuth } from '@/contexts/AuthContext';
import { useNavigate } from 'react-router-dom';

const HROnboardingSettings = () => {
  const { docTypes, isLoading, createDocType, deleteDocType } = useOnboardingDocumentTypes();
  const { profile } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [isRequired, setIsRequired] = useState(true);
  const [positionTag, setPositionTag] = useState('');

  const companyId = profile?.company_id || '';

  const handleAdd = () => {
    if (!name.trim() || !companyId) return;
    createDocType.mutate({
      company_id: companyId,
      name: name.trim(),
      description: description.trim() || undefined,
      is_required: isRequired,
      sort_order: docTypes.length,
      position_tag: positionTag.trim() || null,
    }, {
      onSuccess: () => { setName(''); setDescription(''); setIsRequired(true); setPositionTag(''); },
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate('/hr/onboarding')}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-xl font-semibold">Documentos de Admissão — Configuração</h2>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Adicionar Tipo de Documento</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-3">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="flex-1">
                <Label>Nome *</Label>
                <Input value={name} onChange={e => setName(e.target.value)} placeholder="Ex: RG, CPF, Comprovante de Residência" />
              </div>
              <div className="flex-1">
                <Label>Descrição</Label>
                <Input value={description} onChange={e => setDescription(e.target.value)} placeholder="Instruções para o colaborador" />
              </div>
              <div className="flex-1">
                <Label>Cargo/Posição</Label>
                <Input value={positionTag} onChange={e => setPositionTag(e.target.value)} placeholder="Vazio = todas as posições" />
              </div>
            </div>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox id="required" checked={isRequired} onCheckedChange={(c) => setIsRequired(!!c)} />
                <Label htmlFor="required" className="text-sm">Obrigatório</Label>
              </div>
              <Button onClick={handleAdd} disabled={!name.trim() || createDocType.isPending} className="gap-2">
                <Plus className="h-4 w-4" /> Adicionar
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="p-6"><Skeleton className="h-40 w-full" /></div>
          ) : docTypes.length === 0 ? (
            <div className="p-8 text-center text-muted-foreground">Nenhum tipo configurado ainda.</div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Nome</TableHead>
                  <TableHead>Descrição</TableHead>
                  <TableHead>Obrigatório</TableHead>
                  <TableHead>Ações</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {docTypes.map((dt: any) => (
                  <TableRow key={dt.id}>
                    <TableCell className="font-medium">{dt.name}</TableCell>
                    <TableCell className="text-muted-foreground">{dt.description || '—'}</TableCell>
                    <TableCell>
                      {dt.is_required ? <Badge>Sim</Badge> : <Badge variant="secondary">Não</Badge>}
                    </TableCell>
                    <TableCell>
                      <Button variant="ghost" size="icon" onClick={() => deleteDocType.mutate(dt.id)}>
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default HROnboardingSettings;
