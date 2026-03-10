import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCorpRequests } from '@/hooks/useCorpRequests';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle2, XCircle, Play, CheckCheck, ArrowUpRight, DollarSign } from 'lucide-react';

interface ApprovalActionsProps {
  request: any;
}

const ApprovalActions = ({ request }: ApprovalActionsProps) => {
  const { user, userRole } = useAuth();
  const {
    approveAsDirector, rejectRequest,
    escalateToDirector, updateDepartmentAmount,
    startDepartmentWork, completeDepartmentWork,
  } = useCorpRequests();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');
  const [amountOpen, setAmountOpen] = useState(false);
  const [newAmount, setNewAmount] = useState('');

  const isDirector = userRole === 'director' || userRole === 'super_admin';
  const isFinanceiro = userRole === 'financeiro' || userRole === 'super_admin';
  const isSuprimentos = userRole === 'compras' || userRole === 'super_admin';
  const isHR = userRole === 'hr' || userRole === 'super_admin';

  const typeDepartmentId = request.type?.department_id;
  const typeCategory = request.type?.category || (request as any).category;

  // Diretoria pode aprovar quando pending_director
  const canApproveDirector = isDirector && request.status === 'pending_director';

  // Departamento executor pode agir quando pending_department ou in_progress
  const isDepartmentExecutor = (() => {
    if (!typeDepartmentId) return false;
    // Check by role mapping
    if (isFinanceiro && ['subscription', 'reimbursement'].includes(typeCategory)) return true;
    if (isSuprimentos && typeCategory === 'product') return true;
    if (isHR && ['document', 'time_off'].includes(typeCategory)) return true;
    return false;
  })();

  const canStartWork = isDepartmentExecutor && request.status === 'pending_department';
  const canComplete = isDepartmentExecutor && request.status === 'in_progress';
  const canEscalate = isDepartmentExecutor && request.status === 'pending_department' && typeCategory === 'reimbursement';
  const canUpdateAmount = isDepartmentExecutor && ['pending_department', 'in_progress'].includes(request.status) && ['product', 'subscription'].includes(typeCategory);

  const canReject = canApproveDirector;

  if (!canApproveDirector && !canStartWork && !canComplete && !canEscalate && !canUpdateAmount) return null;

  const handleApproveDirector = () => {
    approveAsDirector.mutate({
      id: request.id,
      typeDepartmentId,
      amount: request.amount,
    });
  };

  const handleReject = () => {
    if (!reason.trim()) return;
    rejectRequest.mutate({ id: request.id, reason }, {
      onSuccess: () => { setRejectOpen(false); setReason(''); }
    });
  };

  const handleEscalate = () => {
    escalateToDirector.mutate(request.id);
  };

  const handleUpdateAmount = () => {
    const parsed = parseFloat(newAmount);
    if (isNaN(parsed) || parsed <= 0) return;
    updateDepartmentAmount.mutate({
      id: request.id,
      newAmount: parsed,
      approvedAmount: request.approved_amount,
    }, {
      onSuccess: () => { setAmountOpen(false); setNewAmount(''); }
    });
  };

  return (
    <div className="space-y-3">
      <p className="text-sm font-medium">Ações</p>

      {/* Diretoria */}
      {canApproveDirector && (
        <div className="flex gap-2">
          <Button onClick={handleApproveDirector} className="gap-2" disabled={approveAsDirector.isPending}>
            <CheckCircle2 className="h-4 w-4" />
            Aprovar
          </Button>
          {canReject && (
            <Button variant="destructive" onClick={() => setRejectOpen(true)} className="gap-2">
              <XCircle className="h-4 w-4" />
              Rejeitar
            </Button>
          )}
        </div>
      )}

      {/* Departamento executor */}
      {canStartWork && (
        <div className="flex gap-2 flex-wrap">
          <Button onClick={() => startDepartmentWork.mutate(request.id)} className="gap-2" disabled={startDepartmentWork.isPending}>
            <Play className="h-4 w-4" />
            Iniciar Atendimento
          </Button>
          {canEscalate && (
            <Button variant="outline" onClick={handleEscalate} className="gap-2" disabled={escalateToDirector.isPending}>
              <ArrowUpRight className="h-4 w-4" />
              Encaminhar p/ Diretoria
            </Button>
          )}
        </div>
      )}

      {canComplete && (
        <Button onClick={() => completeDepartmentWork.mutate(request.id)} className="gap-2" disabled={completeDepartmentWork.isPending}>
          <CheckCheck className="h-4 w-4" />
          Concluir
        </Button>
      )}

      {canUpdateAmount && (
        <Button variant="outline" size="sm" onClick={() => { setNewAmount(String(request.amount || '')); setAmountOpen(true); }} className="gap-2">
          <DollarSign className="h-4 w-4" />
          Alterar Valor
        </Button>
      )}

      {/* Dialog rejeição */}
      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rejeitar Solicitação</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <Textarea value={reason} onChange={e => setReason(e.target.value)} placeholder="Motivo da rejeição..." />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setRejectOpen(false)}>Cancelar</Button>
              <Button variant="destructive" onClick={handleReject} disabled={!reason.trim() || rejectRequest.isPending}>
                Confirmar Rejeição
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Dialog alterar valor */}
      <Dialog open={amountOpen} onOpenChange={setAmountOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Alterar Valor</DialogTitle></DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Valor aprovado atual: R$ {Number(request.approved_amount || request.amount || 0).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</Label>
            </div>
            <div>
              <Label>Novo valor (R$)</Label>
              <Input type="number" value={newAmount} onChange={e => setNewAmount(e.target.value)} placeholder="0,00" />
            </div>
            <p className="text-sm text-muted-foreground">
              Se o novo valor for diferente do aprovado, a solicitação retornará para aprovação da diretoria.
            </p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAmountOpen(false)}>Cancelar</Button>
              <Button onClick={handleUpdateAmount} disabled={!newAmount || updateDepartmentAmount.isPending}>
                Confirmar
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default ApprovalActions;
