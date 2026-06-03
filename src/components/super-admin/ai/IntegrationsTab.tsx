import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { AIAgent } from "@/hooks/useAIAgents";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";

interface Props { agent: AIAgent; }

function useBinding(agentId: string, channel: string) {
  return useQuery({
    queryKey: ["ai-channel-bindings", agentId, channel],
    queryFn: async () => {
      const { data } = await supabase
        .from("ai_channel_bindings" as any)
        .select("*")
        .eq("agent_id", agentId)
        .eq("channel", channel)
        .maybeSingle();
      return data as any;
    },
  });
}

function useSaveBinding(agentId: string, companyId: string | null, channel: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, enabled, config }: { id?: string; enabled: boolean; config: any }) => {
      if (id) {
        const { error } = await supabase
          .from("ai_channel_bindings" as any)
          .update({ enabled, config })
          .eq("id", id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from("ai_channel_bindings" as any)
          .insert({ agent_id: agentId, company_id: companyId, channel, enabled, config });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      toast.success("Integração salva");
      qc.invalidateQueries({ queryKey: ["ai-channel-bindings", agentId, channel] });
    },
    onError: (e: any) => toast.error(e.message),
  });
}

function WhatsAppPanel({ agent }: { agent: AIAgent }) {
  const b = useBinding(agent.id, "whatsapp");
  const save = useSaveBinding(agent.id, agent.company_id, "whatsapp");
  const cfg = b.data?.config ?? {};
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold">WhatsApp</h4>
          <p className="text-xs text-muted-foreground">
            O agente atende mensagens recebidas no WhatsApp Business.
          </p>
        </div>
        <Switch
          checked={b.data?.enabled ?? false}
          onCheckedChange={(v) => save.mutate({ id: b.data?.id, enabled: v, config: cfg })}
        />
      </div>
      <div>
        <Label>Número WhatsApp Business (E.164)</Label>
        <Input
          defaultValue={cfg.phone_number}
          placeholder="+5511999999999"
          onBlur={(e) =>
            save.mutate({ id: b.data?.id, enabled: b.data?.enabled ?? false, config: { ...cfg, phone_number: e.target.value } })
          }
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Usa as credenciais já configuradas em Configurações → WhatsApp.
      </p>
    </Card>
  );
}

function TeamsPanel({ agent }: { agent: AIAgent }) {
  const b = useBinding(agent.id, "teams");
  const save = useSaveBinding(agent.id, agent.company_id, "teams");
  const cfg = b.data?.config ?? {};
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold">Microsoft Teams</h4>
          <p className="text-xs text-muted-foreground">
            O agente responde a menções em canais e DMs do Teams.
          </p>
        </div>
        <Switch
          checked={b.data?.enabled ?? false}
          onCheckedChange={(v) => save.mutate({ id: b.data?.id, enabled: v, config: cfg })}
        />
      </div>
      <div>
        <Label>Team IDs autorizados (um por linha)</Label>
        <Textarea
          defaultValue={(cfg.team_ids ?? []).join("\n")}
          rows={3}
          onBlur={(e) =>
            save.mutate({
              id: b.data?.id,
              enabled: b.data?.enabled ?? false,
              config: { ...cfg, team_ids: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) },
            })
          }
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Requer a conexão <code>microsoft_teams</code> linkada ao projeto.
      </p>
    </Card>
  );
}

function OutlookPanel({ agent }: { agent: AIAgent }) {
  const b = useBinding(agent.id, "outlook");
  const save = useSaveBinding(agent.id, agent.company_id, "outlook");
  const cfg = b.data?.config ?? {};
  return (
    <Card className="p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold">Microsoft Outlook</h4>
          <p className="text-xs text-muted-foreground">
            O agente lê emails não respondidos e cria rascunhos ou envia respostas.
          </p>
        </div>
        <Switch
          checked={b.data?.enabled ?? false}
          onCheckedChange={(v) => save.mutate({ id: b.data?.id, enabled: v, config: cfg })}
        />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <Label>Pasta</Label>
          <Input
            defaultValue={cfg.folder ?? "inbox"}
            onBlur={(e) =>
              save.mutate({ id: b.data?.id, enabled: b.data?.enabled ?? false, config: { ...cfg, folder: e.target.value } })
            }
          />
        </div>
        <div>
          <Label>Modo</Label>
          <Select
            defaultValue={cfg.mode ?? "draft"}
            onValueChange={(v) =>
              save.mutate({ id: b.data?.id, enabled: b.data?.enabled ?? false, config: { ...cfg, mode: v } })
            }
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Apenas rascunho</SelectItem>
              <SelectItem value="auto">Resposta automática</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
      <div>
        <Label>Whitelist de domínios para resposta automática (um por linha)</Label>
        <Textarea
          defaultValue={(cfg.whitelist_domains ?? []).join("\n")}
          rows={3}
          onBlur={(e) =>
            save.mutate({
              id: b.data?.id,
              enabled: b.data?.enabled ?? false,
              config: { ...cfg, whitelist_domains: e.target.value.split("\n").map((s) => s.trim()).filter(Boolean) },
            })
          }
        />
      </div>
      <p className="text-xs text-muted-foreground">
        Requer a conexão <code>microsoft_outlook</code> linkada ao projeto.
      </p>
    </Card>
  );
}

export function IntegrationsTab({ agent }: Props) {
  return (
    <Tabs defaultValue="whatsapp" className="w-full">
      <TabsList>
        <TabsTrigger value="whatsapp">WhatsApp</TabsTrigger>
        <TabsTrigger value="teams">Teams</TabsTrigger>
        <TabsTrigger value="outlook">Outlook</TabsTrigger>
      </TabsList>
      <TabsContent value="whatsapp"><WhatsAppPanel agent={agent} /></TabsContent>
      <TabsContent value="teams"><TeamsPanel agent={agent} /></TabsContent>
      <TabsContent value="outlook"><OutlookPanel agent={agent} /></TabsContent>
    </Tabs>
  );
}
