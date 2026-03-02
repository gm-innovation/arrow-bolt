import { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Package, CreditCard, FileText, CalendarDays, HelpCircle, DollarSign, Trash2 } from 'lucide-react';
import { useCorpRequests } from '@/hooks/useCorpRequests';
import { useCorpRequestTypes } from '@/hooks/useCorpRequestTypes';
import { useDepartments } from '@/hooks/useDepartments';
import { useDepartmentMembers } from '@/hooks/useDepartmentMembers';
import { useAuth } from '@/contexts/AuthContext';

interface NewRequestDialogProps {
  companyId: string;
}

const categoryIcons: Record<string, any> = {
  product: Package,
  subscription: CreditCard,
  document: FileText,
  time_off: CalendarDays,
  reimbursement: DollarSign,
  general: HelpCircle,
};

const categoryLabels: Record<string, string> = {
  product: 'Produto / Material',
  subscription: 'Assinatura / Software',
  document: 'Documento',
  time_off: 'Folga / Férias',
  reimbursement: 'Reembolso',
  general: 'Geral',
};

interface ProductItem {
  name: string;
  quantity: string;
  unit_value: string;
  link: string;
}

interface DocumentItem {
  type: string;
  observation: string;
}

const DOCUMENT_TYPE_OPTIONS = [
  { value: 'declaracao', label: 'Declaração' },
  { value: 'atestado', label: 'Atestado' },
  { value: 'certidao', label: 'Certidão' },
  { value: 'contrato', label: 'Contrato' },
  { value: 'contra_cheque', label: 'Contra-cheque / Holerite' },
  { value: 'outro', label: 'Outro' },
];

const NewRequestDialog = ({ companyId }: NewRequestDialogProps) => {
  const [open, setOpen] = useState(false);
  const [selectedTypeId, setSelectedTypeId] = useState('');
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState('medium');
  const [amount, setAmount] = useState('');
  const [departmentId, setDepartmentId] = useState('');
  const [targetUserId, setTargetUserId] = useState('');
  const [dynamicData, setDynamicData] = useState<Record<string, any>>({});

  // Multi-item states
  const [productItems, setProductItems] = useState<ProductItem[]>([{ name: '', quantity: '1', unit_value: '', link: '' }]);
  const [documentItems, setDocumentItems] = useState<DocumentItem[]>([{ type: '', observation: '' }]);

  const { createRequest } = useCorpRequests();
  const { requestTypes } = useCorpRequestTypes();
  const { departments } = useDepartments();
  const { members: departmentMembers } = useDepartmentMembers(departmentId || undefined);
  const { user } = useAuth();

  const selectedType = requestTypes.find((t: any) => t.id === selectedTypeId);
  const category = selectedType?.category || 'general';
  const activeTypes = requestTypes.filter((t: any) => t.active);

  const filteredUsers = useMemo(() => {
    if (!departmentId || !departmentMembers?.length) return [];
    return departmentMembers
      .filter((m: any) => m.profile && m.user_id !== user?.id)
      .map((m: any) => ({ id: m.user_id, full_name: m.profile.full_name }));
  }, [departmentMembers, departmentId, user?.id]);

  const productTotal = useMemo(() => {
    return productItems.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const val = parseFloat(item.unit_value) || 0;
      return sum + qty * val;
    }, 0);
  }, [productItems]);

  const resetForm = () => {
    setSelectedTypeId('');
    setTitle('');
    setDescription('');
    setPriority('medium');
    setAmount('');
    setDepartmentId('');
    setTargetUserId('');
    setDynamicData({});
    setProductItems([{ name: '', quantity: '1', unit_value: '', link: '' }]);
    setDocumentItems([{ type: '', observation: '' }]);
  };

  const handleSelectType = (typeId: string) => {
    const type = requestTypes.find((t: any) => t.id === typeId);
    setSelectedTypeId(typeId);
    if (type) {
      setTitle(type.name);
      setDepartmentId(type.department_id || '');
    }
  };

  const determineStatus = () => {
    if (!selectedType || !selectedType.requires_approval) return 'open';
    return 'pending_manager';
  };

  const handleSubmit = () => {
    if (!title.trim()) return;

    const finalDynamic = { ...dynamicData };

    if (category === 'product') {
      finalDynamic.items = productItems.filter(i => i.name.trim());
    }
    if (category === 'document') {
      finalDynamic.documents = documentItems.filter(i => i.type);
    }

    const finalAmount = category === 'product' ? productTotal : amount ? parseFloat(amount) : undefined;

    createRequest.mutate({
      company_id: companyId,
      title,
      description: description || undefined,
      priority,
      amount: finalAmount || undefined,
      department_id: departmentId || undefined,
      type_id: selectedTypeId || undefined,
      target_user_id: targetUserId || undefined,
      status: determineStatus(),
      dynamic_data: Object.keys(finalDynamic).length > 0 ? finalDynamic : undefined,
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

  // Product items handlers
  const addProductItem = () => setProductItems(prev => [...prev, { name: '', quantity: '1', unit_value: '', link: '' }]);
  const removeProductItem = (idx: number) => setProductItems(prev => prev.filter((_, i) => i !== idx));
  const updateProductItem = (idx: number, field: keyof ProductItem, value: string) => {
    setProductItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  // Document items handlers
  const addDocumentItem = () => setDocumentItems(prev => [...prev, { type: '', observation: '' }]);
  const removeDocumentItem = (idx: number) => setDocumentItems(prev => prev.filter((_, i) => i !== idx));
  const updateDocumentItem = (idx: number, field: keyof DocumentItem, value: string) => {
    setDocumentItems(prev => prev.map((item, i) => i === idx ? { ...item, [field]: value } : item));
  };

  const showAmount = ['general', 'subscription', 'reimbursement'].includes(category);
  const showTarget = ['general', 'document', 'time_off', 'reimbursement'].includes(category);

  const renderCategoryFields = () => {
    switch (category) {
      case 'product':
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Itens</Label>
              <Button type="button" variant="outline" size="sm" onClick={addProductItem} className="gap-1">
                <Plus className="h-3 w-3" /> Adicionar Item
              </Button>
            </div>
            {productItems.map((item, idx) => (
              <div key={idx} className="space-y-2 p-3 rounded-lg border bg-muted/30">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <Label className="text-xs">Produto</Label>
                    <Input value={item.name} onChange={e => updateProductItem(idx, 'name', e.target.value)} placeholder="Nome do produto" />
                  </div>
                  <div className="w-20">
                    <Label className="text-xs">Qtd</Label>
                    <Input type="number" value={item.quantity} onChange={e => updateProductItem(idx, 'quantity', e.target.value)} min="1" />
                  </div>
                  <div className="w-28">
                    <Label className="text-xs">Valor Unit.</Label>
                    <Input type="number" value={item.unit_value} onChange={e => updateProductItem(idx, 'unit_value', e.target.value)} placeholder="Opcional" />
                  </div>
                  {productItems.length > 1 && (
                    <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-destructive" onClick={() => removeProductItem(idx)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
                <div>
                  <Label className="text-xs">Link (opcional)</Label>
                  <Input value={item.link} onChange={e => updateProductItem(idx, 'link', e.target.value)} placeholder="https://..." type="url" />
                </div>
              </div>
            ))}
            {productTotal > 0 && (
              <p className="text-sm font-medium text-right">Total: R$ {productTotal.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
            )}
          </div>
        );

      case 'document':
        return (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Documentos Solicitados</Label>
              <Button type="button" variant="outline" size="sm" onClick={addDocumentItem} className="gap-1">
                <Plus className="h-3 w-3" /> Adicionar Documento
              </Button>
            </div>
            {documentItems.map((item, idx) => (
              <div key={idx} className="flex items-end gap-2 p-3 rounded-lg border bg-muted/30">
                <div className="flex-1">
                  <Label className="text-xs">Tipo</Label>
                  <Select value={item.type} onValueChange={v => updateDocumentItem(idx, 'type', v)}>
                    <SelectTrigger><SelectValue placeholder="Selecione o tipo" /></SelectTrigger>
                    <SelectContent>
                      {DOCUMENT_TYPE_OPTIONS.map(opt => (
                        <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex-1">
                  <Label className="text-xs">Observação</Label>
                  <Input value={item.observation} onChange={e => updateDocumentItem(idx, 'observation', e.target.value)} placeholder="Detalhes..." />
                </div>
                {documentItems.length > 1 && (
                  <Button type="button" variant="ghost" size="icon" className="h-10 w-10 text-destructive" onClick={() => removeDocumentItem(idx)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </div>
            ))}
          </div>
        );

      case 'subscription':
        return (
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Serviço / Plataforma</Label>
              <Input value={dynamicData.service_name || ''} onChange={e => updateDynamic('service_name', e.target.value)} placeholder="Ex: Slack, Figma" />
            </div>
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
          </div>
        );

      case 'time_off':
        return (
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
        );

      case 'reimbursement':
        return (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Descrição da Despesa</Label>
                <Input value={dynamicData.expense_description || ''} onChange={e => updateDynamic('expense_description', e.target.value)} placeholder="Ex: Alimentação em viagem" />
              </div>
              <div>
                <Label>Data da Despesa</Label>
                <Input type="date" value={dynamicData.expense_date || ''} onChange={e => updateDynamic('expense_date', e.target.value)} />
              </div>
            </div>
            <div>
              <Label>Comprovante (referência)</Label>
              <Input value={dynamicData.receipt_reference || ''} onChange={e => updateDynamic('receipt_reference', e.target.value)} placeholder="Nº da nota fiscal ou descrição" />
            </div>
          </div>
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

  return (
    <Dialog open={open} onOpenChange={o => { setOpen(o); if (!o) resetForm(); }}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="h-4 w-4" /> Nova Solicitação</Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Nova Solicitação</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {/* Type selection via Select dropdown */}
          <div>
            <Label>Tipo de Solicitação *</Label>
            <Select value={selectedTypeId} onValueChange={handleSelectType}>
              <SelectTrigger>
                <SelectValue placeholder="Selecione o tipo..." />
              </SelectTrigger>
              <SelectContent>
                {activeTypes.map((t: any) => {
                  const cat = t.category || 'general';
                  return (
                    <SelectItem key={t.id} value={t.id}>
                      <span className="flex items-center gap-2">
                        {categoryLabels[cat] || t.name}
                      </span>
                    </SelectItem>
                  );
                })}
              </SelectContent>
            </Select>
            {activeTypes.length === 0 && (
              <p className="text-sm text-muted-foreground mt-1">Nenhum tipo de solicitação configurado.</p>
            )}
          </div>

          {selectedTypeId && (
            <>
              <div>
                <Label>Título *</Label>
                <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título da solicitação" />
              </div>

              <div>
                <Label>Descrição</Label>
                <Textarea value={description} onChange={e => setDescription(e.target.value)} placeholder="Descreva a solicitação..." />
              </div>

              {renderCategoryFields()}
              {renderCustomDynamicFields()}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Departamento</Label>
                  <Select value={departmentId} onValueChange={v => { setDepartmentId(v); setTargetUserId(''); }}>
                    <SelectTrigger><SelectValue placeholder="Selecione" /></SelectTrigger>
                    <SelectContent>
                      {departments.map((d: any) => (
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
                  <Label>Destinatário {departmentId ? '' : '(selecione um departamento primeiro)'}</Label>
                  <Select value={targetUserId} onValueChange={setTargetUserId} disabled={!departmentId}>
                    <SelectTrigger><SelectValue placeholder={departmentId ? 'Selecione um destinatário' : 'Selecione o departamento primeiro'} /></SelectTrigger>
                    <SelectContent>
                      {filteredUsers.map((u: any) => (
                        <SelectItem key={u.id} value={u.id}>{u.full_name}</SelectItem>
                      ))}
                      {filteredUsers.length === 0 && departmentId && (
                        <div className="px-2 py-3 text-sm text-muted-foreground text-center">
                          Nenhum membro neste departamento
                        </div>
                      )}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {showAmount && (
                <div>
                  <Label>Valor (R$) - opcional</Label>
                  <Input type="number" value={amount} onChange={e => setAmount(e.target.value)} placeholder="0,00" />
                </div>
              )}

              {selectedType?.requires_approval && (
                <p className="text-sm text-muted-foreground bg-muted p-2 rounded">
                  ⓘ Este tipo requer aprovação
                  {selectedType.requires_director_approval && ' do gerente e da diretoria'}
                  {!selectedType.requires_director_approval && ' do gerente'}.
                </p>
              )}

              <div className="flex justify-end gap-2">
                <Button variant="outline" onClick={() => { setOpen(false); resetForm(); }}>Cancelar</Button>
                <Button onClick={handleSubmit} disabled={!title.trim() || createRequest.isPending}>
                  {createRequest.isPending ? 'Criando...' : 'Criar Solicitação'}
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default NewRequestDialog;
