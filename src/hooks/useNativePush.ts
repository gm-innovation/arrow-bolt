import { useCallback, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { isNativeApp, getPlatform } from '@/lib/platform';
import { getNotificationRoute } from '@/lib/notificationRoutes';
import { toast } from 'sonner';

/**
 * Push nativo (FCM) via Capacitor com deep link para a tela correspondente.
 * No navegador/PWA o push continua sendo tratado por usePushNotifications.
 */
export const useNativePush = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [token, setToken] = useState<string | null>(null);
  const registered = useRef(false);

  const saveToken = useCallback(
    async (value: string) => {
      if (!user?.id) return;
      const { error } = await supabase.from('push_subscriptions').upsert(
        {
          user_id: user.id,
          endpoint: `fcm:${value}`,
          device_token: value,
          platform: getPlatform(),
        } as any,
        { onConflict: 'endpoint' }
      );
      if (error) console.error('[useNativePush] erro ao salvar token:', error);
    },
    [user?.id]
  );

  useEffect(() => {
    if (!isNativeApp() || !user?.id || registered.current) return;
    registered.current = true;

    let cleanup: (() => void) | undefined;

    (async () => {
      try {
        const { PushNotifications } = await import('@capacitor/push-notifications');

        let permission = await PushNotifications.checkPermissions();
        if (permission.receive === 'prompt') {
          permission = await PushNotifications.requestPermissions();
        }
        if (permission.receive !== 'granted') return;

        await PushNotifications.register();

        const listeners = await Promise.all([
          PushNotifications.addListener('registration', (t) => {
            setToken(t.value);
            void saveToken(t.value);
          }),
          PushNotifications.addListener('registrationError', (err) => {
            console.error('[useNativePush] erro de registro:', err);
          }),
          PushNotifications.addListener('pushNotificationReceived', (notification) => {
            toast(notification.title || 'Nova notificação', {
              description: notification.body || undefined,
            });
          }),
          PushNotifications.addListener('pushNotificationActionPerformed', (action) => {
            const data = (action.notification?.data || {}) as Record<string, string>;
            const route = data.route || getNotificationRoute(data.type || '', data.fallback_route);
            if (route) navigate(route);
          }),
        ]);

        cleanup = () => listeners.forEach((l) => void l.remove());
      } catch (error) {
        console.error('[useNativePush] falha ao inicializar push nativo:', error);
      }
    })();

    return () => cleanup?.();
  }, [user?.id, navigate, saveToken]);

  return { token, isNative: isNativeApp() };
};
