import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";

export interface AuvoReportAttachment {
  url: string;
  name: string | null;
  subtitle?: string | null;
  description?: string | null;
  /** Legenda resolvida: prioriza o que o técnico escreveu no Auvo. */
  caption?: string | null;
  caption_source?: "auvo" | "vision" | null;
}

export type AuvoPhotoCaption = { url: string; caption: string; source: "auvo" | "vision" };


export interface AuvoReportMaterial {
  id: string;
  mentioned_name: string;
  quantity: number | null;
  unit: string | null;
  confidence: number | null;
  source_excerpt: string | null;
}

export interface AuvoQuestionnaire {
  id?: number;
  title?: string;
  answers?: { question?: string; reply?: string; answered_at?: string }[];
}

export interface AuvoTaskReportData {
  task: {
    id: string;
    auvo_task_id: string;
    order_number: string | null;
    customer_name: string | null;
    vessel_name: string | null;
    technician_name: string | null;
    task_date: string | null;
    checkin_at: string | null;
    checkout_at: string | null;
    orientation: string | null;
  } | null;
  report: {
    id: string;
    report_text: string | null;
    extraction_status: string | null;
    questionnaire: AuvoQuestionnaire[];
    attachments: AuvoReportAttachment[];
  } | null;
  materials: AuvoReportMaterial[];
}

/** Relatório completo de um atendimento Auvo, para revisão de divergências. */
export const useAuvoTaskReport = (auvoTaskUid?: string | null) => {
  return useQuery({
    queryKey: ["auvo-task-report", auvoTaskUid],
    enabled: !!auvoTaskUid,
    queryFn: async (): Promise<AuvoTaskReportData> => {
      const [taskRes, reportRes, materialsRes] = await Promise.all([
        supabase
          .from("auvo_tasks")
          .select(
            "id, auvo_task_id, order_number, customer_name, vessel_name, technician_name, task_date, checkin_at, checkout_at, orientation",
          )
          .eq("id", auvoTaskUid!)
          .maybeSingle(),
        supabase
          .from("auvo_task_reports")
          .select("id, report_text, extraction_status, questionnaire, attachments")
          .eq("auvo_task_uid", auvoTaskUid!)
          .maybeSingle(),
        supabase
          .from("auvo_report_materials")
          .select("id, mentioned_name, quantity, unit, confidence, source_excerpt")
          .eq("auvo_task_uid", auvoTaskUid!)
          .order("mentioned_name"),
      ]);

      if (taskRes.error) throw taskRes.error;
      if (reportRes.error) throw reportRes.error;
      if (materialsRes.error) throw materialsRes.error;

      const rawReport = reportRes.data;
      const attachments = Array.isArray(rawReport?.attachments)
        ? (rawReport!.attachments as unknown as AuvoReportAttachment[]).filter((a) => a?.url)
        : [];
      const questionnaire = Array.isArray(rawReport?.questionnaire)
        ? (rawReport!.questionnaire as unknown as AuvoQuestionnaire[])
        : [];

      return {
        task: (taskRes.data ?? null) as AuvoTaskReportData["task"],
        report: rawReport
          ? {
              id: rawReport.id,
              report_text: rawReport.report_text,
              extraction_status: rawReport.extraction_status,
              questionnaire,
              attachments,
            }
          : null,
        materials: (materialsRes.data ?? []) as AuvoReportMaterial[],
      };
    },
  });
};
