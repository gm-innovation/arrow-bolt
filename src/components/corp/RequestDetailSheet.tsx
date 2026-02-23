import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import ApprovalActions from './ApprovalActions';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

interface RequestDetailSheetProps {
  request: any;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const statusMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'outline' | 'success' | 'warning' | 'info' }> = {
  open: { label: 'Aberta', variant: 'info' },
  pending_manager: { label: 'Pendente Gerente', variant: 'warning' },
  pending_director: { label: 'Pendente Diretoria', variant: 'warning' },
  approved: { label: 'Aprovada', variant: 'success' },
  rejected: { label: 'Rejeitada', variant: 'destructive' },
  cancelled: { label: 'Cancelada', variant: 'secondary' },
  completed: { label: 'Concluída', variant: 'default' },
};

const priorityMap: Record<string, { label: string; variant: 'default' | 'secondary' | 'destructive' | 'warning' }> = {
  low: { label: 'Baixa', variant: 'secondary' },
  medium: { label: 'Média', variant: 'default' },
  high: { label: 'Alta', variant: 'warning' },
  urgent: { label: 'Urgente', variant: 'destructive' },
};

const RequestDetailSheet = ({ request, open, onOpenChange }: RequestDetailSheetProps) => {
  if (!request) return null;

  const status = statusMap[request.status] || { label: request.status, variant: 'outline' as const };
  const priority = priorityMap[request.priority] || { label: request.priority, variant: 'default' as const };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>{request.title}</SheetTitle>
        </SheetHeader>

        <div className="mt-4 space-y-4">
          <div className="flex gap-2 flex-wrap">
            <Badge variant={status.variant}>{status.label}</Badge>
            <Badge variant={priority.variant}>{priority.label}</Badge>
          </div>

          {request.description && (
            <div>
              <p className="text-sm font-medium text-muted-foreground mb-1">Descrição</p>
              <p className="text-sm">{request.description}</p>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <p className="text-muted-foreground">Solicitante</p>
              <p className="font-medium">{request.requester?.full_name || '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Departamento</p>
              <p className="font-medium">{request.department?.name || '—'}</p>
            </div>
            <div>
              <p className="text-muted-foreground">Tipo</p>
              <p className="font-medium">{request.type?.name || '—'}</p>
            </div>
            {request.amount && (
              <div>
                <p className="text-muted-foreground">Valor</p>
                <p className="font-medium">R$ {Number(request.amount).toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</p>
              </div>
            )}
            <div>
              <p className="text-muted-foreground">Criada em</p>
              <p className="font-medium">{format(new Date(request.created_at), "dd/MM/yyyy HH:mm", { locale: ptBR })}</p>
            </div>
          </div>

          <Separator />

          {/* Timeline de aprovação */}
          <div>
            <p className="text-sm font-medium mb-2">Fluxo de Aprovação</p>
            <div className="space-y-2 text-sm">
              {request.manager_approver && (
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span>Gerente: {request.manager_approver.full_name}</span>
                  {request.manager_approved_at && (
                    <span className="text-muted-foreground text-xs">
                      ({format(new Date(request.manager_approved_at), "dd/MM/yyyy HH:mm")})
                    </span>
                  )}
                </div>
              )}
              {request.director_approver && (
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500" />
                  <span>Diretoria: {request.director_approver.full_name}</span>
                  {request.director_approved_at && (
                    <span className="text-muted-foreground text-xs">
                      ({format(new Date(request.director_approved_at), "dd/MM/yyyy HH:mm")})
                    </span>
                  )}
                </div>
              )}
              {request.status === 'pending_manager' && (
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-muted-foreground">Aguardando aprovação do gerente</span>
                </div>
              )}
              {request.status === 'pending_director' && (
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />
                  <span className="text-muted-foreground">Aguardando aprovação da diretoria</span>
                </div>
              )}
              {request.rejection_reason && (
                <div className="p-2 bg-destructive/10 rounded text-sm">
                  <p className="font-medium text-destructive">Motivo da rejeição:</p>
                  <p>{request.rejection_reason}</p>
                </div>
              )}
            </div>
          </div>

          <Separator />

          <ApprovalActions request={request} />
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default RequestDetailSheet;
