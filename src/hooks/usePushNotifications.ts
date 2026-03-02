import { useEffect, useState, useCallback } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';

export const usePushNotifications = () => {
  const { user } = useAuth();
  const [permission, setPermission] = useState<NotificationPermission>('default');
  const [isSupported, setIsSupported] = useState(false);
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [vapidPublicKey, setVapidPublicKey] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const supported = 'Notification' in window && 'serviceWorker' in navigator && 'PushManager' in window;
    setIsSupported(supported);
    
    if ('Notification' in window) {
      setPermission(Notification.permission);
    }

    // Fetch VAPID public key
    fetchVapidKey();

    // Check if already subscribed
    if (supported && user?.id) {
      checkSubscription();
    }
  }, [user?.id]);

  const fetchVapidKey = async () => {
    try {
      const { data, error } = await supabase.functions.invoke('get-vapid-key');
      
      if (error) {
        console.error('Error fetching VAPID key:', error);
        return;
      }
      
      if (data?.publicKey) {
        setVapidPublicKey(data.publicKey);
      }
    } catch (error) {
      console.error('Error fetching VAPID key:', error);
    }
  };

  const checkSubscription = async () => {
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await (registration as any).pushManager.getSubscription();
      setIsSubscribed(!!subscription);
    } catch (error) {
      console.error('Error checking subscription:', error);
    }
  };

  const requestPermission = async () => {
    if (!isSupported) {
      console.warn('Push notifications are not supported in this browser');
      return false;
    }

    setIsLoading(true);
    try {
      const result = await Notification.requestPermission();
      setPermission(result);
      
      if (result === 'granted') {
        await subscribeToPush();
      }
      
      return result === 'granted';
    } catch (error) {
      console.error('Error requesting notification permission:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const subscribeToPush = async () => {
    if (!user?.id) return false;
    if (!vapidPublicKey) {
      console.error('VAPID public key not available');
      // Retry fetching
      await fetchVapidKey();
      if (!vapidPublicKey) {
        console.error('Failed to fetch VAPID key');
        return false;
      }
    }

    setIsLoading(true);
    try {
      // Register custom service worker for push
      const registration = await navigator.serviceWorker.register('/sw-custom.js', {
        scope: '/'
      });

      await navigator.serviceWorker.ready;

      // Check for existing subscription
      let subscription = await (registration as any).pushManager.getSubscription();

      if (!subscription) {
        // Create new subscription using fetched VAPID public key
        subscription = await (registration as any).pushManager.subscribe({
          userVisibleOnly: true,
          applicationServerKey: urlBase64ToUint8Array(vapidPublicKey)
        });
      }

      // Save subscription to database
      const subscriptionJSON = subscription.toJSON();
      
      const { error } = await supabase
        .from('push_subscriptions')
        .upsert({
          user_id: user.id,
          endpoint: subscriptionJSON.endpoint!,
          p256dh: subscriptionJSON.keys!.p256dh,
          auth: subscriptionJSON.keys!.auth
        }, {
          onConflict: 'user_id'
        });

      if (error) {
        console.error('Error saving subscription:', error);
        return false;
      }

      setIsSubscribed(true);
      console.log('Push subscription saved successfully');
      return true;
    } catch (error) {
      console.error('Error subscribing to push:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const unsubscribe = async () => {
    setIsLoading(true);
    try {
      const registration = await navigator.serviceWorker.ready;
      const subscription = await (registration as any).pushManager.getSubscription();
      
      if (subscription) {
        await subscription.unsubscribe();
        
        // Remove from database
        if (user?.id) {
          await supabase
            .from('push_subscriptions')
            .delete()
            .eq('user_id', user.id);
        }
      }
      
      setIsSubscribed(false);
      return true;
    } catch (error) {
      console.error('Error unsubscribing:', error);
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const sendNotification = useCallback((title: string, options?: NotificationOptions) => {
    if (permission !== 'granted') {
      console.warn('Notification permission not granted');
      return;
    }

    try {
      if (document.visibilityState === 'visible') {
        return;
      }

      const notification = new Notification(title, {
        icon: '/pwa-192x192.png',
        badge: '/pwa-192x192.png',
        tag: 'aqua-task-notification',
        renotify: true,
        ...options,
      } as NotificationOptions);

      notification.onclick = () => {
        window.focus();
        notification.close();
      };

      setTimeout(() => notification.close(), 10000);
    } catch (error) {
      console.error('Error sending notification:', error);
    }
  }, [permission]);

  return {
    permission,
    isSupported,
    isSubscribed,
    isLoading,
    vapidConfigured: !!vapidPublicKey,
    requestPermission,
    subscribeToPush,
    unsubscribe,
    sendNotification,
  };
};

// Helper function to convert VAPID key
function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = '='.repeat((4 - base64String.length % 4) % 4);
  const base64 = (base64String + padding)
    .replace(/-/g, '+')
    .replace(/_/g, '/');

  const rawData = window.atob(base64);
  const outputArray = new Uint8Array(rawData.length);

  for (let i = 0; i < rawData.length; ++i) {
    outputArray[i] = rawData.charCodeAt(i);
  }
  return outputArray.buffer as ArrayBuffer;
}
