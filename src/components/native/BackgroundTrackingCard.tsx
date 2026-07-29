import { useCallback, useState } from 'react';
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
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { MapPin, Play, Square, ShieldCheck, Loader2 } from 'lucide-react';
import { useBackgroundTracking } from '@/hooks/useBackgroundTracking';

/**
 * Controle de rastreamento em segundo plano para técnicos em campo,
 * com consentimento explícito antes da primeira ativação.
 */
export const BackgroundTrackingCard = () => {
  const { supported, hasConsent, isTracking, starting, start, stop, setConsent } =
    useBackgroundTracking();
  const [askConsent, setAskConsent] = useState(false);

  const handleToggle = useCallback(async () => {
    if (isTracking) {
      await stop();
      return;
    }
    if (!hasConsent) {
      setAskConsent(true);
      return;
    }
    await start();
  }, [isTracking, hasConsent, start, stop]);

  const handleAccept = useCallback(async () => {
    setAskConsent(false);
    const ok = await setConsent(true);
    if (ok) await start();
  }, [setConsent, start]);

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-primary" />
            <span className="font-medium">Rastreamento em campo</span>
            {isTracking && <Badge variant="default">Ativo</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            Registra sua posição durante a jornada, mesmo com o app em segundo plano.
          </p>
        </div>

        <Button
          size="sm"
          variant={isTracking ? 'destructive' : 'default'}
          onClick={handleToggle}
          disabled={!supported || starting}
        >
          {starting ? (
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
          ) : isTracking ? (
            <Square className="mr-2 h-4 w-4" />
          ) : (
            <Play className="mr-2 h-4 w-4" />
          )}
          {isTracking ? 'Parar' : 'Iniciar'}
        </Button>
      </div>

      {!supported && (
        <p className="text-xs text-muted-foreground">
          Disponível apenas no aplicativo Arrow instalado no celular.
        </p>
      )}

      <AlertDialog open={askConsent} onOpenChange={setAskConsent}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle className="flex items-center gap-2">
              <ShieldCheck className="h-5 w-5 text-primary" />
              Autorização de rastreamento
            </AlertDialogTitle>
            <AlertDialogDescription asChild>
              <div className="space-y-2 text-left">
                <p>
                  Ao ativar, o Arrow registrará sua localização periodicamente enquanto o
                  rastreamento estiver ligado — inclusive com o aplicativo fechado.
                </p>
                <p>
                  Os dados são usados apenas para comprovação de atendimentos e roteirização,
                  ficam visíveis para a coordenação da sua empresa e podem ser desativados por
                  você a qualquer momento.
                </p>
              </div>
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Agora não</AlertDialogCancel>
            <AlertDialogAction onClick={handleAccept}>Autorizar e iniciar</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};
