import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Link } from "react-router-dom";
import { FileText, ExternalLink } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { useManagementReview, INPUT_LABELS, OUTPUT_LABELS } from "@/hooks/useManagementReview";
import { toast } from "@/hooks/use-toast";
import { format, parseISO } from "date-fns";

interface Props {
  reviewId: string;
}

const ManagementReviewMinutesGenerator = ({ reviewId }: Props) => {
  const { user, profile } = useAuth();
  const { review, inputs, outputs, participants, attachMinutes } = useManagementReview(reviewId);
  const [generating, setGenerating] = useState(false);

  if (!review) return null;

  if (review.minutes_document_id) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-5 w-5" /> Ata da reunião
            <Badge variant="default">Vinculada</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground mb-3">
            A ata está registrada no GED como documento controlado.
          </p>
          <Link to={`/quality/documents/${review.minutes_document_id}`}>
            <Button variant="outline">
              <ExternalLink className="h-4 w-4 mr-2" /> Abrir ata no GED
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const generate = async () => {
    if (!profile?.company_id) return;
    setGenerating(true);
    try {
      const code = `ATA-AC-${format(parseISO(review.review_date), "yyyy-MM-dd")}`;
      const title = `Ata de Análise Crítica — ${format(parseISO(review.review_date), "dd/MM/yyyy")}`;

      const richContent = {
        review: {
          date: review.review_date,
          period_start: review.period_start,
          period_end: review.period_end,
          chair: review.chair?.full_name,
          summary: review.summary,
        },
        participants: participants.map((p) => ({
          name: p.profile?.full_name,
          role: p.role_in_meeting,
          attended: p.attended,
          confirmed_at: p.confirmed_at,
        })),
        inputs: inputs.map((i) => ({
          type: INPUT_LABELS[i.input_type],
          content: i.content,
          notes: i.notes,
          snapshot_at: i.snapshot_at,
        })),
        outputs: outputs.map((o) => ({
          type: OUTPUT_LABELS[o.output_type],
          description: o.description,
          responsible: o.responsible?.full_name,
          due_date: o.due_date,
          status: o.status,
          action_plan_id: o.linked_action_plan_id,
        })),
      };

      const { data: doc, error: docErr } = await supabase
        .from("quality_documents" as any)
        .insert({
          company_id: profile.company_id,
          code,
          title,
          status: "published",
          origin: "internal",
          document_control_mode: "full_control",
          classification: "registro",
          normative_reference: "ISO 9001:2015 — 9.3",
          published_at: new Date().toISOString(),
          created_by: user!.id,
        })
        .select()
        .single();
      if (docErr) throw docErr;

      const { data: ver, error: verErr } = await supabase
        .from("quality_document_versions" as any)
        .insert({
          document_id: (doc as any).id,
          revision_label: "Rev. 00",
          revision_number: 0,
          content_kind: "rich_text",
          rich_content: richContent,
          status: "issued",
          prepared_by: user!.id,
          issued_at: new Date().toISOString(),
        })
        .select()
        .single();
      if (verErr) throw verErr;

      await supabase
        .from("quality_documents" as any)
        .update({ current_version_id: (ver as any).id })
        .eq("id", (doc as any).id);

      await attachMinutes.mutateAsync({ minutes_document_id: (doc as any).id });
      toast({ title: "Ata gerada e registrada no GED" });
    } catch (e: any) {
      toast({ title: "Erro ao gerar ata", description: e.message, variant: "destructive" });
    } finally {
      setGenerating(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" /> Ata da reunião
          <Badge variant="outline">Pendente</Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        <p className="text-sm text-muted-foreground">
          A ata consolida participantes, entradas snapshotadas, saídas e planos de ação gerados.
          Após criada, fica versionada no GED.
        </p>
        <Button onClick={generate} disabled={generating}>
          <FileText className="h-4 w-4 mr-2" />
          {generating ? "Gerando..." : "Gerar ata"}
        </Button>
      </CardContent>
    </Card>
  );
};

export default ManagementReviewMinutesGenerator;
