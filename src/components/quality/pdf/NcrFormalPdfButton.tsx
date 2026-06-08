import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useControlledDocMeta } from "@/hooks/useControlledDocMeta";
import QualityPdfPreviewButton from "./QualityPdfPreviewButton";
import NcrFormalPdf, { type NcrFormalPdfData } from "./NcrFormalPdf";

interface NcrFormalPdfButtonProps {
  ncrId: string;
  iconOnly?: boolean;
}

/** Carrega NCR + ações + responsáveis e abre o PDF formal LECSOR. */
export const NcrFormalPdfButton = ({ ncrId, iconOnly }: NcrFormalPdfButtonProps) => {
  const { baseMeta } = useControlledDocMeta();

  const { data, isLoading } = useQuery({
    queryKey: ["ncr_pdf_data", ncrId],
    queryFn: async () => {
      const { data: ncr, error } = await supabase
        .from("quality_ncrs" as any)
        .select("*")
        .eq("id", ncrId)
        .maybeSingle();
      if (error) throw error;
      if (!ncr) return null;

      // resolve nomes
      const ids = [(ncr as any).responsible_id, (ncr as any).detected_by, (ncr as any).closed_by].filter(Boolean);
      let names: Record<string, string> = {};
      if (ids.length > 0) {
        const { data: profs } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", ids);
        names = Object.fromEntries((profs ?? []).map((p: any) => [p.id, p.full_name]));
      }

      // ações vinculadas: action_plans onde ncr_id = ncrId -> items 5W2H
      const { data: plans } = await supabase
        .from("quality_action_plans" as any)
        .select("id")
        .eq("ncr_id", ncrId);
      const planIds = (plans ?? []).map((p: any) => p.id);
      let items: any[] = [];
      if (planIds.length > 0) {
        const { data: it } = await supabase
          .from("quality_action_items" as any)
          .select("*")
          .in("action_plan_id", planIds)
          .order("item_order", { ascending: true });
        items = it ?? [];
      }

      const whoIds = items.map((i: any) => i.who).filter((x: any) => x && !names[x]);
      if (whoIds.length > 0) {
        const { data: profs2 } = await supabase
          .from("profiles")
          .select("id, full_name")
          .in("id", whoIds);
        for (const p of profs2 ?? []) names[(p as any).id] = (p as any).full_name;
      }

      const action_items = items.map((a: any) => ({
        title: a.what,
        description: a.how,
        responsible: a.who ? names[a.who] ?? null : null,
        due_at: a.when_date,
        status: a.status,
      }));

      const payload: NcrFormalPdfData = {
        ncr_number: (ncr as any).ncr_number,
        title: (ncr as any).title,
        description: (ncr as any).description,
        ncr_type: (ncr as any).ncr_type,
        severity: (ncr as any).severity,
        status: (ncr as any).status,
        source: (ncr as any).source,
        affected_area: (ncr as any).affected_area,
        root_cause: (ncr as any).root_cause,
        immediate_action: (ncr as any).immediate_action,
        detected_at: (ncr as any).detected_at,
        deadline: (ncr as any).deadline,
        closed_at: (ncr as any).closed_at,
        verification_notes: (ncr as any).verification_notes,
        responsible_name: (ncr as any).responsible_id ? names[(ncr as any).responsible_id] : null,
        detected_by_name: (ncr as any).detected_by ? names[(ncr as any).detected_by] : null,
        closed_by_name: (ncr as any).closed_by ? names[(ncr as any).closed_by] : null,
        action_items,
      };
      return payload;
    },
  });

  if (isLoading || !data || !baseMeta.companyName) {
    return null;
  }

  return (
    <QualityPdfPreviewButton
      iconOnly={iconOnly}
      buttonLabel="Imprimir RNC"
      dialogTitle={`RNC-${String(data.ncr_number).padStart(4, "0")} — ${data.title}`}
      fileName={`RNC-${String(data.ncr_number).padStart(4, "0")}.pdf`}
      document={<NcrFormalPdf meta={baseMeta as any} ncr={data} />}
    />
  );
};

export default NcrFormalPdfButton;
