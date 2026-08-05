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
   * Dispatch through the multi-channel edge function, which respects each
   * user's notification preferences (in-app, push, e-mail, WhatsApp).
   * Falls back to a direct in-app insert if the function is unavailable.
   */
  const dispatch = async (payload: {
    userIds: string[];
    title: string;
    message?: string;
    type: NotificationType;
    referenceId?: string;
    url?: string;
  }) => {
    try {
      const { error } = await supabase.functions.invoke("notify-dispatch", {
        body: {
          userIds: payload.userIds,
          title: payload.title,
          message: payload.message ?? null,
          type: payload.type,
          referenceId: payload.referenceId ?? null,
          url: payload.url ?? (payload.referenceId ? `/tech/tasks/${payload.referenceId}` : null),
        },
      });
      if (error) throw error;
      return { success: true };
    } catch (error) {
      console.warn("notify-dispatch failed, falling back to in-app insert:", error);
      const { error: insertError } = await supabase.from("notifications").insert(
        payload.userIds.map((userId) => ({
          user_id: userId,
          title: payload.title,
          message: payload.message,
          notification_type: payload.type,
          reference_id: payload.referenceId || null,
        })),
      );
      if (insertError) {
        console.error("Error creating notification:", insertError);
        return { success: false, error: insertError };
      }
      return { success: true };
    }
  };

  /**
   * Send a notification to a single user
   */

  const sendNotification = async (options: NotificationOptions) => {
    const { userId, title, message, type, referenceId, sendWhatsApp = false, whatsAppPhone } = options;

    const result = await dispatch({ userIds: [userId], title, message, type, referenceId });

    // Explicit ad-hoc WhatsApp (caller passed a phone directly)
    if (sendWhatsApp && whatsAppPhone) {
      sendWhatsAppMessage({
        to: whatsAppPhone,
        message: `${title}\n\n${message || ""}`,
        notificationType: type,
      }).catch((err) => console.warn("WhatsApp notification failed:", err));
    }

    return result;
  };

  /**
   * Send notifications to multiple users at once
   */
  const sendBulkNotifications = async (options: BulkNotificationOptions) => {
    const { userIds, title, message, type, referenceId } = options;

    if (userIds.length === 0) return { success: true, sent: 0 };

    const result = await dispatch({ userIds, title, message, type, referenceId });
    return { ...result, sent: result.success ? userIds.length : 0 };
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
