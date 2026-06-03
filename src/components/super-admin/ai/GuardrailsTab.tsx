import { AIAgent } from "@/hooks/useAIAgents";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Slider } from "@/components/ui/slider";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { useState } from "react";

interface Props {
  agent: AIAgent;
  draft: Partial<AIAgent>;
  setDraft: (d: Partial<AIAgent>) => void;
}

function TagInput({
  label,
  values,
  onChange,
}: {
  label: string;
  values: string[];
  onChange: (v: string[]) => void;
}) {
  const [input, setInput] = useState("");
  return (
    <div>
      <Label>{label}</Label>
      <div className="flex gap-2 mt-2">
        <Input value={input} onChange={(e) => setInput(e.target.value)} />
        <Button
          type="button"
          onClick={() => {
            if (input.trim()) {
              onChange([...values, input.trim()]);
              setInput("");
            }
          }}
        >
          Adicionar
        </Button>
      </div>
      <div className="flex flex-wrap gap-2 mt-2">
        {values.map((v, i) => (
          <Badge key={i} variant="secondary" className="gap-1">
            {v}
            <X
              className="h-3 w-3 cursor-pointer"
              onClick={() => onChange(values.filter((_, idx) => idx !== i))}
            />
          </Badge>
        ))}
      </div>
    </div>
  );
}

export function GuardrailsTab({ agent, draft, setDraft }: Props) {
  const g = { ...agent.guardrails, ...(draft.guardrails ?? {}) };
  const update = (patch: Partial<typeof g>) =>
    setDraft({ ...draft, guardrails: { ...g, ...patch } });

  return (
    <div className="space-y-6 max-w-2xl">
      <TagInput
        label="Tópicos proibidos"
        values={g.forbidden_topics ?? []}
        onChange={(v) => update({ forbidden_topics: v })}
      />
      <TagInput
        label="Tópicos permitidos exclusivamente (opcional)"
        values={g.allowed_topics ?? []}
        onChange={(v) => update({ allowed_topics: v })}
      />

      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <Label>Filtro PII (CPF, RG, telefone, email)</Label>
          <Switch checked={g.pii_filter ?? true} onCheckedChange={(v) => update({ pii_filter: v })} />
        </div>
        <div className="flex items-center justify-between">
          <Label>Bloquear linguagem ofensiva</Label>
          <Switch
            checked={g.block_offensive ?? true}
            onCheckedChange={(v) => update({ block_offensive: v })}
          />
        </div>
        <div className="flex items-center justify-between">
          <Label>Modo aprovação (humano revisa antes de enviar)</Label>
          <Switch
            checked={g.approval_mode ?? false}
            onCheckedChange={(v) => update({ approval_mode: v })}
          />
        </div>
      </div>

      <div>
        <Label>Mensagem quando bloqueado</Label>
        <Textarea
          value={g.blocked_message ?? ""}
          onChange={(e) => update({ blocked_message: e.target.value })}
          rows={2}
        />
      </div>

      <div>
        <Label>Limite diário por usuário: {g.daily_limit ?? 100} mensagens</Label>
        <Slider
          value={[g.daily_limit ?? 100]}
          min={1}
          max={1000}
          step={10}
          onValueChange={(v) => update({ daily_limit: v[0] })}
          className="mt-2"
        />
      </div>

      <div>
        <Label>Limite de tokens por resposta: {g.max_tokens ?? 2000}</Label>
        <Slider
          value={[g.max_tokens ?? 2000]}
          min={100}
          max={8000}
          step={100}
          onValueChange={(v) => update({ max_tokens: v[0] })}
          className="mt-2"
        />
      </div>

      <div>
        <Label>Disclaimer obrigatório (opcional)</Label>
        <Textarea
          value={g.disclaimer ?? ""}
          onChange={(e) => update({ disclaimer: e.target.value })}
          rows={2}
          placeholder="Esta é uma sugestão da IA, valide com seu coordenador."
        />
      </div>
    </div>
  );
}
