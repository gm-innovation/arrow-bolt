import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export type QAlertStatus = "due_soon" | "overdue" | "up_to_date";
export type QAlertSource = "org_context" | "interested_party" | "party_evidence" | "document" | "management_review" | "risk" | "supplier" | "device";

export interface QualityAlert {
  source: QAlertSource;
  category: string; // for documents, equals origin; for others, same as source
  entity_id: string;
  company_id: string;
  title: string;
  due_date: string | null;
  status: QAlertStatus | null;
  days_remaining: number | null;
}

export const useQualityAlerts = () => {
  const { user, profile } = useAuth();

  const { data: alerts = [], isLoading } = useQuery({
    queryKey: ["quality_alerts", profile?.company_id],
    enabled: !!user && !!profile?.company_id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("quality_alerts_v" as any)
        .select("*")
        .eq("company_id", profile!.company_id);
      if (error) throw error;
      return ((data ?? []) as unknown) as QualityAlert[];
    },
  });

  const active = alerts.filter((a) => a.status === "overdue" || a.status === "due_soon");

  const countBy = (predicate: (a: QualityAlert) => boolean) => active.filter(predicate).length;

  const counters = {
    org_context: countBy((a) => a.source === "org_context"),
    interested_party: countBy((a) => a.source === "interested_party"),
    party_evidence: countBy((a) => a.source === "party_evidence"),
    external_norm: countBy((a) => a.source === "document" && a.category === "external_norm"),
    external_law: countBy((a) => a.source === "document" && a.category === "external_law"),
    external_certificate: countBy((a) => a.source === "document" && a.category === "external_certificate"),
    client: countBy((a) => a.source === "document" && a.category === "client"),
    internal: countBy((a) => a.source === "document" && a.category === "internal"),
    safety: countBy((a) => a.source === "document" && a.category === "safety"),
    management_review: countBy((a) => a.source === "management_review"),
    supplier_requalification: countBy((a) => a.source === "supplier" && a.category === "requalification"),
    supplier_pending: countBy((a) => a.source === "supplier" && a.category === "pending_qualification"),
    device_calibration: countBy((a) => a.source === "device" && a.category === "calibration"),
  };

  return { alerts, active, counters, isLoading };
};

export const CATEGORY_LABELS: Record<string, string> = {
  org_context: "Contexto da Organização",
  interested_party: "Partes Interessadas",
  party_evidence: "Evidências",
  external_norm: "Normas externas",
  external_law: "Leis / Regulamentos",
  external_certificate: "Certificados / Licenças",
  client: "Docs do Cliente",
  internal: "Docs Internos",
  safety: "Saúde e Segurança",
  management_review: "Análise Crítica",
  supplier_requalification: "Reavaliação de Fornecedor",
  supplier_pending: "Qualificação Pendente",
  device_calibration: "Calibração de Instrumentos",
};
