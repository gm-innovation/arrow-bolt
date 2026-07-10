import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { formatDistanceToNow } from "date-fns";
import { ptBR } from "date-fns/locale";
import { AlertCircle, Bug, Lightbulb, HelpCircle, MessageSquare, RefreshCw } from "lucide-react";

const CATEGORY_META: Record<string, { label: string; icon: any; color: string }> = {
  bug: { label: "Bug", icon: Bug, color: "bg-red-100 text-red-700" },
  feature_request: { label: "Sugestão", icon: Lightbulb, color: "bg-blue-100 text-blue-700" },
  question: { label: "Dúvida", icon: HelpCircle, color: "bg-yellow-100 text-yellow-700" },
  complaint: { label: "Reclamação", icon: AlertCircle, color: "bg-orange-100 text-orange-700" },
  other: { label: "Outro", icon: MessageSquare, color: "bg-slate-100 text-slate-700" },
};

const PRIORITY_META: Record<string, { label: string; color: string }> = {
  low: { label: "Baixa", color: "bg-slate-100 text-slate-700" },
  medium: { label: "Média", color: "bg-blue-100 text-blue-700" },
  high: { label: "Alta", color: "bg-orange-100 text-orange-700" },
  critical: { label: "Crítica", color: "bg-red-100 text-red-700" },
};

const STATUS_OPTIONS = [
  { value: "open", label: "Aberto" },
  { value: "in_review", label: "Em análise" },
  { value: "in_progress", label: "Em andamento" },
  { value: "resolved", label: "Resolvido" },
  { value: "wont_fix", label: "Não será feito" },
];

export default function SupportInbox() {
  const qc = useQueryClient();
  const [statusFilter, setStatusFilter] = useState<string>("open");
  const [search, setSearch] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [reply, setReply] = useState("");

  const { data: tickets = [], isLoading } = useQuery({
    queryKey: ["support-tickets", statusFilter, search],
    queryFn: async () => {
      let q = supabase
        .from("support_tickets")
        .select("*")
        .order("created_at", { ascending: false })
        .limit(200);
      if (statusFilter !== "all") q = q.eq("status", statusFilter);
      if (search.trim()) q = q.or(`title.ilike.%${search}%,description.ilike.%${search}%`);
      const { data, error } = await q;
      if (error) throw error;
      return data ?? [];
    },
  });

  const selected = tickets.find((t) => t.id === selectedId) ?? null;

  const { data: messages = [] } = useQuery({
    queryKey: ["support-ticket-messages", selectedId],
    enabled: !!selectedId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("support_ticket_messages")
        .select("*")
        .eq("ticket_id", selectedId!)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  const updateStatus = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const patch: any = { status };
      if (status === "resolved") {
        const { data: u } = await supabase.auth.getUser();
        patch.resolved_at = new Date().toISOString();
        patch.resolved_by = u.user?.id;
      }
      const { error } = await supabase.from("support_tickets").update(patch).eq("id", id);
      if (error) throw error;
    },
    onSuccess: () => {
      toast.success("Status atualizado");
      qc.invalidateQueries({ queryKey: ["support-tickets"] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const sendReply = useMutation({
    mutationFn: async (body: string) => {
      if (!selectedId) return;
      const { data: u } = await supabase.auth.getUser();
      const { error } = await supabase.from("support_ticket_messages").insert({
        ticket_id: selectedId,
        author_id: u.user!.id,
        author_role: "super_admin",
        is_admin: true,
        body,
      });
      if (error) throw error;
    },
    onSuccess: () => {
      setReply("");
      qc.invalidateQueries({ queryKey: ["support-ticket-messages", selectedId] });
      toast.success("Resposta enviada");
    },
    onError: (e: any) => toast.error(e.message),
  });

  return (
    <div className="p-6 space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inbox de Suporte</h1>
          <p className="text-sm text-muted-foreground">
            Tickets criados pelos usuários via Marina (assistente IA).
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => qc.invalidateQueries({ queryKey: ["support-tickets"] })}
        >
          <RefreshCw className="h-4 w-4 mr-2" /> Atualizar
        </Button>
      </div>

      <div className="flex gap-3">
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-48">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">Todos os status</SelectItem>
            {STATUS_OPTIONS.map((s) => (
              <SelectItem key={s.value} value={s.value}>
                {s.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <Input
          placeholder="Buscar por título ou descrição..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-md"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[380px_1fr] gap-4">
        <Card className="max-h-[calc(100vh-260px)] overflow-hidden">
          <CardHeader className="pb-3">
            <CardTitle className="text-sm">
              {isLoading ? "Carregando..." : `${tickets.length} ticket(s)`}
            </CardTitle>
          </CardHeader>
          <CardContent className="p-0 overflow-y-auto max-h-[calc(100vh-320px)]">
            {tickets.map((t) => {
              const cat = CATEGORY_META[t.category] ?? CATEGORY_META.other;
              const Icon = cat.icon;
              const active = t.id === selectedId;
              return (
                <button
                  key={t.id}
                  onClick={() => setSelectedId(t.id)}
                  className={`w-full text-left p-3 border-b hover:bg-accent transition-colors ${
                    active ? "bg-accent" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-2 mb-1">
                    <span className="text-xs font-mono text-muted-foreground">
                      #{t.ticket_number}
                    </span>
                    <Badge className={cat.color} variant="secondary">
                      <Icon className="h-3 w-3 mr-1" />
                      {cat.label}
                    </Badge>
                  </div>
                  <div className="font-medium text-sm line-clamp-2">{t.title}</div>
                  <div className="flex items-center justify-between mt-1">
                    <span className="text-xs text-muted-foreground truncate">
                      {t.user_name || t.user_email} · {t.user_role}
                    </span>
                    <Badge
                      variant="secondary"
                      className={PRIORITY_META[t.priority]?.color}
                    >
                      {PRIORITY_META[t.priority]?.label}
                    </Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-1">
                    {formatDistanceToNow(new Date(t.created_at), {
                      addSuffix: true,
                      locale: ptBR,
                    })}
                  </div>
                </button>
              );
            })}
            {!isLoading && tickets.length === 0 && (
              <div className="p-6 text-center text-sm text-muted-foreground">
                Nenhum ticket.
              </div>
            )}
          </CardContent>
        </Card>

        {selected ? (
          <Card className="max-h-[calc(100vh-260px)] overflow-hidden flex flex-col">
            <CardHeader>
              <div className="flex items-start justify-between gap-3">
                <div>
                  <CardTitle>
                    #{selected.ticket_number} — {selected.title}
                  </CardTitle>
                  <div className="text-xs text-muted-foreground mt-1">
                    De: {selected.user_name} ({selected.user_email}) · Perfil:{" "}
                    {selected.user_role} ·{" "}
                    {selected.page_url && (
                      <>
                        Página: <code>{selected.page_url}</code>
                      </>
                    )}
                  </div>
                </div>
                <Select
                  value={selected.status}
                  onValueChange={(v) =>
                    updateStatus.mutate({ id: selected.id, status: v })
                  }
                >
                  <SelectTrigger className="w-44">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {STATUS_OPTIONS.map((s) => (
                      <SelectItem key={s.value} value={s.value}>
                        {s.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent className="space-y-4 overflow-y-auto flex-1">
              <div className="p-3 border rounded-md bg-muted/50 whitespace-pre-wrap text-sm">
                {selected.description}
              </div>

              {selected.conversation_excerpt && (
                <details className="text-xs">
                  <summary className="cursor-pointer text-muted-foreground">
                    Conversa com Marina (contexto)
                  </summary>
                  <pre className="mt-2 p-2 bg-muted rounded overflow-auto max-h-48">
                    {JSON.stringify(selected.conversation_excerpt, null, 2)}
                  </pre>
                </details>
              )}

              <div className="space-y-2">
                {messages.map((m) => (
                  <div
                    key={m.id}
                    className={`p-3 rounded-md text-sm ${
                      m.is_admin
                        ? "bg-primary/10 border border-primary/20"
                        : "bg-muted"
                    }`}
                  >
                    <div className="text-xs font-medium mb-1">
                      {m.is_admin ? "Super Admin" : "Usuário"} ·{" "}
                      {formatDistanceToNow(new Date(m.created_at), {
                        addSuffix: true,
                        locale: ptBR,
                      })}
                    </div>
                    <div className="whitespace-pre-wrap">{m.body}</div>
                  </div>
                ))}
              </div>

              <div className="pt-2 border-t space-y-2">
                <Textarea
                  placeholder="Escreva uma resposta ao usuário..."
                  value={reply}
                  onChange={(e) => setReply(e.target.value)}
                  rows={3}
                />
                <div className="flex justify-end">
                  <Button
                    onClick={() => sendReply.mutate(reply)}
                    disabled={!reply.trim() || sendReply.isPending}
                  >
                    Responder
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ) : (
          <Card className="flex items-center justify-center min-h-[400px]">
            <p className="text-muted-foreground text-sm">
              Selecione um ticket para visualizar
            </p>
          </Card>
        )}
      </div>
    </div>
  );
}
