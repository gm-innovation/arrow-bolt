import { useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Menu, Sparkles } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { useIsMobile } from "@/hooks/use-mobile";
import { useAuth } from "@/contexts/AuthContext";
import defaultAvatar from "@/assets/ai-agent-avatar.png.asset.json";
import {
  useDeleteThread,
  useMarinaAccess,
  useMarinaMessages,
  useMarinaStream,
  useMarinaThreads,
  useRenameThread,
  useToggleThreadPin,
} from "@/hooks/useMarina";
import { MarinaThreadList } from "@/components/marina/MarinaThreadList";
import { MarinaMessageList } from "@/components/marina/MarinaMessageList";
import { MarinaComposer } from "@/components/marina/MarinaComposer";
import { MarinaSkillsPanel } from "@/components/marina/MarinaSkillsPanel";
import { MarinaConnectionsPanel } from "@/components/marina/MarinaConnectionsPanel";
import { MarinaRunsPanel } from "@/components/marina/MarinaRunsPanel";
import { DesignWorkspace } from "@/components/marina/design/DesignWorkspace";

/** Papéis com acesso ao palco de design (Canva). */
const DESIGN_ROLES = ["marketing", "commercial", "director", "super_admin"];


const SUGGESTIONS: Record<string, string[]> = {
  coordinator: ["Quais OSs estão em atraso hoje?", "Quem está disponível amanhã?", "Resumo da agenda desta semana"],
  director: ["Como está o faturamento deste mês?", "Quais aprovações estão pendentes?", "Riscos operacionais da semana"],
  marketing: ["Pesquise tendências do setor naval esta semana", "Monte um roteiro de campanha para clientes inativos"],
  commercial: ["Quais oportunidades estão paradas?", "Pesquise o site deste cliente e resuma o negócio dele"],
  hr: ["Quem está de férias este mês?", "Documentos obrigatórios vencidos"],
  technician: ["Quais são minhas tarefas de hoje?", "Como preencher o relatório desta OS?"],
};

export default function MarinaChat() {
  const { threadId } = useParams<{ threadId: string }>();
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const { userRole } = useAuth();
  const [agentIdentity, setAgentIdentity] = useState<{ name?: string; avatar_url?: string } | null>(null);

  const { data: access } = useMarinaAccess();
  const { data: threads } = useMarinaThreads();
  const { data: messages } = useMarinaMessages(threadId);
  const rename = useRenameThread();
  const removeThread = useDeleteThread();
  const togglePin = useToggleThreadPin();
  const { send, stop, streaming, status, draft } = useMarinaStream(threadId, (id) => navigate(`/marina/${id}`, { replace: true }));

  useEffect(() => {
    supabase
      .from("ai_agents" as any)
      .select("name, identity")
      .eq("is_default", true)
      .is("company_id", null)
      .maybeSingle()
      .then(({ data }: any) => {
        if (data) setAgentIdentity({ ...(data.identity ?? {}), name: data.name });
      });
  }, []);

  const agentName = agentIdentity?.name || "Marina";
  const avatarUrl = agentIdentity?.avatar_url || defaultAvatar.url;
  const suggestions = useMemo(() => SUGGESTIONS[userRole ?? ""] ?? SUGGESTIONS.coordinator, [userRole]);
  const canDesign = DESIGN_ROLES.includes(userRole ?? "");
  const designProfile = userRole === "commercial" ? "comercial" : "marketing";


  const threadList = (
    <MarinaThreadList
      threads={threads ?? []}
      activeId={threadId}
      onSelect={(id) => navigate(`/marina/${id}`)}
      onNew={() => navigate("/marina")}
      onRename={(id, title) => rename.mutate({ id, title })}
      onDelete={(id) => {
        removeThread.mutate(id);
        if (id === threadId) navigate("/marina");
      }}
      onTogglePin={(id, pinned) => togglePin.mutate({ id, pinned })}
    />
  );

  const emptyState = (
    <div className="mx-auto max-w-xl space-y-6 py-10 text-center">
      <div className="flex flex-col items-center gap-3">
        <img src={avatarUrl} alt={agentName} className="h-20 w-20 rounded-full object-cover ring-2 ring-primary/30" />
        <div>
          <h2 className="text-xl font-semibold">Oi, eu sou a {agentName}</h2>
          <p className="text-sm text-muted-foreground">
            Pergunte sobre o Arrow, peça pesquisa, análise ou ajuda para produzir algo.
          </p>
        </div>
      </div>
      <div className="grid gap-2">
        {suggestions.map((s) => (
          <Button key={s} variant="outline" className="justify-start text-left" onClick={() => send(s)}>
            <Sparkles className="mr-2 h-4 w-4 text-primary" /> {s}
          </Button>
        ))}
      </div>
    </div>
  );

  const chat = (
    <div className="flex h-full min-h-0 flex-col">
      {isMobile && (
        <div className="flex items-center gap-2 border-b border-border p-2">
          <Sheet>
            <SheetTrigger asChild>
              <Button size="icon" variant="ghost" aria-label="Conversas">
                <Menu className="h-4 w-4" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-80 p-0">
              {threadList}
            </SheetContent>
          </Sheet>
          <span className="truncate text-sm font-medium">{agentName}</span>
        </div>
      )}
      <MarinaMessageList
        messages={messages ?? []}
        draft={draft}
        status={status}
        streaming={streaming}
        avatarUrl={avatarUrl}
        agentName={agentName}
        emptyState={emptyState}
      />
      <MarinaComposer onSend={send} onStop={stop} streaming={streaming} threadId={threadId} />
    </div>
  );

  const chatShell = (
    <div className="flex h-[calc(100vh-190px)] min-h-[420px] overflow-hidden rounded-lg border border-border bg-background">
      {!isMobile && <div className="w-72 shrink-0">{threadList}</div>}
      <div className="min-w-0 flex-1">{chat}</div>
    </div>
  );

  return (
    <div className="space-y-4">
      {access?.advanced && (
        <div className="flex items-center gap-2">
          <Badge variant="secondary" className="gap-1">
            <Sparkles className="h-3 w-3" /> Acesso avançado
          </Badge>
          <span className="text-xs text-muted-foreground">Você pode criar conexões externas para a {agentName}.</span>
        </div>
      )}
      <Tabs defaultValue="chat">
        <TabsList>
          <TabsTrigger value="chat">Conversa</TabsTrigger>
          <TabsTrigger value="skills">Habilidades</TabsTrigger>
          {access?.advanced && <TabsTrigger value="connections">Conexões</TabsTrigger>}
          {access?.advanced && <TabsTrigger value="runs">Execuções</TabsTrigger>}
        </TabsList>
        <TabsContent value="chat" className="mt-4">
          {chatShell}
        </TabsContent>
        <TabsContent value="skills" className="mt-4">
          <MarinaSkillsPanel />
        </TabsContent>
        {access?.advanced && (
          <TabsContent value="connections" className="mt-4">
            <MarinaConnectionsPanel />
          </TabsContent>
        )}
        {access?.advanced && (
          <TabsContent value="runs" className="mt-4">
            <MarinaRunsPanel />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
