import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertCircle, Bug, HelpCircle, Lightbulb, MessageSquare, Send, Sparkles } from "lucide-react";

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

function TicketReply({
  ticketId,
  userId,
  userRole,
  closed,
  onSent,
}: {
  ticketId: string;
  userId: string;
  userRole: string;
  closed: boolean;
  onSent: () => void;
}) {
  const [body, setBody] = useState("");

  const send = useMutation({
    mutationFn: async (text: string) => {
      const { data: inserted, error } = await supabase
        .from("support_ticket_messages")
        .insert({
          ticket_id: ticketId,
          author_id: userId,
          author_role: userRole,
          is_admin: false,
          body: text,
        })
        .select("id")
        .single();
      if (error) throw error;

      // Fire-and-forget triage (não bloqueia UX)
      supabase.functions
        .invoke("triage-ticket-reply", {
          body: { ticket_id: ticketId, message_id: inserted.id },
        })
        .catch(() => {});
    },
    onSuccess: () => {
      setBody("");
      onSent();
      toast.success("Resposta enviada. A Marina vai avaliar automaticamente.");
    },
    onError: (e: any) => toast.error(e?.message ?? "Falha ao enviar resposta"),
  });

  return (
    <div className="pt-3 border-t space-y-2">
      {closed && (
        <p className="text-xs text-muted-foreground flex items-center gap-1">
          <Sparkles className="h-3 w-3" />
          Este chamado está marcado como concluído. Se ainda houver algo pendente ou for um assunto novo, escreva abaixo — a Marina reabre ou cria um novo chamado automaticamente.
        </p>
      )}
      <Textarea
        placeholder="Responder ao Super Admin (ex: 'funcionou, obrigado', 'ainda está com problema', 'aproveitando, tem outro bug...')"
        rows={3}
        value={body}
        onChange={(e) => setBody(e.target.value)}
      />
      <div className="flex justify-end">
        <Button
          size="sm"
          onClick={() => send.mutate(body.trim())}
          disabled={!body.trim() || send.isPending}
        >
          <Send className="h-3 w-3 mr-1" />
          Enviar
        </Button>
      </div>
    </div>
  );
}

export default function MyTickets() {
  const { user } = useAuth();
  const qc = useQueryClient();

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["my-support-tickets", user?.id],
    enabled: !!user?.id,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_tickets")
        .select(
          "*, support_ticket_messages(id, body, is_admin, author_role, created_at)"
        )
        .eq("user_id", user!.id)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const invalidate = () =>
    qc.invalidateQueries({ queryKey: ["my-support-tickets", user?.id] });

  return (
    <div className="p-6 space-y-4">
      <div>
        <h1 className="text-2xl font-bold">Meus Chamados</h1>
        <p className="text-sm text-muted-foreground">
          Solicitações que você enviou ao Super Admin via Marina. Você pode responder aqui — a Marina interpreta a resposta e decide se reabre, encerra ou abre um novo chamado.
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
          const thread = [...(t.support_ticket_messages ?? [])].sort(
            (a: any, b: any) =>
              new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
          );
          const closed = t.status === "resolved" || t.status === "wont_fix";
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
                      {t.parent_ticket_id && (
                        <span className="ml-2 italic">· derivado automaticamente</span>
                      )}
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
                <div className="text-sm whitespace-pre-wrap p-3 rounded-md bg-muted/40 border">
                  {t.description}
                </div>

                {thread.length > 0 && (
                  <div className="space-y-2">
                    <div className="text-xs font-medium text-muted-foreground">
                      Conversa
                    </div>
                    {thread.map((m: any) => {
                      const isSystem = m.author_role === "system";
                      return (
                        <div
                          key={m.id}
                          className={
                            "p-3 rounded-md text-sm whitespace-pre-wrap " +
                            (isSystem
                              ? "bg-amber-50 border border-amber-200 text-amber-900 dark:bg-amber-950/30 dark:text-amber-200"
                              : m.is_admin
                              ? "bg-primary/10 border border-primary/20"
                              : "bg-muted border")
                          }
                        >
                          <div className="text-xs font-medium mb-1 flex items-center gap-1">
                            {isSystem && <Sparkles className="h-3 w-3" />}
                            {isSystem
                              ? "Marina (IA)"
                              : m.is_admin
                              ? "Super Admin"
                              : "Você"}
                            <span className="text-muted-foreground font-normal">
                              · {formatDistanceToNow(new Date(m.created_at), {
                                addSuffix: true,
                                locale: ptBR,
                              })}
                            </span>
                          </div>
                          {m.body}
                        </div>
                      );
                    })}
                  </div>
                )}

                {user && (
                  <TicketReply
                    ticketId={t.id}
                    userId={user.id}
                    userRole={t.user_role ?? "user"}
                    closed={closed}
                    onSent={invalidate}
                  />
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
