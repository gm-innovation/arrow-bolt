import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Package, CreditCard, FileText, CalendarDays, HelpCircle, ArrowLeft } from 'lucide-react';
import { useCorpRequests } from '@/hooks/useCorpRequests';
import { useCorpRequestTypes } from '@/hooks/useCorpRequestTypes';
import { useDepartments } from '@/hooks/useDepartments';
import { useUsers } from '@/hooks/useUsers';
import { useAuth } from '@/contexts/AuthContext';
import { Card, CardContent } from '@/components/ui/card';

interface NewRequestDialogProps {
  companyId: string;
}

const categoryIcons: Record<string, any> = {
  product: Package,
  subscription: CreditCard,
  document: FileText,
  time_off: CalendarDays,
  general: HelpCircle,
};

const categoryLabels: Record<string, string> = {
  product: 'Produto / Material',
  subscription: 'Assinatura / Software',
  document: 'Documento',
  time_off: 'Folga / Férias',
  general: 'Geral',
};

const NewRequestDialog = ({ companyId }: NewRequestDialogProps) => {
  const [open, setOpen] = useState(false);
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedTypeId, setSelectedTypeId] = useState('');

  // Form fields
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [amount, setAmount] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const [dynamicData, setDynamicData] = useState<Record<string, any>>({});

  const { createRequest } = useCorpRequests();
  const { requestTypes } = useCorpRequestTypes();
  const { departments } = useDepartments();
  const { users } = useUsers();
  const { user } = useAuth();

  const selectedType = requestTypes.find((t: any) => t.id === selectedTypeId);
  const category = selectedType?.category || 'general';

  const resetForm = () => {
    setStep(1);
    setSelectedTypeId('');
    setTitle('');
    setDescription('');
    setPriority('medium');
    setAmount('');
    setDepartmentId('');
    setTargetUserId('');
    setDynamicData({});
  };

  const determineStatus = () => {
    if (!selectedType || !selectedType.requires_approval) return 'open';
    return 'pending_manager';
  };

  const handleSelectType = (typeId: string) => {
    const type = requestTypes.find((t: any) => t.id === typeId);
    setSelectedTypeId(typeId);
    if (type) {
      setTitle(type.name);
      setDepartmentId(type.department_id || '');
    }
    setStep(2);
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
      type_id: selectedTypeId || undefined,
      target_user_id: targetUserId || undefined,
      status: determineStatus(),
      dynamic_data: Object.keys(dynamicData).length > 0 ? dynamicData : undefined,
    }, {
      onSuccess: () => {
        setOpen(false);
        resetForm();
      }
    });
  };

  const updateDynamic = (key: string, value: any) => {
    setDynamicData(prev => ({ ...prev, [key]: value }));
  };

  const activeTypes = requestTypes.filter((t: any) => t.active);

  // Group types by category for display
  const renderTypeCards = () => (
    <div className="grid grid-cols-2 gap-3">
      {activeTypes.map((t: any) => {
        const cat = t.category || 'general';
        const Icon = categoryIcons[cat] || HelpCircle;
        return (
          <Card
            key={t.id}
            className="cursor-pointer hover:border-primary transition-colors"
            onClick={() => handleSelectType(t.id)}
          >
            <CardContent className="flex flex-col items-center gap-2 p-4">
              <Icon className="h-8 w-8 text-primary" />
              <span className="text-sm font-medium text-center">{t.name}</span>
              <span className="text-xs text-muted-foreground">{categoryLabels[cat] || cat}</span>
            </CardContent>
          </Card>
        );
      })}
      {activeTypes.length === 0 && (
        <p className="col-span-2 text-center text-muted-foreground py-8">Nenhum tipo de solicitação configurado.</p>
      )}
    </div>
  );

  const renderCategoryFields = () => {
    switch (category) {
      case 'product':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Produto / Material</Label>
                <Input value={dynamicData.product_name || ''} onChange={e => updateDynamic('product_name', e.target.value)} placeholder="Nome do produto" />
              </div>
              <div>
                <Label>Quantidade</Label>
                <Input type="number" value={dynamicData.quantity || ''} onChange={e => updateDynamic('quantity', e.target.value)} placeholder="1" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Valor Unitário (R$)</Label>
                <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" />
              </div>
              <div>
                <Label>Justificativa</Label>
                <Input value={dynamicData.justification || ''} onChange={e => updateDynamic('justification', e.target.value)} placeholder="Motivo da compra" />
              </div>
            </div>
          </>
        );
      case 'subscription':
        return (
          <>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Serviço / Plataforma</Label>
                <Input value={dynamicData.service_name || ''} onChange={e => updateDynamic('service_name', e.target.value)} placeholder="Ex: Slack, Figma" />
              </div>
              <div>
                <Label>Valor Mensal (R$)</Label>
                <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Período</Label>
                <Select value={dynamicData.period || ''} onValueChange={v => updateDynamic('period', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="monthly">Mensal</SelectItem>
                    <SelectItem value="quarterly">Trimestral</SelectItem>
                    <SelectItem value="annual">Anual</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Justificativa</Label>
                <Input value={dynamicData.justification || ''} onChange={e => updateDynamic('justification', e.target.value)} placeholder="Motivo da assinatura" />
              </div>
            </div>
          </>
        );
      case 'document':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo de Documento</Label>
              <Select value={dynamicData.document_type || ''} onValueChange={v => updateDynamic('document_type', v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="declaracao">Declaração</SelectItem>
                  <SelectItem value="atestado">Atestado</SelectItem>
                  <SelectItem value="certidao">Certidão</SelectItem>
                  <SelectItem value="contrato">Contrato</SelectItem>
                  <SelectItem value="outro">Outro</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Prazo Desejado</Label>
              <Input type="date" value={dynamicData.deadline || ''} onChange={e => updateDynamic('deadline', e.target.value)} />
            </div>
          </div>
        );
      case 'time_off':
        return (
          <>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <Label>Tipo</Label>
                <Select value={dynamicData.time_off_type || ''} onValueChange={v => updateDynamic('time_off_type', v)}>
                  <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="folga">Folga</SelectItem>
                    <SelectItem value="ferias">Férias</SelectItem>
                    <SelectItem value="abono">Abono</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Data Início</Label>
                <Input type="date" value={dynamicData.start_date || ''} onChange={e => updateDynamic('start_date', e.target.value)} />
              </div>
              <div>
                <Label>Data Fim</Label>
                <Input type="date" value={dynamicData.end_date || ''} onChange={e => updateDynamic('end_date', e.target.value)} />
              </div>
            </div>
          </>
        );
      default:
        return null;
    }
  };

  // Render custom dynamic_fields from the type (if any)
  const renderCustomDynamicFields = () => {
    if (!selectedType?.dynamic_fields || !Array.isArray(selectedType.dynamic_fields)) return null;
    return (
      <>
        {(selectedType.dynamic_fields as any[]).map((field: any, idx: number) => (
          <div key={idx}>
            <Label>{field.label || field.name}</Label>
            {field.type === 'select' ? (
              <Select value={dynamicData[field.name] || ''} onValueChange={v => updateDynamic(field.name, v)}>
                <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                <SelectContent>
                  {(field.options || []).map((opt: string) => (
                    <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : field.type === 'textarea' ? (
              <Textarea value={dynamicData[field.name] || ''} onChange={e => updateDynamic(field.name, e.target.value)} placeholder={field.placeholder || ''} />
            ) : (
              <Input type={field.type || 'text'} value={dynamicData[field.name] || ''} onChange={e => updateDynamic(field.name, e.target.value)} placeholder={field.placeholder || ''} />
            )}
          </div>
        ))}
      </>
    );
  };

  const showAmount = category === 'general';
  const showTarget = ['general', 'document', 'time_off'].includes(category);

  return (
    <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) resetForm(); }}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="h-4 w-4" /> Nova Solicitação</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 1 ? 'Selecione o tipo de solicitação' : `Nova Solicitação — ${selectedType?.name || ''}`}
          </DialogTitle>
        </DialogHeader>

        {step === 1 && renderTypeCards()}

        {step === 2 && (
          <div className="space-y-4">
            <Button variant="ghost" size="sm" className="gap-1 -ml-2" onClick={() => { setStep(1); setSelectedTypeId(''); }}>
              <ArrowLeft className="h-4 w-4" /> Voltar
            </Button>

            <div>
              <Label>Título *</Label>
              <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título da solicitação" />
            </div>

            <div>
              <Label>Descrição</Label>
              <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descreva a solicitação..." />
            </div>

            {/* Category-specific fields */}
            {renderCategoryFields()}

            {/* Custom dynamic fields from type config */}
            {renderCustomDynamicFields()}

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
            </div>

            {showTarget && (
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
            )}

            {showAmount && (
              <div>
                <Label>Valor (se aplicável)</Label>
                <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" />
              </div>
            )}

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
              <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }}>Cancelar</Button>
              <Button onClick={handleSubmit} disabled={!title.trim() || createRequest.isPending}>
                {createRequest.isPending ? 'Criando...' : 'Criar Solicitação'}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default NewRequestDialog;
