import { useState, useEffect, useMemo } from "react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { useAIAgents, useUpdateAIAgent, useCreateAIAgent, useDeleteAIAgent, AIAgent } from "@/hooks/useAIAgents";
import { AgentSelector } from "@/components/super-admin/ai/AgentSelector";
import { IdentityTab } from "@/components/super-admin/ai/IdentityTab";
import { BehaviorTab } from "@/components/super-admin/ai/BehaviorTab";
import { GuardrailsTab } from "@/components/super-admin/ai/GuardrailsTab";
import { ToolsModelTab } from "@/components/super-admin/ai/ToolsModelTab";
import { AppearanceTab } from "@/components/super-admin/ai/AppearanceTab";
import { TrainingTab } from "@/components/super-admin/ai/TrainingTab";
import { IntegrationsTab } from "@/components/super-admin/ai/IntegrationsTab";
import { WriteActionsTab } from "@/components/super-admin/ai/WriteActionsTab";
import { ScopeRoutingTab } from "@/components/super-admin/ai/ScopeRoutingTab";
import { AdvancedUsersTab } from "@/components/super-admin/ai/AdvancedUsersTab";

import { Save, RotateCcw } from "lucide-react";

export default function AIManagement() {
  const { data: agents, isLoading } = useAIAgents(undefined);
  const update = useUpdateAIAgent();
  const create = useCreateAIAgent();
  const remove = useDeleteAIAgent();

  const [selectedId, setSelectedId] = useState<string | undefined>();
  const [draft, setDraft] = useState<Partial<AIAgent>>({});

  useEffect(() => {
    if (!selectedId && agents?.length) {
      setSelectedId(agents.find((a) => a.is_default)?.id ?? agents[0].id);
    }
  }, [agents, selectedId]);

  const selected = useMemo(() => agents?.find((a) => a.id === selectedId), [agents, selectedId]);

  useEffect(() => {
    setDraft({});
  }, [selectedId]);

  const handleSave = () => {
    if (!selected) return;
    update.mutate({ id: selected.id, ...draft });
    setDraft({});
  };

  const handleCreate = () => {
    const name = prompt("Nome do novo agente:");
    if (!name) return;
    const slug = name.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
    create.mutate({
      name,
      slug,
      enabled: true,
      is_default: false,
      company_id: null,
      identity: { name, tone: "amigavel", language: "pt-BR" },
      behavior: { memory_size: 20, auto_flows: {} },
      guardrails: { pii_filter: true, daily_limit: 100, max_tokens: 2000 },
      tools_model: { model: "google/gemini-2.5-flash", temperature: 0.7, max_tokens: 2000, enabled_tools: [] },
      appearance: { position: "bottom-right", size: "medium", shape: "circle", icon: "Bot", animation: "fade", theme: "auto" },
      scope: {},
    });
  };

  if (isLoading) {
    return (
      <div className="p-6 space-y-4">
        <Skeleton className="h-8 w-64" />
        <Skeleton className="h-96 w-full" />
      </div>
    );
  }

  return (
    <div className="p-6 space-y-6">
      <div className="flex items-center justify-between" data-tour="ai-header">
        <div>
          <h1 className="text-2xl font-bold">Agente de IA</h1>
          <p className="text-muted-foreground text-sm">
            Configure identidade, comportamento, treinamento e integrações dos agentes de IA.
          </p>
        </div>
        {Object.keys(draft).length > 0 && (
          <div className="flex gap-2">
            <Button variant="outline" onClick={() => setDraft({})} data-tour="ai-discard-changes">
              <RotateCcw className="h-4 w-4 mr-1" /> Descartar
            </Button>
            <Button onClick={handleSave} disabled={update.isPending} data-tour="ai-save-changes">
              <Save className="h-4 w-4 mr-1" /> Salvar alterações
            </Button>
          </div>
        )}
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-3" data-tour="ai-agent-selector">
          <AgentSelector
            agents={agents ?? []}
            selectedId={selectedId}
            onSelect={setSelectedId}
            onCreate={handleCreate}
            onDelete={(id) => remove.mutate(id)}
          />
        </div>

        <div className="col-span-9">
          {selected ? (
            <Card className="p-4" data-tour="ai-config-panel">
              <Tabs defaultValue="identity">
                <TabsList className="grid grid-cols-10 w-full" data-tour="ai-tabs">
                  <TabsTrigger value="identity" data-tour="ai-tab-identity">Identidade</TabsTrigger>
                  <TabsTrigger value="behavior" data-tour="ai-tab-behavior">Comportamento</TabsTrigger>
                  <TabsTrigger value="guardrails" data-tour="ai-tab-guardrails">Guardrails</TabsTrigger>
                  <TabsTrigger value="scope" data-tour="ai-tab-scope">Escopo</TabsTrigger>
                  <TabsTrigger value="write-actions" data-tour="ai-tab-write-actions">Ações de Escrita</TabsTrigger>
                  <TabsTrigger value="tools" data-tour="ai-tab-tools">Tools & Modelo</TabsTrigger>
                  <TabsTrigger value="appearance" data-tour="ai-tab-appearance">Aparência</TabsTrigger>
                  <TabsTrigger value="training" data-tour="ai-tab-training">Treinamento</TabsTrigger>
                  <TabsTrigger value="integrations" data-tour="ai-tab-integrations">Integrações</TabsTrigger>
                  <TabsTrigger value="advanced" data-tour="ai-tab-advanced">Copiloto</TabsTrigger>
                </TabsList>

                <div className="mt-4">
                  <TabsContent value="identity">
                    <IdentityTab agent={selected} draft={draft} setDraft={setDraft} />
                  </TabsContent>
                  <TabsContent value="behavior">
                    <BehaviorTab agent={selected} draft={draft} setDraft={setDraft} />
                  </TabsContent>
                  <TabsContent value="guardrails">
                    <GuardrailsTab agent={selected} draft={draft} setDraft={setDraft} />
                  </TabsContent>
                  <TabsContent value="scope">
                    <ScopeRoutingTab agent={selected} draft={draft} setDraft={setDraft} />
                  </TabsContent>
                  <TabsContent value="write-actions">
                    <WriteActionsTab agent={selected} draft={draft} setDraft={setDraft} />
                  </TabsContent>
                  <TabsContent value="tools">
                    <ToolsModelTab agent={selected} draft={draft} setDraft={setDraft} />
                  </TabsContent>
                  <TabsContent value="appearance">
                    <AppearanceTab agent={selected} draft={draft} setDraft={setDraft} />
                  </TabsContent>
                  <TabsContent value="training">
                    <TrainingTab agent={selected} />
                  </TabsContent>
                  <TabsContent value="integrations">
                    <IntegrationsTab agent={selected} />
                  </TabsContent>
                  <TabsContent value="advanced">
                    <AdvancedUsersTab />
                  </TabsContent>

                </div>
              </Tabs>
            </Card>
          ) : (
            <Card className="p-8 text-center text-muted-foreground">
              Selecione ou crie um agente.
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}
