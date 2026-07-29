import { Fingerprint, Loader2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { useBiometricAuth } from '@/hooks/useBiometricAuth';
import { isNativeApp } from '@/lib/platform';

/** Ativa/desativa o desbloqueio do Arrow por digital ou reconhecimento facial. */
export const BiometricLoginCard = () => {
  const { available, checking, enabled, setEnabled } = useBiometricAuth();

  return (
    <div className="rounded-lg border p-4 space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Fingerprint className="h-4 w-4 text-primary" />
            <span className="font-medium">Acesso por biometria</span>
            {enabled && <Badge variant="default">Ativo</Badge>}
          </div>
          <p className="text-sm text-muted-foreground">
            Use digital ou reconhecimento facial para desbloquear o aplicativo.
          </p>
        </div>

        {checking ? (
          <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
        ) : (
          <Switch
            checked={enabled}
            disabled={!available}
            onCheckedChange={(value) => void setEnabled(value)}
            aria-label="Ativar acesso por biometria"
          />
        )}
      </div>

      {!available && !checking && (
        <p className="text-xs text-muted-foreground">
          {isNativeApp()
            ? 'Nenhuma biometria cadastrada neste aparelho.'
            : 'Disponível apenas no aplicativo Arrow instalado no celular.'}
        </p>
      )}
    </div>
  );
};
