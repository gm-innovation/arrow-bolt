import { supabase } from "@/integrations/supabase/client";
import { useWhatsAppNotification } from "@/hooks/useWhatsAppNotification";
import { toast } from "sonner";

// Match the database notification_type enum
type NotificationType = 
  | "new_company"
  | "payment_overdue"
  | "report_submitted"
  | "schedule_change"
  | "service_order"
  | "service_order_created"
  | "service_order_updated"
  | "task_assignment"
  | "task_update";

interface NotificationOptions {
  userId: string;
  title: string;
  message?: string;
  type: NotificationType;
  referenceId?: string;
  sendPush?: boolean;
  sendWhatsApp?: boolean;
  whatsAppPhone?: string;
}

interface BulkNotificationOptions {
  userIds: string[];
  title: string;
  message?: string;
  type: NotificationType;
  referenceId?: string;
  sendPush?: boolean;
}

export const useNotificationService = () => {
  const { sendWhatsAppMessage } = useWhatsAppNotification();

  /**
   * Send a notification to a single user
   * Creates an in-app notification and optionally sends push notification
   */
  const sendNotification = async (options: NotificationOptions) => {
    const { userId, title, message, type, referenceId, sendPush = true, sendWhatsApp = false, whatsAppPhone } = options;

    try {
      // 1. Create in-app notification
      const { error: notifError } = await supabase
        .from("notifications")
        .insert({
          user_id: userId,
          title,
          message,
          notification_type: type,
          reference_id: referenceId || null,
        });

      if (notifError) {
        console.error("Error creating notification:", notifError);
        throw notifError;
      }

      // 2. Send push notification via edge function
      if (sendPush) {
        try {
          const { error: pushError } = await supabase.functions.invoke("send-push-notification", {
            body: {
              user_id: userId,
              title,
              body: message || title,
              url: referenceId ? `/tech/tasks/${referenceId}` : undefined,
            },
          });

          if (pushError) {
            console.warn("Push notification failed:", pushError);
          }
        } catch (pushErr) {
          console.warn("Push notification error:", pushErr);
        }
      }

      // 3. Optionally send WhatsApp
      if (sendWhatsApp && whatsAppPhone) {
        sendWhatsAppMessage({
          to: whatsAppPhone,
          message: `${title}\n\n${message || ""}`,
          notificationType: type,
        }).catch(err => console.warn("WhatsApp notification failed:", err));
      }

      return { success: true };
    } catch (error) {
      console.error("Error in sendNotification:", error);
      return { success: false, error };
    }
  };

  /**
   * Send notifications to multiple users at once
   */
  const sendBulkNotifications = async (options: BulkNotificationOptions) => {
    const { userIds, title, message, type, referenceId, sendPush = true } = options;

    if (userIds.length === 0) return { success: true, sent: 0 };

    try {
      // 1. Create in-app notifications for all users
      const notifications = userIds.map(userId => ({
        user_id: userId,
        title,
        message,
        notification_type: type,
        reference_id: referenceId || null,
      }));

      const { error: notifError } = await supabase
        .from("notifications")
        .insert(notifications);

      if (notifError) {
        console.error("Error creating bulk notifications:", notifError);
        throw notifError;
      }

      // 2. Send push notifications to all users
      if (sendPush) {
        const pushPromises = userIds.map(userId =>
          supabase.functions.invoke("send-push-notification", {
            body: {
              user_id: userId,
              title,
              body: message || title,
              url: referenceId ? `/tech/tasks/${referenceId}` : undefined,
            },
          }).catch(err => {
            console.warn(`Push notification failed for user ${userId}:`, err);
            return null;
          })
        );

        await Promise.allSettled(pushPromises);
      }

      return { success: true, sent: userIds.length };
    } catch (error) {
      console.error("Error in sendBulkNotifications:", error);
      return { success: false, error, sent: 0 };
    }
  };

  /**
   * Notify technicians about a new or updated service order
   */
  const notifyTechniciansAboutOrder = async (
    technicianIds: string[],
    orderNumber: string,
    orderId: string,
    isNew: boolean,
    additionalMessage?: string
  ) => {
    if (technicianIds.length === 0) return;

    // Get user IDs from technician IDs
    const { data: technicians } = await supabase
      .from("technicians")
      .select("user_id")
      .in("id", technicianIds);

    const userIds = technicians?.map(t => t.user_id).filter(Boolean) || [];

    if (userIds.length === 0) return;

    return sendBulkNotifications({
      userIds,
      title: isNew ? `Nova OS ${orderNumber} atribuída` : `OS ${orderNumber} atualizada`,
      message: additionalMessage || (isNew 
        ? `Você foi atribuído à ordem de serviço ${orderNumber}.`
        : `A ordem de serviço ${orderNumber} foi alterada. Verifique os detalhes.`),
      type: isNew ? "service_order_created" : "service_order_updated",
      referenceId: orderId,
      sendPush: true,
    });
  };

  /**
   * Notify coordinator/supervisor about a new service order
   */
  const notifyCoordinatorAboutOrder = async (
    coordinatorUserId: string | null | undefined,
    supervisorUserId: string | null | undefined,
    orderNumber: string,
    orderId: string,
    isNew: boolean
  ) => {
    const userIds = [coordinatorUserId, supervisorUserId].filter(Boolean) as string[];
    
    if (userIds.length === 0) return;

    return sendBulkNotifications({
      userIds,
      title: isNew ? `Nova OS ${orderNumber} criada` : `OS ${orderNumber} atualizada`,
      message: isNew 
        ? `Uma nova ordem de serviço foi criada.`
        : `A ordem de serviço ${orderNumber} foi alterada.`,
      type: isNew ? "service_order_created" : "service_order_updated",
      referenceId: orderId,
      sendPush: true,
    });
  };

  /**
   * Notify about schedule changes
   */
  const notifyScheduleChange = async (
    userIds: string[],
    orderNumber: string,
    orderId: string,
    newDate: string
  ) => {
    return sendBulkNotifications({
      userIds,
      title: `Agendamento alterado - OS ${orderNumber}`,
      message: `A data da OS ${orderNumber} foi alterada para ${newDate}.`,
      type: "schedule_change",
      referenceId: orderId,
      sendPush: true,
    });
  };

  /**
   * Notify supervisor about submitted report
   */
  const notifyReportSubmitted = async (
    supervisorUserId: string,
    technicianName: string,
    orderNumber: string,
    orderId: string
  ) => {
    return sendNotification({
      userId: supervisorUserId,
      title: `Relatório enviado - OS ${orderNumber}`,
      message: `O técnico ${technicianName} enviou um relatório para a OS ${orderNumber}.`,
      type: "report_submitted",
      referenceId: orderId,
      sendPush: true,
    });
  };

  return {
    sendNotification,
    sendBulkNotifications,
    notifyTechniciansAboutOrder,
    notifyCoordinatorAboutOrder,
    notifyScheduleChange,
    notifyReportSubmitted,
  };
};
