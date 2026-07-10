import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertCircle, Bug, HelpCircle, Lightbulb, MessageSquare } from "lucide-react";

const CATEGORY_META: Record<string, { label: string; icon: any; color: string }> = {
  bug: { label: "Bug", icon: Bug, color: "bg-red-100 text-red-700" },
  feature_request: { label: "Sugestão", icon: Lightbulb, color: "bg-blue-100 text-blue-700" },
  question: { label: "Dúvida", icon: HelpCircle, color: "bg-yellow-100 text-yellow-700" },
  complaint: { label: "Reclamação", icon: AlertCircle, color: "bg-orange-100 text-orange-700" },
  other: { label: "Outro", icon: MessageSquare, color: "bg-slate-100 text-slate-700" },
};

const STATUS_LABELS: Record<string, string> = {
  open: "Aberto",
  in_review: "Em análise",
  in_progress: "Em andamento",
  resolved: "Resolvido",
  wont_fix: "Não será feito",
};

export default function MyTickets() {
  const { user } = useAuth();

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["my-support-tickets", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select("*, support_ticket_messages(id, body, is_admin, created_at)")
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Meus Chamados</h1>
        <p className="text-sm text-muted-foreground">
          Solicitações que você enviou ao Super Admin via Marina.
        </p>
      </div>

      {isLoading && <p className="text-sm text-muted-foreground">Carregando...</p>}
      {!isLoading && tickets.length === 0 && (
        <Card>
          <CardContent className="py-10 text-center text-sm text-muted-foreground">
            Você ainda não abriu nenhum chamado. Peça à Marina para "reportar um bug"
            ou "enviar uma sugestão" que ela cria o ticket automaticamente.
          </CardContent>
        </Card>
      )}

      <div className="space-y-3">
        {tickets.map((t: any) => {
          const cat = CATEGORY_META[t.category] ?? CATEGORY_META.other;
          const Icon = cat.icon;
          const replies = (t.support_ticket_messages ?? []).filter(
            (m: any) => m.is_admin,
          );
          return (
            <Card key={t.id}>
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <CardTitle className="text-base">
                      #{t.ticket_number} — {t.title}
                    </CardTitle>
                    <div className="text-xs text-muted-foreground mt-1">
                      {formatDistanceToNow(new Date(t.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={cat.color} variant="secondary">
                      <Icon className="h-3 w-3 mr-1" />
                      {cat.label}
                    </Badge>
                    <Badge variant="outline">{STATUS_LABELS[t.status] ?? t.status}</Badge>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="text-sm whitespace-pre-wrap">{t.description}</div>
                {replies.length > 0 && (
                  <div className="space-y-2 pt-2 border-t">
                    <div className="text-xs font-medium text-muted-foreground">
                      Respostas do Super Admin
                    </div>
                    {replies.map((m: any) => (
                      <div
                        key={m.id}
                        className="p-3 rounded-md bg-primary/10 border border-primary/20 text-sm whitespace-pre-wrap"
                      >
                        {m.body}
                        <div className="text-xs text-muted-foreground mt-1">
                          {formatDistanceToNow(new Date(m.created_at), {
                            addSuffix: true,
                            locale: ptBR,
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
