import { useEffect, useRef } from 'react';
import { toast } from 'sonner';
import { isNativeApp } from '@/lib/platform';
import { useAuth } from '@/contexts/AuthContext';
import { useAppUpdate } from '@/hooks/useAppUpdate';
import { AppUpdateDialog } from './AppUpdateDialog';

/**
 * Confirma o bundle OTA e orquestra o modal de atualização.
 *
 * `notifyAppReady()` é chamado SOMENTE após bootstrap saudável (AuthContext
 * hidratado e árvore principal renderizada). Sem essa confirmação o plugin
 * considera a atualização falha e faz rollback automático para o bundle anterior.
 *
 * Deve ser montado dentro do Router e do AuthProvider.
 */
export const NativeAppUpdateProvider = () => {
  const { loading } = useAuth();
  const notifiedRef = useRef(false);

  const {
    isOpen,
    update,
    phase,
    progress,
    errorMessage,
    nativeUpgradeRequired,
    applyUpdate,
    postpone,
    dismissNativeNotice,
  } = useAppUpdate();

  // Confirma que o bundle atual iniciou corretamente.
  useEffect(() => {
    if (!isNativeApp() || loading || notifiedRef.current) return;
    notifiedRef.current = true;

    (async () => {
      try {
        const { CapacitorUpdater } = await import('@capgo/capacitor-updater');
        await CapacitorUpdater.notifyAppReady();
      } catch (error) {
        console.warn('[NativeAppUpdateProvider] notifyAppReady indisponível:', error);
      }
    })();
  }, [loading]);

  // Bundle exige uma casca nativa mais nova — não baixar.
  useEffect(() => {
    if (!nativeUpgradeRequired) return;
    toast('Atualização do aplicativo necessária', {
      description:
        'Esta atualização requer uma nova versão do aplicativo Android. Instale o APK mais recente para continuar recebendo melhorias.',
      duration: 12000,
      action: { label: 'Entendi', onClick: dismissNativeNotice },
    });
    dismissNativeNotice();
  }, [nativeUpgradeRequired, dismissNativeNotice]);

  if (!isNativeApp()) return null;

  return (
    <AppUpdateDialog
      open={isOpen}
      update={update}
      phase={phase}
      progress={progress}
      errorMessage={errorMessage}
      onConfirm={applyUpdate}
      onPostpone={postpone}
    />
  );
};
