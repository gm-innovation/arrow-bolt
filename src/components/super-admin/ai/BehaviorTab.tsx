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

const ROLES = ["technician", "coordinator", "manager", "director", "hr", "commercial", "financeiro", "qualidade", "compras"];
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

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
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
