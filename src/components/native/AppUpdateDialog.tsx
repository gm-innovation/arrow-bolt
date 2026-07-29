import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Progress } from '@/components/ui/progress';
import { Badge } from '@/components/ui/badge';
import { Download, AlertTriangle } from 'lucide-react';
import type { AvailableUpdate, UpdatePhase } from '@/hooks/useAppUpdate';

interface AppUpdateDialogProps {
  open: boolean;
  update: AvailableUpdate | null;
  phase: UpdatePhase;
  progress: number;
  errorMessage: string | null;
  onConfirm: () => void;
  onPostpone: () => void;
}

/**
 * Modal de atualização OTA do Arrow.
 * Atualizações obrigatórias não permitem adiar.
 */
export const AppUpdateDialog = ({
  open,
  update,
  phase,
  progress,
  errorMessage,
  onConfirm,
  onPostpone,
}: AppUpdateDialogProps) => {
  if (!update) return null;

  const busy = phase === 'downloading' || phase === 'applying';
  const canPostpone = !update.mandatory && !busy;

  return (
    <AlertDialog open={open}>
      <AlertDialogContent className="max-w-md">
        <AlertDialogHeader>
          <AlertDialogTitle className="flex items-center gap-2">
            <Download className="h-5 w-5 text-primary" />
            Nova versão disponível
            <Badge variant="secondary">v{update.version}</Badge>
          </AlertDialogTitle>
          <AlertDialogDescription className="space-y-2">
            {update.message ? (
              <span className="block whitespace-pre-line">{update.message}</span>
            ) : (
              <span className="block">Correções e melhorias estão prontas para instalação.</span>
            )}
            {update.mandatory && (
              <span className="flex items-start gap-2 text-destructive">
                <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
                Esta é uma atualização obrigatória e precisa ser aplicada agora.
              </span>
            )}
          </AlertDialogDescription>
        </AlertDialogHeader>

        {busy && (
          <div className="space-y-2">
            <Progress value={phase === 'applying' ? 100 : progress} />
            <p className="text-sm text-muted-foreground">
              {phase === 'applying'
                ? 'Aplicando atualização e reiniciando o app...'
                : `Baixando atualização... ${progress}%`}
            </p>
          </div>
        )}

        {errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}

        <AlertDialogFooter>
          {canPostpone && (
            <AlertDialogCancel onClick={onPostpone} disabled={busy}>
              Depois
            </AlertDialogCancel>
          )}
          <AlertDialogAction onClick={onConfirm} disabled={busy}>
            {phase === 'error' ? 'Tentar novamente' : 'Atualizar agora'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};
