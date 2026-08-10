import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertTriangle, FileText, Package } from "lucide-react";
import { formatLocalDate } from "@/lib/utils";

interface AuvoReportPanelProps {
  serviceOrderId: string;
  orderNumber?: string | null;
}

const classificationLabel: Record<string, string> = {
  match: "Conferido",
  quantity_mismatch: "Quantidade divergente",
  stock_not_reported: "Baixado do estoque, sem relato",
  reported_not_in_stock: "Relatado sem baixa",
  stock_returned: "Devolvido ao estoque",
  unidentified: "Não identificado",
};

export const AuvoReportPanel = ({ serviceOrderId, orderNumber }: AuvoReportPanelProps) => {
  const { data, isLoading } = useQuery({
    queryKey: ["auvo-order-panel", serviceOrderId, orderNumber],
    queryFn: async () => {
      let query = supabase
        .from("auvo_tasks")
        .select("*")
        .order("task_date", { ascending: false });

      query = orderNumber
        ? query.or(`service_order_id.eq.${serviceOrderId},order_number.eq.${orderNumber}`)
        : query.eq("service_order_id", serviceOrderId);

      const { data: tasks, error } = await query;
      if (error) throw error;
      if (!tasks?.length) return { tasks: [], reports: [], materials: [], discrepancies: [] };

      const uids = tasks.map((t) => t.id);

      const [reportsRes, materialsRes, discRes] = await Promise.all([
        supabase.from("auvo_task_reports").select("*").in("auvo_task_uid", uids),
        supabase.from("auvo_report_materials").select("*").in("auvo_task_uid", uids),
        supabase.from("auvo_material_discrepancies").select("*").in("auvo_task_uid", uids),
      ]);

      return {
        tasks,
        reports: reportsRes.data ?? [],
        materials: materialsRes.data ?? [],
        discrepancies: discRes.data ?? [],
      };
    },
  });

  if (isLoading) {
    return (
      <div className="space-y-3">
        <Skeleton className="h-20 w-full" />
        <Skeleton className="h-20 w-full" />
      </div>
    );
  }

  if (!data?.tasks.length) {
    return (
      <div className="text-center py-10 text-sm text-muted-foreground">
        Nenhum atendimento do Auvo vinculado a esta OS.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {data.tasks.map((task) => {
        const reports = data.reports.filter((r) => r.auvo_task_uid === task.id);
        const materials = data.materials.filter((m) => m.auvo_task_uid === task.id);
        const discrepancies = data.discrepancies.filter((d) => d.auvo_task_uid === task.id);

        return (
          <div key={task.id} className="rounded-lg border p-4 space-y-4">
            <div className="flex items-start justify-between gap-2">
              <div>
                <p className="text-sm font-medium">
                  Atendimento Auvo #{task.auvo_task_id}
                  {task.auvo_task_type ? ` · ${task.auvo_task_type}` : ""}
                </p>
                <p className="text-xs text-muted-foreground">
                  {task.technician_name || "Técnico não informado"}
                  {task.task_date ? ` · ${formatLocalDate(task.task_date)}` : ""}
                </p>
              </div>
              {task.auvo_status && <Badge variant="outline">{task.auvo_status}</Badge>}
            </div>

            <div>
              <h4 className="text-sm font-medium flex items-center gap-2">
                <FileText className="h-4 w-4" /> Relatório do técnico
              </h4>
              <Separator className="my-2" />
              {reports.length === 0 && (
                <p className="text-xs text-muted-foreground">Sem relatório sincronizado.</p>
              )}
              {reports.map((report) => (
                <p key={report.id} className="text-sm whitespace-pre-wrap">
                  {report.report_text || "Relatório sem texto."}
                </p>
              ))}
            </div>

            {materials.length > 0 && (
              <div>
                <h4 className="text-sm font-medium flex items-center gap-2">
                  <Package className="h-4 w-4" /> Materiais citados no relatório
                </h4>
                <Separator className="my-2" />
                <ul className="space-y-1">
                  {materials.map((m) => (
                    <li key={m.id} className="text-sm flex justify-between gap-2">
                      <span>{m.mentioned_name}</span>
                      <span className="text-muted-foreground">
                        {m.quantity ?? "?"} {m.unit ?? ""}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {discrepancies.length > 0 && (
              <div>
                <h4 className="text-sm font-medium flex items-center gap-2 text-destructive">
                  <AlertTriangle className="h-4 w-4" /> Divergências de material
                </h4>
                <Separator className="my-2" />
                <ul className="space-y-2">
                  {discrepancies
                    .sort((a, b) =>
                      a.classification === "stock_not_reported" ? -1 : b.classification === "stock_not_reported" ? 1 : 0,
                    )
                    .map((d) => (
                      <li
                        key={d.id}
                        className={`rounded-md p-2 text-sm ${
                          d.classification === "stock_not_reported"
                            ? "bg-destructive/10 border border-destructive/40"
                            : "bg-muted/50"
                        }`}
                      >
                        <div className="flex justify-between gap-2">
                          <span className="font-medium">{d.item_name}</span>
                          <Badge variant={d.severity === "high" ? "destructive" : "secondary"}>
                            {classificationLabel[d.classification] ?? d.classification}
                          </Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          Estoque: {d.stock_quantity} · Relatado: {d.reported_quantity ?? 0}
                        </p>
                        {d.ai_notes && <p className="text-xs mt-1">{d.ai_notes}</p>}
                      </li>
                    ))}
                </ul>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
};
