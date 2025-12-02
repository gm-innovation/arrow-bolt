import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface SendWhatsAppOptions {
  to: string;
  message: string;
  userId?: string;
  notificationType?: string;
}

export const useWhatsAppNotification = () => {
  const sendWhatsAppMessage = async (options: SendWhatsAppOptions) => {
    try {
      const { data, error } = await supabase.functions.invoke("send-whatsapp", {
        body: options,
      });

      if (error) {
        console.error("Error sending WhatsApp:", error);
        toast.error("Falha ao enviar mensagem WhatsApp");
        return { success: false, error };
      }

      console.log("WhatsApp sent:", data);
      return { success: true, data };
    } catch (error) {
      console.error("Error invoking WhatsApp function:", error);
      toast.error("Erro ao conectar com serviço de WhatsApp");
      return { success: false, error };
    }
  };

  const sendTaskAssignmentNotification = async (
    phoneNumber: string,
    technicianName: string,
    taskTitle: string,
    orderNumber: string
  ) => {
    const message = `🔧 *Nova Tarefa Atribuída*\n\nOlá ${technicianName}!\n\nVocê foi atribuído à tarefa "${taskTitle}" na OS #${orderNumber}.\n\nAcesse o sistema para mais detalhes.`;
    
    return sendWhatsAppMessage({
      to: phoneNumber,
      message,
      notificationType: "task_assignment",
    });
  };

  const sendScheduleChangeNotification = async (
    phoneNumber: string,
    technicianName: string,
    orderNumber: string,
    newDate: string
  ) => {
    const message = `📅 *Agendamento Alterado*\n\nOlá ${technicianName}!\n\nA data da OS #${orderNumber} foi alterada para ${newDate}.\n\nVerifique sua agenda no sistema.`;
    
    return sendWhatsAppMessage({
      to: phoneNumber,
      message,
      notificationType: "schedule_change",
    });
  };

  const sendCriticalOrderNotification = async (
    phoneNumber: string,
    adminName: string,
    orderNumber: string,
    daysOverdue: number
  ) => {
    const message = `⚠️ *OS Crítica*\n\nOlá ${adminName}!\n\nA OS #${orderNumber} está ${daysOverdue} dias em atraso e requer atenção urgente.\n\nAcesse o sistema para verificar.`;
    
    return sendWhatsAppMessage({
      to: phoneNumber,
      message,
      notificationType: "critical_order",
    });
  };

  const sendReportSubmittedNotification = async (
    phoneNumber: string,
    supervisorName: string,
    technicianName: string,
    orderNumber: string
  ) => {
    const message = `📝 *Relatório Enviado*\n\nOlá ${supervisorName}!\n\nO técnico ${technicianName} enviou um relatório para a OS #${orderNumber}.\n\nAcesse o sistema para revisar.`;
    
    return sendWhatsAppMessage({
      to: phoneNumber,
      message,
      notificationType: "report_submitted",
    });
  };

  return {
    sendWhatsAppMessage,
    sendTaskAssignmentNotification,
    sendScheduleChangeNotification,
    sendCriticalOrderNotification,
    sendReportSubmittedNotification,
  };
};
