import { AIAgent } from "@/hooks/useAIAgents";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";
import { useState } from "react";

interface Props {
  agent: AIAgent;
  draft: Partial<AIAgent>;
  setDraft: (d: Partial<AIAgent>) => void;
}

const ROLES = ["super_admin", "director", "manager", "coordinator", "technician", "hr", "commercial", "financeiro", "qualidade", "compras", "marketing"];
const FLOWS = [
  { key: "detect_report", label: "Detectar intenção de gerar relatório" },
  { key: "availability", label: "Sugerir técnicos disponíveis" },
  { key: "order_status", label: "Responder com status de OS" },
  { key: "ranking", label: "Ranking de produtividade" },
];

export function BehaviorTab({ agent, draft, setDraft }: Props) {
  const behavior = { ...agent.behavior, ...(draft.behavior ?? {}) };
  const update = (patch: Partial<typeof behavior>) =>
    setDraft({ ...draft, behavior: { ...behavior, ...patch } });

  const [newPrompt, setNewPrompt] = useState("");
  const prompts = behavior.suggested_prompts ?? [];

  const agility = behavior.agility ?? {};
  const updateAgility = (patch: Partial<typeof agility>) =>
    update({ agility: { ...agility, ...patch } });

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="rounded-lg border p-4 space-y-4">
        <div>
          <Label className="text-base">Agilidade e personalização</Label>
          <p className="text-xs text-muted-foreground mt-1">
            Controla o quanto o agente pergunta antes de agir e como ele trata o usuário.
          </p>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label className="text-xs">Nível de agilidade</Label>
            <Select
              value={agility.level ?? "agil"}
              onValueChange={(v) => updateAgility({ level: v as any })}
            >
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="normal">Normal — pode perguntar quando útil</SelectItem>
                <SelectItem value="agil">Ágil — no máximo 1 rodada de perguntas</SelectItem>
                <SelectItem value="ultra">Ultra — nunca pergunta, assume e informa</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label className="text-xs">Proatividade padrão</Label>
            <Select
              value={agility.default_proactivity ?? "medium"}
              onValueChange={(v) => updateAgility({ default_proactivity: v as any })}
            >
              <SelectTrigger className="mt-1"><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="low">Baixa</SelectItem>
                <SelectItem value="medium">Média</SelectItem>
                <SelectItem value="high">Alta</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="flex items-center justify-between">
          <span className="text-sm">Chamar o usuário pelo nome</span>
          <Switch
            checked={agility.use_name ?? true}
            onCheckedChange={(v) => updateAgility({ use_name: v })}
          />
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm">Aprender preferências de estilo do usuário</span>
          <Switch
            checked={agility.allow_learning !== false}
            onCheckedChange={(v) => updateAgility({ allow_learning: v })}
          />
        </div>
        <p className="text-xs text-muted-foreground">
          Cada usuário pode ajustar o próprio estilo em Configurações → Assistente; essas preferências
          têm prioridade sobre os padrões acima.
        </p>
      </div>


        <Label>Prompts sugeridos iniciais</Label>
        <div className="flex gap-2 mt-2">
          <Input
            placeholder="Digite e clique em adicionar"
            value={newPrompt}
            onChange={(e) => setNewPrompt(e.target.value)}
          />
          <Button
            type="button"
            onClick={() => {
              if (newPrompt.trim()) {
                update({ suggested_prompts: [...prompts, newPrompt.trim()] });
                setNewPrompt("");
              }
            }}
          >
            Adicionar
          </Button>
        </div>
        <div className="flex flex-wrap gap-2 mt-2">
          {prompts.map((p, i) => (
            <Badge key={i} variant="secondary" className="gap-1">
              {p}
              <X
                className="h-3 w-3 cursor-pointer"
                onClick={() => update({ suggested_prompts: prompts.filter((_, idx) => idx !== i) })}
              />
            </Badge>
          ))}
        </div>
      </div>

      <div>
        <Label>Instruções por role</Label>
        <div className="space-y-2 mt-2">
          {ROLES.map((role) => (
            <div key={role}>
              <Label className="text-xs capitalize text-muted-foreground">{role}</Label>
              <Textarea
                value={behavior.role_instructions?.[role] ?? ""}
                onChange={(e) =>
                  update({
                    role_instructions: { ...(behavior.role_instructions ?? {}), [role]: e.target.value },
                  })
                }
                rows={2}
                placeholder={`Instruções específicas quando o usuário for ${role}...`}
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label>Fluxos automáticos</Label>
        <div className="space-y-2 mt-2">
          {FLOWS.map((f) => (
            <div key={f.key} className="flex items-center justify-between">
              <span className="text-sm">{f.label}</span>
              <Switch
                checked={behavior.auto_flows?.[f.key] ?? false}
                onCheckedChange={(v) =>
                  update({ auto_flows: { ...(behavior.auto_flows ?? {}), [f.key]: v } })
                }
              />
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label>Memória de conversa: {behavior.memory_size ?? 20} mensagens</Label>
        <Slider
          value={[behavior.memory_size ?? 20]}
          min={0}
          max={50}
          step={1}
          onValueChange={(v) => update({ memory_size: v[0] })}
          className="mt-2"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Canal de handoff humano</Label>
          <Input
            value={behavior.handoff_channel ?? ""}
            onChange={(e) => update({ handoff_channel: e.target.value })}
            placeholder="email | whatsapp"
          />
        </div>
        <div>
          <Label>Destinatário</Label>
          <Input
            value={behavior.handoff_target ?? ""}
            onChange={(e) => update({ handoff_target: e.target.value })}
            placeholder="suporte@empresa.com"
          />
        </div>
      </div>
    </div>
  );
}
