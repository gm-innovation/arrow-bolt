import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";

export interface AuvoCriticalItem {
  id: string;
  orderNumber: string | null;
  itemName: string;
  classification: string;
  severity: string | null;
  stockQuantity: number;
  reportedQuantity: number;
  valueAtRisk: number;
  createdAt: string;
  daysOpen: number;
  customerName: string | null;
  vesselName: string | null;
  technicianName: string | null;
  taskDate: string | null;
  serviceGroupId: string | null;
}

export interface AuvoPhotoGapItem {
  id: string;
  orderNumber: string | null;
  serviceGroupId: string | null;
  activity: string;
  expectedEvidence: string | null;
  severity: string | null;
  photoCount: number;
  createdAt: string;
}

export interface AuvoCriticalSummary {
  pendingCount: number;
  stockNotReportedCount: number;
  valueAtRisk: number;
  oldestDays: number | null;
  items: AuvoCriticalItem[];
  photoGaps: AuvoPhotoGapItem[];
  photoGapCount: number;
}


interface Row {
  id: string;
  order_number: string | null;
  item_name: string | null;
  classification: string;
  severity: string | null;
  stock_quantity: number | null;
  reported_quantity: number | null;
  value_at_risk: number | null;
  created_at: string;
  service_group_id: string | null;
  auvo_tasks: {
    customer_name: string | null;
    vessel_name: string | null;
    technician_name: string | null;
    task_date: string | null;
  } | null;
}

/**
 * Resumo executivo das divergências de material pendentes de revisão.
 * Usado na faixa de alerta e no KPI do dashboard da diretoria.
 */
export const useAuvoCriticalSummary = () => {
  const { profile } = useAuth();
  const companyId = profile?.company_id;

  return useQuery({
    queryKey: ["auvo-critical-summary", companyId],
    enabled: !!companyId,
    // A auditoria roda em background (fila da IA): a visão da diretoria se
    // atualiza sozinha para refletir os achados mais recentes.
    refetchInterval: 60000,
    queryFn: async (): Promise<AuvoCriticalSummary> => {

      const { data, error } = await supabase
        .from("auvo_material_discrepancies")
        .select(
          `id, order_number, item_name, classification, severity, stock_quantity,
           reported_quantity, value_at_risk, created_at, service_group_id,
           auvo_tasks:auvo_task_uid ( customer_name, vessel_name, technician_name, task_date )`,
        )
        .neq("classification", "match")
        .eq("review_status", "pending")
        .order("value_at_risk", { ascending: false })
        .limit(500);

      if (error) throw error;
      const rows = (data ?? []) as unknown as Row[];
      const now = Date.now();

      const items: AuvoCriticalItem[] = rows.map((r) => ({
        id: r.id,
        orderNumber: r.order_number,
        itemName: r.item_name ?? "Material não identificado",
        classification: r.classification,
        severity: r.severity,
        stockQuantity: Number(r.stock_quantity ?? 0),
        reportedQuantity: Number(r.reported_quantity ?? 0),
        valueAtRisk: Number(r.value_at_risk ?? 0),
        createdAt: r.created_at,
        daysOpen: Math.max(
          0,
          Math.floor((now - new Date(r.created_at).getTime()) / 86_400_000),
        ),
        customerName: r.auvo_tasks?.customer_name ?? null,
        vesselName: r.auvo_tasks?.vessel_name ?? null,
        technicianName: r.auvo_tasks?.technician_name ?? null,
        taskDate: r.auvo_tasks?.task_date ?? null,
        serviceGroupId: r.service_group_id,
      }));

      const stockNotReportedCount = items.filter(
        (i) => i.classification === "stock_not_reported",
      ).length;

      const { data: photoData, error: photoError } = await supabase
        .from("auvo_photo_findings")
        .select(
          "id, order_number, service_group_id, activity, expected_evidence, severity, photo_count, created_at",
        )
        .eq("review_status", "pending")
        .order("created_at", { ascending: false })
        .limit(500);

      if (photoError) throw photoError;

      const photoGaps: AuvoPhotoGapItem[] = (photoData ?? []).map((p) => ({
        id: p.id,
        orderNumber: p.order_number,
        serviceGroupId: p.service_group_id,
        activity: p.activity ?? "Atividade sem descrição",
        expectedEvidence: p.expected_evidence,
        severity: p.severity,
        photoCount: Number(p.photo_count ?? 0),
        createdAt: p.created_at,
      }));

      return {
        pendingCount: items.length,
        stockNotReportedCount,
        valueAtRisk: items.reduce((sum, i) => sum + i.valueAtRisk, 0),
        oldestDays: items.length ? Math.max(...items.map((i) => i.daysOpen)) : null,
        items,
        photoGaps,
        photoGapCount: photoGaps.length,
      };

    },
  });
};
