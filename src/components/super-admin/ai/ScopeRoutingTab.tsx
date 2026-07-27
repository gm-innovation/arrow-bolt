import { AIAgent, AIAgentOutOfScope, AIAgentOutOfScopeArea, DEFAULT_OUT_OF_SCOPE } from "@/hooks/useAIAgents";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2 } from "lucide-react";

interface Props {
  agent: AIAgent;
  draft: Partial<AIAgent>;
  setDraft: (d: Partial<AIAgent>) => void;
}

const POLICIES: Array<{ value: AIAgentOutOfScope["policy"]; label: string; desc: string }> = [
  { value: "explain_and_offer", label: "Explicar + oferecer encaminhamento", desc: "Explica em alto nível e oferece abrir solicitação para o setor responsável." },
  { value: "explain_only", label: "Apenas explicar", desc: "Explica em alto nível sem oferecer criar solicitação." },
  { value: "refuse", label: "Recusar educadamente", desc: "Informa que está fora do perfil, sem detalhes nem encaminhamento." },
  { value: "off", label: "Desativado", desc: "Marina responde como padrão, sem tratamento especial." },
];

const CHANNELS: Array<{ value: AIAgentOutOfScope["channel"]; label: string }> = [
  { value: "corp_request", label: "Solicitação corporativa" },
  { value: "support_ticket", label: "Chamado (Super Admin)" },
  { value: "both", label: "Perguntar ao usuário" },
];

export function ScopeRoutingTab({ agent, draft, setDraft }: Props) {
  const behavior = { ...agent.behavior, ...(draft.behavior ?? {}) };
  const oos: AIAgentOutOfScope = { ...DEFAULT_OUT_OF_SCOPE, ...(behavior.out_of_scope ?? {}) };
  if (!Array.isArray(oos.area_routing) || oos.area_routing.length === 0) {
    oos.area_routing = DEFAULT_OUT_OF_SCOPE.area_routing;
  }

  const update = (patch: Partial<AIAgentOutOfScope>) => {
    setDraft({
      ...draft,
      behavior: { ...behavior, out_of_scope: { ...oos, ...patch } },
    });
  };

  const updateArea = (idx: number, patch: Partial<AIAgentOutOfScopeArea>) => {
    const next = [...oos.area_routing];
    next[idx] = { ...next[idx], ...patch };
    update({ area_routing: next });
  };

  const addArea = () => {
    update({
      area_routing: [
        ...oos.area_routing,
        { area_key: `area_${Date.now()}`, label: "Nova área", keywords: [], enabled: true, default_priority: "medium" },
      ],
    });
  };

  const removeArea = (idx: number) => {
    update({ area_routing: oos.area_routing.filter((_, i) => i !== idx) });
  };

  const resetDefaults = () => update({ ...DEFAULT_OUT_OF_SCOPE });

  return (
    <div className="space-y-6 max-w-4xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h3 className="text-lg font-semibold">Escopo e encaminhamento</h3>
          <p className="text-sm text-muted-foreground">
            Define o que a Marina faz quando o usuário pergunta algo fora do seu perfil de acesso.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Label htmlFor="oos-enabled" className="text-sm">Ativo</Label>
          <Switch id="oos-enabled" checked={oos.enabled} onCheckedChange={(v) => update({ enabled: v })} />
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Política</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label>Comportamento padrão fora de escopo</Label>
            <Select value={oos.policy} onValueChange={(v) => update({ policy: v as AIAgentOutOfScope["policy"] })}>
              <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
              <SelectContent>
                {POLICIES.map(p => (
                  <SelectItem key={p.value} value={p.value}>
                    <div>
                      <div className="font-medium">{p.label}</div>
                      <div className="text-xs text-muted-foreground">{p.desc}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div>
            <Label>Canal de encaminhamento</Label>
            <Select value={oos.channel} onValueChange={(v) => update({ channel: v as AIAgentOutOfScope["channel"] })}>
              <SelectTrigger className="mt-2"><SelectValue /></SelectTrigger>
              <SelectContent>
                {CHANNELS.map(c => <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Modelos de resposta</CardTitle>
          <p className="text-xs text-muted-foreground">
            Variáveis disponíveis: <code>{"{{area}}"}</code>, <code>{"{{summary}}"}</code>, <code>{"{{ticket_number}}"}</code>
          </p>
        </CardHeader>
        <CardContent className="space-y-3">
          <div>
            <Label>Explicação em alto nível</Label>
            <Textarea rows={2} value={oos.explain_template} onChange={(e) => update({ explain_template: e.target.value })} />
          </div>
          <div>
            <Label>Oferta de encaminhamento</Label>
            <Textarea rows={2} value={oos.offer_template} onChange={(e) => update({ offer_template: e.target.value })} />
          </div>
          <div>
            <Label>Confirmação após criar</Label>
            <Textarea rows={2} value={oos.confirmation_template} onChange={(e) => update({ confirmation_template: e.target.value })} />
          </div>
          <div>
            <Label>Recusa (política "Recusar")</Label>
            <Textarea rows={2} value={oos.refusal_template} onChange={(e) => update({ refusal_template: e.target.value })} />
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle className="text-base">Mapeamento de áreas</CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              Palavras-chave ajudam a Marina a classificar o assunto e escolher o setor destino.
            </p>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" onClick={resetDefaults}>Restaurar padrão</Button>
            <Button size="sm" onClick={addArea}><Plus className="w-4 h-4 mr-1" /> Área</Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          {oos.area_routing.map((area, idx) => (
            <div key={idx} className="border rounded-lg p-3 space-y-3 bg-muted/30">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2 flex-1">
                  <Switch checked={area.enabled} onCheckedChange={(v) => updateArea(idx, { enabled: v })} />
                  <Input
                    className="max-w-[200px]"
                    placeholder="Nome exibido"
                    value={area.label}
                    onChange={(e) => updateArea(idx, { label: e.target.value })}
                  />
                  <Input
                    className="max-w-[160px]"
                    placeholder="chave interna"
                    value={area.area_key}
                    onChange={(e) => updateArea(idx, { area_key: e.target.value })}
                  />
                </div>
                <Button size="icon" variant="ghost" onClick={() => removeArea(idx)}>
                  <Trash2 className="w-4 h-4 text-destructive" />
                </Button>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <Label className="text-xs">Departamento destino (nome)</Label>
                  <Input
                    value={area.department_name ?? ""}
                    placeholder="RH, Financeiro..."
                    onChange={(e) => updateArea(idx, { department_name: e.target.value })}
                  />
                </div>
                <div>
                  <Label className="text-xs">Tipo de solicitação padrão (nome)</Label>
                  <Input
                    value={area.request_type_name ?? ""}
                    placeholder="Deixe em branco para escolher automaticamente"
                    onChange={(e) => updateArea(idx, { request_type_name: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <Label className="text-xs">Palavras-chave (uma por linha ou separadas por vírgula)</Label>
                <Textarea
                  rows={2}
                  value={(area.keywords ?? []).join(", ")}
                  onChange={(e) =>
                    updateArea(idx, {
                      keywords: e.target.value.split(/[,\n]/).map(s => s.trim()).filter(Boolean),
                    })
                  }
                />
              </div>
              <div className="max-w-[200px]">
                <Label className="text-xs">Prioridade padrão</Label>
                <Select
                  value={area.default_priority ?? "medium"}
                  onValueChange={(v) => updateArea(idx, { default_priority: v as AIAgentOutOfScopeArea["default_priority"] })}
                >
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Baixa</SelectItem>
                    <SelectItem value="medium">Média</SelectItem>
                    <SelectItem value="high">Alta</SelectItem>
                    <SelectItem value="critical">Crítica</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  );
}
