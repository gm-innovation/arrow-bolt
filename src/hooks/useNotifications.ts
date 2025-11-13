import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useRef } from 'react';
import { usePushNotifications } from './usePushNotifications';

type Notification = {
  id: string;
  title: string;
  message: string | null;
  notification_type: string;
  read: boolean;
  created_at: string;
  reference_id: string | null;
};

export const useNotifications = (typeFilter?: string, statusFilter?: string) => {
  const { user } = useAuth();
  const queryClient = useQueryClient();
  const { sendNotification, permission } = usePushNotifications();
  const previousCountRef = useRef<number>(0);

  const { data: notifications = [], isLoading } = useQuery({
    queryKey: ['notifications', user?.id, typeFilter, statusFilter],
    queryFn: async () => {
      if (!user?.id) return [];

      let query = supabase
        .from('notifications')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });

      if (typeFilter && typeFilter !== "all-types") {
        query = query.eq('notification_type', typeFilter as any);
      }

      if (statusFilter && statusFilter !== "all-status") {
        query = query.eq('read', statusFilter === 'read');
      }

      const { data, error } = await query;
      
      if (error) throw error;
      return data as Notification[];
    },
    enabled: !!user?.id,
    staleTime: 1000 * 30, // 30 seconds
    gcTime: 1000 * 60 * 5, // 5 minutes
  });

  // Send push notification when new notifications arrive
  useEffect(() => {
    if (!notifications.length) return;

    const unreadCount = notifications.filter(n => !n.read).length;
    
    // Only send push if count increased (new notification)
    if (unreadCount > previousCountRef.current && previousCountRef.current > 0) {
      const latestUnread = notifications.find(n => !n.read);
      if (latestUnread && permission === 'granted') {
        sendNotification(latestUnread.title, {
          body: latestUnread.message || undefined,
          data: { notificationId: latestUnread.id, referenceId: latestUnread.reference_id },
        });
      }
    }
    
    previousCountRef.current = unreadCount;
  }, [notifications, permission, sendNotification]);

  // Real-time subscription
  useEffect(() => {
    if (!user?.id) return;

    const channel = supabase
      .channel('notifications-changes')
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'notifications',
          filter: `user_id=eq.${user.id}`,
        },
        () => {
          queryClient.invalidateQueries({ queryKey: ['notifications'] });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user?.id, queryClient]);

  const markAsRead = useMutation({
    mutationFn: async (notificationId: string) => {
      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('id', notificationId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const markAllAsRead = useMutation({
    mutationFn: async () => {
      if (!user?.id) return;

      const { error } = await supabase
        .from('notifications')
        .update({ read: true })
        .eq('user_id', user.id)
        .eq('read', false);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });

  const unreadCount = notifications.filter(n => !n.read).length;

  return {
    notifications,
    isLoading,
    unreadCount,
    markAsRead: markAsRead.mutate,
    markAllAsRead: markAllAsRead.mutate,
    isMarkingAsRead: markAsRead.isPending,
    isMarkingAllAsRead: markAllAsRead.isPending,
  };
};
