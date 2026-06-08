import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ClipboardCheck, Link as LinkIcon } from "lucide-react";
import { format, parseISO } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Link } from "react-router-dom";

const LastManagementReviewCard = () => {
  const { profile } = useAuth();
  const { data: review } = useQuery({
    queryKey: ["org_context_last_review", profile?.company_id],
    enabled: !!profile?.company_id,
    queryFn: async () => {
      // Fetch the context to get last_management_review_id
      const { data: ctx } = await supabase
        .from("quality_org_context" as any)
        .select("last_management_review_id")
        .eq("company_id", profile!.company_id)
        .maybeSingle();
      const id = (ctx as any)?.last_management_review_id;
      if (!id) {
        // fallback: latest closed review
        const { data } = await supabase
          .from("quality_management_reviews" as any)
          .select("id, review_date, status, summary")
          .eq("company_id", profile!.company_id)
          .order("review_date", { ascending: false })
          .limit(1)
          .maybeSingle();
        return data as any;
      }
      const { data } = await supabase
        .from("quality_management_reviews" as any)
        .select("id, review_date, status, summary")
        .eq("id", id)
        .maybeSingle();
      return data as any;
    },
  });

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-base flex items-center gap-2">
          <ClipboardCheck className="h-4 w-4" />Última Análise Crítica
        </CardTitle>
      </CardHeader>
      <CardContent>
        {!review ? (
          <p className="text-sm text-muted-foreground">Nenhuma análise crítica registrada ainda.</p>
        ) : (
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="text-sm">
              <div className="font-medium">
                {review.review_date ? format(parseISO(review.review_date), "dd 'de' MMMM 'de' yyyy", { locale: ptBR }) : "—"}
              </div>
              {review.summary && <div className="text-xs text-muted-foreground line-clamp-2">{review.summary}</div>}
              <Badge variant={review.status === "closed" ? "default" : "secondary"} className="mt-1">{review.status}</Badge>
            </div>
            <Button size="sm" variant="outline" asChild>
              <Link to={`/quality/management-review/${review.id}`}>
                <LinkIcon className="h-3.5 w-3.5 mr-1" />Abrir
              </Link>
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default LastManagementReviewCard;
