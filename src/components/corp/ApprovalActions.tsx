import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useCorpRequests } from '@/hooks/useCorpRequests';
import { useAuth } from '@/contexts/AuthContext';
import { CheckCircle2, XCircle } from 'lucide-react';

interface ApprovalActionsProps {
  request: any;
}

const ApprovalActions = ({ request }: ApprovalActionsProps) => {
  const { userRole } = useAuth();
  const { approveAsManager, approveAsDirector, rejectRequest } = useCorpRequests();
  const [rejectOpen, setRejectOpen] = useState(false);
  const [reason, setReason] = useState('');

  const isManager = userRole === 'admin' || userRole === 'manager' || userRole === 'super_admin';
  const isDirector = userRole === 'director' || userRole === 'admin' || userRole === 'super_admin';

  const canApproveManager = isManager && request.status === 'pending_manager';
  const canApproveDirector = isDirector && request.status === 'pending_director';
  const canReject = (canApproveManager || canApproveDirector);

  if (!canApproveManager && !canApproveDirector) return null;

  const handleApprove = () => {
    if (canApproveManager) {
      const requiresDirector = request.type?.requires_director_approval ||
        (request.type?.director_threshold_value && request.amount > request.type.director_threshold_value);
      approveAsManager.mutate({ id: request.id, requiresDirector: !!requiresDirector });
    } else if (canApproveDirector) {
      approveAsDirector.mutate(request.id);
    }
  };

  const handleReject = () => {
    if (!reason.trim()) return;
    rejectRequest.mutate({ id: request.id, reason }, {
      onSuccess: () => { setRejectOpen(false); setReason(''); }
    });
  };

  return (
    <div className="space-y-2">
      <p className="text-sm font-medium">Ações</p>
      <div className="flex gap-2">
        <Button onClick={handleApprove} className="gap-2" disabled={approveAsManager.isPending || approveAsDirector.isPending}>
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

      <Dialog open={rejectOpen} onOpenChange={setRejectOpen}>
        <DialogContent>
          <DialogHeader><DialogTitle>Rejeitar Requisição</DialogTitle></DialogHeader>
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
    </div>
  );
};

export default ApprovalActions;
