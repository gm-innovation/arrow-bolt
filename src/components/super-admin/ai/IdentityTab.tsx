import { AIAgent, AI_VOICE_OPTIONS, DEFAULT_VOICE_INSTRUCTIONS } from "@/hooks/useAIAgents";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { VoiceTestButton } from "@/components/ai/VoiceTestButton";

interface Props {
  agent: AIAgent;
  draft: Partial<AIAgent>;
  setDraft: (d: Partial<AIAgent>) => void;
}

export function IdentityTab({ agent, draft, setDraft }: Props) {
  const identity = { ...agent.identity, ...(draft.identity ?? {}) };
  const update = (patch: Partial<typeof identity>) =>
    setDraft({ ...draft, identity: { ...identity, ...patch } });

  return (
    <div className="space-y-4 max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Nome do agente</Label>
          <Input
            value={draft.name ?? agent.name}
            onChange={(e) =>
              setDraft({
                ...draft,
                name: e.target.value,
                identity: { ...identity, name: e.target.value },
              })
            }
          />
        </div>
        <div>
          <Label>Slug</Label>
          <Input
            value={draft.slug ?? agent.slug}
            onChange={(e) => setDraft({ ...draft, slug: e.target.value })}
          />
        </div>
      </div>

      <div>
        <Label>Descrição</Label>
        <Input
          value={draft.description ?? agent.description ?? ""}
          onChange={(e) => setDraft({ ...draft, description: e.target.value })}
        />
      </div>

      <div className="flex items-center gap-3">
        <Switch
          checked={draft.enabled ?? agent.enabled}
          onCheckedChange={(v) => setDraft({ ...draft, enabled: v })}
        />
        <Label>Agente ativo</Label>
        <Switch
          checked={draft.is_default ?? agent.is_default}
          onCheckedChange={(v) => setDraft({ ...draft, is_default: v })}
        />
        <Label>Definir como padrão</Label>
      </div>

      <div>
        <Label>Tagline</Label>
        <Input
          value={identity.tagline ?? ""}
          onChange={(e) => update({ tagline: e.target.value })}
          placeholder="Assistente inteligente do NavalOS"
        />
      </div>

      <div>
        <Label>Mensagem de boas-vindas</Label>
        <Textarea
          value={identity.welcome_message ?? ""}
          onChange={(e) => update({ welcome_message: e.target.value })}
          rows={2}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Tom de voz</Label>
          <Select value={identity.tone ?? "amigavel"} onValueChange={(v) => update({ tone: v as any })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="formal">Formal</SelectItem>
              <SelectItem value="amigavel">Amigável</SelectItem>
              <SelectItem value="tecnico">Técnico</SelectItem>
              <SelectItem value="descontraido">Descontraído</SelectItem>
              <SelectItem value="neutro">Neutro</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Idioma padrão</Label>
          <Select value={identity.language ?? "pt-BR"} onValueChange={(v) => update({ language: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="pt-BR">Português (BR)</SelectItem>
              <SelectItem value="en">English</SelectItem>
              <SelectItem value="es">Español</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Persona / Biografia</Label>
        <Textarea
          value={identity.persona ?? ""}
          onChange={(e) => update({ persona: e.target.value })}
          rows={6}
          placeholder="Você é Marina, assistente do NavalOS. Especialista em operações navais..."
        />
        <p className="text-xs text-muted-foreground mt-1">
          Este texto é incluído no system prompt do agente.
        </p>
      </div>

      <div>
        <Label>URL do avatar</Label>
        <div className="flex items-center gap-3 mt-1">
          {identity.avatar_url ? (
            <img
              src={identity.avatar_url}
              alt="Avatar do agente"
              className="h-16 w-16 rounded-full object-cover border"
            />
          ) : (
            <div className="h-16 w-16 rounded-full bg-muted border" />
          )}
          <Input
            value={identity.avatar_url ?? ""}
            onChange={(e) => update({ avatar_url: e.target.value })}
            placeholder="https://... ou /__l5e/assets-v1/..."
          />
        </div>
        <p className="text-xs text-muted-foreground mt-1">
          Avatar padrão: Marina, assistente da Arrow (macacão coral).
        </p>
      </div>


      <div className="rounded-lg border p-4 space-y-4">
        <div>
          <h4 className="text-sm font-medium">Voz da assistente</h4>
          <p className="text-xs text-muted-foreground">
            Usada na leitura em voz alta das respostas. Padrão: Coral (feminina, expressiva).
          </p>
        </div>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <Label>Voz</Label>
            <Select
              value={identity.voice ?? "coral"}
              onValueChange={(v) => update({ voice: v as any })}
            >
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                {AI_VOICE_OPTIONS.map((o) => (
                  <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Velocidade da fala ({(identity.voice_speed ?? 1.03).toFixed(2)}x)</Label>
            <Input
              type="number"
              step="0.01"
              min="0.5"
              max="2"
              className="mt-1"
              value={identity.voice_speed ?? 1.03}
              onChange={(e) => update({ voice_speed: Number(e.target.value) || 1.03 })}
            />
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3">
          <VoiceTestButton
            voice={identity.voice ?? "coral"}
            speed={identity.voice_speed ?? 1.03}
            instructions={identity.voice_instructions ?? ""}
            sampleText={`Oi, eu sou a ${identity.name || "Marina"}. A OS 1036 foi concluída ontem e o relatório já está assinado. Quer que eu envie o resumo pra você?`}
          />
          <p className="text-xs text-muted-foreground">
            Ouve uma frase de exemplo com os valores atuais desta tela, mesmo antes de salvar.
          </p>
        </div>

        <div>
          <Label>Instruções de entonação</Label>
          <Textarea
            className="mt-1"
            rows={4}
            value={identity.voice_instructions ?? ""}
            onChange={(e) => update({ voice_instructions: e.target.value })}
            placeholder={DEFAULT_VOICE_INSTRUCTIONS}
          />
          <p className="text-xs text-muted-foreground mt-1">
            Deixe em branco para usar as instruções padrão (voz feminina, ritmo de conversa em pt-BR).
          </p>
        </div>
      </div>

    </div>
  );
}
