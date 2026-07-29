import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { isNativeApp } from '@/lib/platform';

/**
 * Deep links (arrow://... ou https://arrow.lovable.app/...) e botão físico "voltar" do Android.
 */
export const useDeepLinks = () => {
  const navigate = useNavigate();

  useEffect(() => {
    if (!isNativeApp()) return;
    let cleanup: (() => void) | undefined;

    (async () => {
      const { App } = await import('@capacitor/app');

      const urlListener = await App.addListener('appUrlOpen', ({ url }) => {
        try {
          const parsed = new URL(url);
          const path = `${parsed.pathname}${parsed.search}${parsed.hash}`;
          if (path && path !== '/') navigate(path);
        } catch {
          // esquema customizado sem host válido: arrow://rota
          const path = url.replace(/^[a-z]+:\/\//i, '/');
          if (path) navigate(path);
        }
      });

      const backListener = await App.addListener('backButton', ({ canGoBack }) => {
        if (canGoBack) {
          window.history.back();
        } else {
          void App.exitApp();
        }
      });

      cleanup = () => {
        void urlListener.remove();
        void backListener.remove();
      };
    })();

    return () => cleanup?.();
  }, [navigate]);
};
