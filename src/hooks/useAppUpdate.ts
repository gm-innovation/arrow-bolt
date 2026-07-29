import { useCallback, useEffect, useRef, useState } from 'react';
import { isNativeApp } from '@/lib/platform';
import { APP_ID, BUNDLE_VERSION, NATIVE_BUILD, compareVersions } from '@/lib/appVersion';
import { supabase } from '@/integrations/supabase/client';

export interface AvailableUpdate {
  version: string;
  url: string;
  checksum?: string;
  minNativeBuild: number;
  mandatory: boolean;
  message: string | null;
  publishedAt: string | null;
}

export type UpdatePhase = 'idle' | 'checking' | 'available' | 'downloading' | 'applying' | 'error';

interface UpdaterApi {
  notifyAppReady: () => Promise<unknown>;
  current: () => Promise<{ bundle: { version: string } }>;
  download: (o: { url: string; version: string; checksum?: string }) => Promise<{ id: string }>;
  set: (o: { id: string }) => Promise<void>;
  addListener: (
    event: 'download',
    cb: (info: { percent: number }) => void
  ) => Promise<{ remove: () => Promise<void> }>;
}

async function loadUpdater(): Promise<UpdaterApi | null> {
  if (!isNativeApp()) return null;
  try {
    const mod = await import('@capgo/capacitor-updater');
    return mod.CapacitorUpdater as unknown as UpdaterApi;
  } catch (error) {
    console.warn('[useAppUpdate] plugin de atualização indisponível:', error);
    return null;
  }
}

/**
 * Consulta a Edge Function `app-update` e, quando o usuário aprova, baixa e
 * aplica o novo bundle web (OTA).
 *
 * Regras importantes:
 * - Consulta acontece no boot e ao retomar o app — NUNCA baixa automaticamente.
 * - Bundles com `minNativeBuild` maior que o APK instalado são bloqueados.
 * - Fora do app nativo o hook degrada silenciosamente (no-op).
 */
export function useAppUpdate() {
  const [phase, setPhase] = useState<UpdatePhase>('idle');
  const [update, setUpdate] = useState<AvailableUpdate | null>(null);
  const [progress, setProgress] = useState(0);
  const [nativeUpgradeRequired, setNativeUpgradeRequired] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [dismissed, setDismissed] = useState(false);
  const checkingRef = useRef(false);

  const getCurrentVersion = useCallback(async (): Promise<string> => {
    const updater = await loadUpdater();
    if (!updater) return BUNDLE_VERSION;
    try {
      const current = await updater.current();
      return current?.bundle?.version || BUNDLE_VERSION;
    } catch {
      return BUNDLE_VERSION;
    }
  }, []);

  const checkForUpdate = useCallback(async () => {
    if (!isNativeApp() || checkingRef.current) return;
    checkingRef.current = true;
    setPhase('checking');
    setErrorMessage(null);

    try {
      const currentVersion = await getCurrentVersion();
      const { data, error } = await supabase.functions.invoke('app-update', {
        body: {
          appId: APP_ID,
          currentVersion,
          nativeBuild: NATIVE_BUILD,
          platform: 'android',
        },
      });

      if (error) throw error;

      if (data?.nativeUpgradeRequired) {
        setNativeUpgradeRequired(true);
        setUpdate(null);
        setPhase('idle');
        return;
      }

      if (!data?.updateAvailable || !data?.url || !data?.version) {
        setUpdate(null);
        setPhase('idle');
        return;
      }

      // Guarda extra no cliente: nunca aplicar bundle acima do build nativo.
      if (Number(data.minNativeBuild ?? 1) > NATIVE_BUILD) {
        setNativeUpgradeRequired(true);
        setPhase('idle');
        return;
      }

      if (compareVersions(data.version, currentVersion) <= 0) {
        setUpdate(null);
        setPhase('idle');
        return;
      }

      setUpdate({
        version: data.version,
        url: data.url,
        checksum: data.checksum || undefined,
        minNativeBuild: Number(data.minNativeBuild ?? 1),
        mandatory: Boolean(data.mandatory),
        message: data.message ?? null,
        publishedAt: data.publishedAt ?? null,
      });
      setDismissed(false);
      setPhase('available');
    } catch (error) {
      console.error('[useAppUpdate] falha ao verificar atualização:', error);
      setPhase('idle');
    } finally {
      checkingRef.current = false;
    }
  }, [getCurrentVersion]);

  const applyUpdate = useCallback(async () => {
    if (!update) return;
    const updater = await loadUpdater();
    if (!updater) return;

    setPhase('downloading');
    setProgress(0);
    setErrorMessage(null);

    let listener: { remove: () => Promise<void> } | null = null;
    try {
      listener = await updater.addListener('download', (info) => {
        setProgress(Math.max(0, Math.min(100, Math.round(info?.percent ?? 0))));
      });

      // O plugin valida o SHA-256 do zip quando o checksum é informado.
      const bundle = await updater.download({
        url: update.url,
        version: update.version,
        checksum: update.checksum,
      });

      setPhase('applying');
      // Após set() o app reinicia com o novo bundle; nada roda depois disso.
      await updater.set({ id: bundle.id });
    } catch (error) {
      console.error('[useAppUpdate] falha ao aplicar atualização:', error);
      setErrorMessage(
        'Não foi possível concluir a atualização. Verifique sua conexão e tente novamente.'
      );
      setPhase('error');
    } finally {
      await listener?.remove().catch(() => {});
    }
  }, [update]);

  const postpone = useCallback(() => {
    setDismissed(true);
    setPhase('idle');
  }, []);

  const dismissNativeNotice = useCallback(() => setNativeUpgradeRequired(false), []);

  // Verificação no boot e ao retomar o app (somente consulta).
  useEffect(() => {
    if (!isNativeApp()) return;

    let cleanup: (() => void) | undefined;
    void checkForUpdate();

    (async () => {
      try {
        const { App } = await import('@capacitor/app');
        const handle = await App.addListener('resume', () => {
          void checkForUpdate();
        });
        cleanup = () => {
          void handle.remove();
        };
      } catch {
        // sem plugin App disponível — só a checagem de boot
      }
    })();

    return () => cleanup?.();
  }, [checkForUpdate]);

  return {
    phase,
    update,
    progress,
    errorMessage,
    nativeUpgradeRequired,
    isOpen: !dismissed && !!update && phase !== 'idle' && phase !== 'checking',
    checkForUpdate,
    applyUpdate,
    postpone,
    dismissNativeNotice,
  };
}
