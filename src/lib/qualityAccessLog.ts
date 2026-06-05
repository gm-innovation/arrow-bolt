import { supabase } from "@/integrations/supabase/client";

export type QualityAccessAction = "view" | "print" | "download";

export async function logQualityDocumentAccess(params: {
  document_id: string;
  version_id?: string | null;
  user_id: string;
  action: QualityAccessAction;
  context?: Record<string, any>;
}) {
  try {
    await supabase.from("quality_document_access_log").insert({
      document_id: params.document_id,
      version_id: params.version_id ?? null,
      user_id: params.user_id,
      action: params.action,
      context: params.context ?? null,
    });
  } catch (e) {
    // best-effort logging — never block UX
    console.warn("[quality] access log failed", e);
  }
}
