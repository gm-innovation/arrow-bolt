import { useEffect, useState } from 'react';
import { isNativeApp } from '@/lib/platform';

/**
 * Estado de conectividade usando o plugin nativo (mais confiável no Android)
 * com fallback para os eventos online/offline do navegador.
 */
export const useNativeNetwork = () => {
  const [isOnline, setIsOnline] = useState<boolean>(
    typeof navigator === 'undefined' ? true : navigator.onLine
  );
  const [connectionType, setConnectionType] = useState<string>('unknown');

  useEffect(() => {
    let cleanup: (() => void) | undefined;

    if (isNativeApp()) {
      (async () => {
        const { Network } = await import('@capacitor/network');
        const status = await Network.getStatus();
        setIsOnline(status.connected);
        setConnectionType(status.connectionType);

        const listener = await Network.addListener('networkStatusChange', (s) => {
          setIsOnline(s.connected);
          setConnectionType(s.connectionType);
        });
        cleanup = () => void listener.remove();
      })();
    } else {
      const on = () => setIsOnline(true);
      const off = () => setIsOnline(false);
      window.addEventListener('online', on);
      window.addEventListener('offline', off);
      cleanup = () => {
        window.removeEventListener('online', on);
        window.removeEventListener('offline', off);
      };
    }

    return () => cleanup?.();
  }, []);

  return { isOnline, connectionType };
};
