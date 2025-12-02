import { useEffect, useRef } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useWhatsAppSettings } from './useWhatsAppSettings';
import { useWhatsAppNotification } from './useWhatsAppNotification';

/**
 * Hook que escuta notificações em tempo real e envia WhatsApp automaticamente
 * quando apropriado (ex: tarefa auto-completada pelo líder)
 */
export const useWhatsAppAutoNotifier = () => {
  const { user } = useAuth();
  const { settings, isWhatsAppEnabled } = useWhatsAppSettings();
  const { sendTaskAutoCompletedNotification } = useWhatsAppNotification();
  const processedNotifications = useRef<Set<string>>(new Set());

  useEffect(() => {
    if (!user?.id || !isWhatsAppEnabled) return;

    // Subscribe to new notifications for the current user
    const channel = supabase
      .channel('whatsapp-auto-notifier')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        async (payload) => {
          const notification = payload.new as {
            id: string;
            notification_type: string;
            title: string;
            message: string;
            user_id: string;
          };

          // Avoid processing the same notification twice
          if (processedNotifications.current.has(notification.id)) return;
          processedNotifications.current.add(notification.id);

          // Check if this is a task auto-completed notification
          if (
            notification.notification_type === 'task_update' &&
            notification.title === 'Tarefa Concluída pelo Líder' &&
            settings?.notify_task_auto_completed
          ) {
            // Get user's phone number
            const { data: profile } = await supabase
              .from('profiles')
              .select('phone, full_name')
              .eq('id', user.id)
              .single();

            if (profile?.phone) {
              // Extract info from the message
              // Message format: 'A tarefa "X" na OS #Y foi concluída por Z.'
              const taskMatch = notification.message.match(/tarefa "([^"]+)"/);
              const osMatch = notification.message.match(/OS #(\w+)/);
              const leaderMatch = notification.message.match(/concluída por ([^.]+)/);

              const taskTitle = taskMatch?.[1] || 'Tarefa';
              const orderNumber = osMatch?.[1] || '';
              const leadName = leaderMatch?.[1] || 'o técnico líder';

              await sendTaskAutoCompletedNotification(
                profile.phone,
                profile.full_name || 'Técnico',
                taskTitle,
                orderNumber,
                leadName
              );
            }
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, isWhatsAppEnabled, settings?.notify_task_auto_completed, sendTaskAutoCompletedNotification]);
};
