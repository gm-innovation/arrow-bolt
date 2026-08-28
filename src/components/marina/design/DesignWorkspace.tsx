import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Menu, MessageSquare, Palette } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "@/hooks/use-toast";
import { useMarinaMessages, useMarinaStream } from "@/hooks/useMarina";
import {
  useApproveDesign,
  useMarinaDesigns,
  useSetDesignStatus,
  type MarinaDesign,
} from "@/hooks/useMarinaDesigns";
import { readDesignSignal } from "@/lib/marina/designSignal";
import { MarinaMessageList } from "@/components/marina/MarinaMessageList";
import { MarinaComposer } from "@/components/marina/MarinaComposer";
import { DesignQuickActions } from "./DesignQuickActions";
import { DesignStage } from "./DesignStage";
import { ApprovedDesignsPanel } from "./ApprovedDesignsPanel";

interface Props {
  threadId?: string;
  threadList: React.ReactNode;
  avatarUrl?: string;
  agentName: string;
  profile: string;
}

export function DesignWorkspace({ threadId, threadList, avatarUrl, agentName, profile }: Props) {
  const navigate = useNavigate();
  const isMobile = useIsMobile();
  const [view, setView] = useState<"atual" | "aprovados">("atual");
  const [mobilePane, setMobilePane] = useState<"conversa" | "preview">("conversa");
  const [activeId, setActiveId] = useState<string | null>(null);

  const { data: messages } = useMarinaMessages(threadId);
  const { data: designs } = useMarinaDesigns();
  const approve = useApproveDesign();
  const setStatus = useSetDesignStatus();

  const { send, stop, streaming, status, draft, retry, retryLast } = useMarinaStream(
    threadId,
    (id) => navigate(`/marina/${id}`, { replace: true }),
    (design) => {
      setActiveId(design.id);
      setView("atual");
      if (isMobile) setMobilePane("preview");
    },
  );

  const ask = (message: string, extra?: { references?: string[] }) =>
    send(message, { profile, design: true, references: extra?.references });

  /** Designs desta conversa, mais novos primeiro. */
  const threadDesigns = useMemo(() => {
    const list = designs ?? [];
    if (!threadId) return list.filter((d) => d.status !== "descartado");
    const fromThread = list.filter((d) => d.conversation_id === threadId && d.status !== "descartado");
    if (fromThread.length) return fromThread;
    // Sem peça nesta conversa: mostra a mais recente ainda pendente, para o
    // palco nunca ficar vazio depois de um pedido.
    return list.filter((d) => d.status === "pendente").slice(0, 1);
  }, [designs, threadId]);

  const approved = useMemo(() => (designs ?? []).filter((d) => d.status === "aprovado"), [designs]);

  const active = useMemo(
    () => threadDesigns.find((d) => d.id === activeId) ?? approved.find((d) => d.id === activeId) ?? threadDesigns[0] ?? null,
    [threadDesigns, approved, activeId],
  );

  // Sinal ainda em stream: mostra o preview antes de o registro chegar.
  const streamingSignal = readDesignSignal(draft);

  useEffect(() => {
    if (!activeId && threadDesigns[0]) setActiveId(threadDesigns[0].id);
  }, [threadDesigns, activeId]);

  const stageDesign: MarinaDesign | null =
    active ??
    (streamingSignal
      ? {
          id: "streaming",
          canva_url: streamingSignal.url,
          status: "pendente",
          profile,
          title: "Design em preparação",
          created_at: new Date().toISOString(),
        }
      : null);

  const handleApprove = async (format: "png" | "jpg" | "pdf") => {
    if (!stageDesign || stageDesign.id === "streaming") return;
    try {
      const result = await approve.mutateAsync({ id: stageDesign.id, format });
      toast({
        title: "Design aprovado",
        description: result.warning ?? "Arquivo exportado e guardado no Arrow.",
      });
    } catch (e) {
      toast({ title: "Não deu para aprovar", description: (e as Error).message, variant: "destructive" });
    }
  };

  const handleAdjust = async (note: string) => {
    if (!stageDesign) return;
    if (stageDesign.id !== "streaming") {
      await setStatus.mutateAsync({ id: stageDesign.id, status: "ajuste_solicitado", note }).catch(() => undefined);
    }
    ask(`Ajuste o design ${stageDesign.canva_url}: ${note}. Ao terminar, devolva o link do design atualizado.`);
    if (isMobile) setMobilePane("conversa");
  };

  const handleDiscard = async () => {
    if (!stageDesign || stageDesign.id === "streaming") return;
    await setStatus.mutateAsync({ id: stageDesign.id, status: "descartado" }).catch(() => undefined);
    setActiveId(null);
    toast({ title: "Design descartado" });
  };

  const conversa = (
    <div className="flex h-full min-h-0 flex-col border-r border-border">
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
          <span className="truncate text-sm font-medium">{agentName} · Design</span>
        </div>
      )}
      <MarinaMessageList
        messages={messages ?? []}
        draft={draft}
        status={status}
        streaming={streaming}
        avatarUrl={avatarUrl}
        agentName={agentName}
        emptyState={
          <div className="mx-auto max-w-sm space-y-3 py-8 text-center">
            <div className="mx-auto w-fit rounded-full bg-primary/10 p-3">
              <Palette className="h-5 w-5 text-primary" />
            </div>
            <h3 className="font-semibold">Peça uma peça para a {agentName}</h3>
            <p className="text-sm text-muted-foreground">
              Use as ações rápidas abaixo ou descreva o que você precisa. A prévia do Canva aparece ao lado para você aprovar.
            </p>
          </div>
        }
      />
      {retry && !streaming && (
        <div className="mx-3 mb-2 flex items-center justify-between gap-3 rounded-lg border border-border bg-muted/40 px-3 py-2 text-sm">
          <span className="text-muted-foreground">
            {retry.reason === "engine_busy"
              ? "Não abriu espaço para essa tarefa agora."
              : "Esse pedido não foi concluído."}
          </span>
          <Button size="sm" variant="outline" onClick={retryLast}>
            Tentar de novo
          </Button>
        </div>
      )}
      <DesignQuickActions onSend={ask} disabled={streaming} />
      <MarinaComposer
        onSend={ask}
        onStop={stop}
        streaming={streaming}
        threadId={threadId}
        placeholder="Descreva a peça, o ajuste ou o que exportar…"
      />
    </div>
  );

  const palco = (
    <div className="flex h-full min-h-0 flex-col">
      <div className="flex items-center gap-2 border-b border-border p-2">
        <Tabs value={view} onValueChange={(v) => setView(v as typeof view)}>
          <TabsList>
            <TabsTrigger value="atual">Atual</TabsTrigger>
            <TabsTrigger value="aprovados">Aprovados{approved.length ? ` (${approved.length})` : ""}</TabsTrigger>
          </TabsList>
        </Tabs>
        {isMobile && (
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setMobilePane("conversa")}>
            <MessageSquare className="mr-2 h-4 w-4" /> Conversa
          </Button>
        )}
      </div>
      <div className="min-h-0 flex-1">
        {view === "atual" ? (
          <DesignStage
            design={stageDesign}
            versions={threadDesigns}
            onSelect={(d) => setActiveId(d.id)}
            onApprove={handleApprove}
            onAdjust={handleAdjust}
            onDiscard={handleDiscard}
            working={streaming}
            approving={approve.isPending}
          />
        ) : (
          <ApprovedDesignsPanel
            designs={approved}
            onOpen={(d) => {
              setActiveId(d.id);
              setView("atual");
            }}
          />
        )}
      </div>
    </div>
  );

  if (isMobile) {
    return (
      <div className="h-[calc(100vh-190px)] min-h-[420px] overflow-hidden rounded-lg border border-border bg-background">
        {mobilePane === "conversa" ? (
          <div className="flex h-full flex-col">
            <div className="min-h-0 flex-1">{conversa}</div>
            <Button variant="outline" className="m-2" onClick={() => setMobilePane("preview")}>
              <Palette className="mr-2 h-4 w-4" /> Ver preview
            </Button>
          </div>
        ) : (
          palco
        )}
      </div>
    );
  }

  return (
    <div className="flex h-[calc(100vh-190px)] min-h-[480px] overflow-hidden rounded-lg border border-border bg-background">
      <div className="w-[380px] shrink-0">{conversa}</div>
      <div className="min-w-0 flex-1">{palco}</div>
    </div>
  );
}
