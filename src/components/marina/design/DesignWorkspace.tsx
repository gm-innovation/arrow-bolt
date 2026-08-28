import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Menu, MessageSquare, Palette, Sparkles } from "lucide-react";
import { useIsMobile } from "@/hooks/use-mobile";
import { toast } from "@/hooks/use-toast";
import { useMarinaMessages, useMarinaStream } from "@/hooks/useMarina";
import {
  useApproveDesign,
  useAdjustCanvaDesign,
  useMarinaDesigns,
  useRetryCanvaDesign,
  useSetDesignStatus,
  type MarinaDesign,
} from "@/hooks/useMarinaDesigns";
import { readDesignSignal } from "@/lib/marina/designSignal";
import { MarinaMessageList } from "@/components/marina/MarinaMessageList";
import { MarinaComposer } from "@/components/marina/MarinaComposer";
import { DesignQuickActions } from "./DesignQuickActions";
import { DesignStage } from "./DesignStage";
import { ApprovedDesignsPanel } from "./ApprovedDesignsPanel";
import { DesignAssetsPanel } from "./DesignAssetsPanel";

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
  const [view, setView] = useState<"atual" | "aprovados" | "assets">("atual");
  const [assetRefs, setAssetRefs] = useState<{ url: string; name: string }[]>([]);
  const [mobilePane, setMobilePane] = useState<"conversa" | "preview">("conversa");
  const [activeId, setActiveId] = useState<string | null>(null);
  /** Ligado: a próxima mensagem é pedido de peça. Desligado: é conversa. */
  const [gerarPeca, setGerarPeca] = useState(false);

  const { data: messages } = useMarinaMessages(threadId);
  const { data: designs } = useMarinaDesigns();
  const approve = useApproveDesign();
  const adjustCanva = useAdjustCanvaDesign();
  const setStatus = useSetDesignStatus();
  const retryCanva = useRetryCanvaDesign();

  const { send, stop, streaming, status, draft, steps, retry, retryLast } = useMarinaStream(
    threadId,
    (id) => navigate(`/marina/${id}`, { replace: true }),
    (design) => {
      setActiveId(design.id);
      setView("atual");
      if (isMobile) setMobilePane("preview");
    },
  );

  /** Pedido de peça: só pelas ações rápidas ou com "Gerar peça" ligado. */
  const askDesign = (message: string, extra?: { references?: string[] }) => {
    setGerarPeca(false);
    return send(message, { profile, design: true, references: extra?.references });
  };

  /** Conversa sobre o trabalho: nada é gerado, a peça do palco vai como contexto. */
  const askChat = (message: string, extra?: { references?: string[] }) =>
    gerarPeca
      ? askDesign(message, extra)
      : send(message, {
          profile,
          design: false,
          references: extra?.references,
          focusDesignId: activeId && activeId !== "streaming" ? activeId : null,
        });

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

  /** Descartadas desta conversa, para recuperar caso tenha sido engano. */
  const discarded = useMemo(
    () =>
      (designs ?? []).filter(
        (d) => d.status === "descartado" && (!threadId || d.conversation_id === threadId),
      ),
    [designs, threadId],
  );

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
    if (!stageDesign || stageDesign.id === "streaming") return;
    if (!stageDesign.canva_url) {
      toast({ title: "Canva ainda pendente", description: "Crie a versão editável antes de solicitar ajustes.", variant: "destructive" });
      return;
    }
    try {
      await setStatus.mutateAsync({ id: stageDesign.id, status: "ajuste_solicitado", note });
      await adjustCanva.mutateAsync({ id: stageDesign.id, note });
      toast({ title: "Peça ajustada no Canva", description: "O palco já mostra a nova exportação do mesmo arquivo." });
    } catch (e) {
      toast({ title: "Não deu para ajustar", description: (e as Error).message, variant: "destructive" });
    }
  };

  const handleDiscard = async () => {
    if (!stageDesign || stageDesign.id === "streaming") return;
    await setStatus.mutateAsync({ id: stageDesign.id, status: "descartado" }).catch(() => undefined);
    setActiveId(null);
    toast({ title: "Design descartado" });
  };

  const handleDiscardVersion = async (id: string) => {
    await setStatus.mutateAsync({ id, status: "descartado" }).catch(() => undefined);
    if (activeId === id) setActiveId(null);
    toast({ title: "Versão descartada" });
  };

  const handleKeepOnly = async (id: string) => {
    const others = threadDesigns.filter((d) => d.id !== id && d.id !== "streaming");
    for (const d of others) {
      await setStatus.mutateAsync({ id: d.id, status: "descartado" }).catch(() => undefined);
    }
    setActiveId(id);
    toast({ title: `Mantive só esta versão`, description: `${others.length} descartada(s).` });
  };

  const handleRestore = async (id: string) => {
    await setStatus.mutateAsync({ id, status: "pendente" }).catch(() => undefined);
    setActiveId(id);
    toast({ title: "Versão recuperada" });
  };

  const handleRetryCanva = async () => {
    if (!stageDesign || stageDesign.id === "streaming") return;
    try {
      await retryCanva.mutateAsync({ id: stageDesign.id });
      toast({ title: "Preparação iniciada", description: "Você pode continuar usando o Arrow enquanto acompanho as etapas no palco." });
    } catch (e) {
      toast({ title: "Canva ainda pendente", description: (e as Error).message, variant: "destructive" });
    }
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
      <div className="flex items-center gap-2 border-t border-border px-3 py-2">
        <Button
          type="button"
          size="sm"
          variant={gerarPeca ? "default" : "outline"}
          onClick={() => setGerarPeca((v) => !v)}
          aria-pressed={gerarPeca}
        >
          <Sparkles className="mr-2 h-4 w-4" /> Gerar peça
        </Button>
        <span className="text-xs text-muted-foreground">
          {gerarPeca
            ? "A próxima mensagem cria uma peça nova."
            : "Mensagens são conversa sobre o trabalho — ligue para criar uma peça."}
        </span>
      </div>
      <DesignQuickActions
        onSend={askDesign}
        disabled={streaming}
        assetReferences={assetRefs}
        onClearAssetReferences={() => setAssetRefs([])}
      />
      <MarinaComposer
        onSend={askChat}
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
            <TabsTrigger value="assets">Assets</TabsTrigger>
          </TabsList>
        </Tabs>
        {isMobile && (
          <Button size="sm" variant="ghost" className="ml-auto" onClick={() => setMobilePane("conversa")}>
            <MessageSquare className="mr-2 h-4 w-4" /> Conversa
          </Button>
        )}
      </div>
      <div className="min-h-0 flex-1">
        {view === "assets" ? (
          <div className="h-full overflow-auto p-3">
            <DesignAssetsPanel
              onUseAsReference={(assets) => {
                setAssetRefs(
                  assets
                    .filter((a) => a.file_url)
                    .map((a) => ({ url: a.file_url as string, name: a.name }))
                    .slice(0, 4),
                );
                setView("atual");
                if (isMobile) setMobilePane("conversa");
                toast({ title: "Assets marcados como referência do próximo pedido" });
              }}
            />
          </div>
        ) : view === "atual" ? (
          <DesignStage
            design={stageDesign}
            versions={threadDesigns}
            onSelect={(d) => setActiveId(d.id)}
            onApprove={handleApprove}
            onAdjust={handleAdjust}
            onDiscard={handleDiscard}
            onRetryCanva={handleRetryCanva}
            working={streaming || adjustCanva.isPending}
            approving={approve.isPending}
            retryingCanva={retryCanva.isPending}
            statusLabel={adjustCanva.isPending ? "ajustando as camadas no Canva…" : status}
            liveSteps={steps}
            discarded={discarded}
            onDiscardVersion={handleDiscardVersion}
            onKeepOnly={handleKeepOnly}
            onRestore={handleRestore}
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
