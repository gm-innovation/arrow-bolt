import { useEffect } from 'react';
import { isNativeApp, isAndroid } from '@/lib/platform';
import { useDeepLinks } from '@/hooks/useDeepLinks';
import { useNativePush } from '@/hooks/useNativePush';

/**
 * Inicializa recursos nativos (splash, status bar, deep links, push FCM).
 * Deve ser montado dentro do Router e do AuthProvider.
 */
export const NativeBootstrap = () => {
  useDeepLinks();
  useNativePush();

  useEffect(() => {
    if (!isNativeApp()) return;
    (async () => {
      try {
        const { SplashScreen } = await import('@capacitor/splash-screen');
        const { StatusBar, Style } = await import('@capacitor/status-bar');
        await StatusBar.setStyle({ style: Style.Default });
        if (isAndroid()) {
          await StatusBar.setOverlaysWebView({ overlay: false });
        }
        await SplashScreen.hide();
      } catch (error) {
        console.error('[NativeBootstrap] erro na inicialização nativa:', error);
      }
    })();
  }, []);

  return null;
};
