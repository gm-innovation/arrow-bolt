import { useQuery } from "@tanstack/react-query";
import { Link } from "react-router-dom";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sparkles, ArrowRight, Mail, Phone } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";

interface Lead {
  id: string;
  name: string | null;
  email: string | null;
  phone: string | null;
  company_name: string | null;
  source: string | null;
  status: string | null;
  created_at: string;
}

export const LeadsHighlightCard = () => {
  const { profile } = useAuth();

  const { data: leads = [], isLoading } = useQuery({
    queryKey: ["dashboard-recent-leads", profile?.company_id],
    queryFn: async () => {
      if (!profile?.company_id) return [];
      const { data, error } = await supabase
        .from("public_site_leads")
        .select("id, name, email, phone, company_name, source, status, created_at")
        .eq("company_id", profile.company_id)
        .order("created_at", { ascending: false })
        .limit(5);
      if (error) throw error;
      return (data || []) as Lead[];
    },
    enabled: !!profile?.company_id,
    refetchInterval: 60_000,
  });

  const newCount = leads.filter((l) => (l.status || "new") === "new").length;

  return (
    <Card className="border-primary/40 bg-gradient-to-br from-primary/5 to-transparent">
      <CardHeader className="flex-row items-center justify-between space-y-0 pb-2">
        <div className="flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          <CardTitle className="text-lg">Leads recentes</CardTitle>
          {newCount > 0 && (
            <Badge className="bg-primary text-primary-foreground">
              {newCount} novo{newCount > 1 ? "s" : ""}
            </Badge>
          )}
        </div>
        <Button asChild variant="ghost" size="sm">
          <Link to="/commercial/site-leads">
            Ver todos <ArrowRight className="ml-1 h-4 w-4" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <p className="text-sm text-muted-foreground">Carregando…</p>
        ) : leads.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Nenhum lead recente. Assim que o site enviar um formulário, ele aparecerá aqui e uma notificação será disparada.
          </p>
        ) : (
          <ul className="divide-y">
            {leads.map((lead) => (
              <li key={lead.id} className="flex items-center justify-between gap-3 py-2">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-medium truncate">
                      {lead.company_name || lead.name || "Sem identificação"}
                    </span>
                    {(lead.status || "new") === "new" && (
                      <Badge variant="secondary" className="text-[10px]">NOVO</Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-xs text-muted-foreground mt-0.5 truncate">
                    {lead.email && (
                      <span className="flex items-center gap-1 truncate">
                        <Mail className="h-3 w-3" /> {lead.email}
                      </span>
                    )}
                    {lead.phone && (
                      <span className="flex items-center gap-1">
                        <Phone className="h-3 w-3" /> {lead.phone}
                      </span>
                    )}
                    {lead.source && <span>· {lead.source}</span>}
                  </div>
                </div>
                <span className="text-xs text-muted-foreground whitespace-nowrap">
                  {formatDistanceToNow(new Date(lead.created_at), { addSuffix: true, locale: ptBR })}
                </span>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
};
