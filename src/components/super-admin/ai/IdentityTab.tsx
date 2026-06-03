import { AIAgent } from "@/hooks/useAIAgents";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";

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
            onChange={(e) => setDraft({ ...draft, name: e.target.value })}
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
        <Input
          value={identity.avatar_url ?? ""}
          onChange={(e) => update({ avatar_url: e.target.value })}
          placeholder="https://..."
        />
      </div>
    </div>
  );
}
