import { AIAgent } from "@/hooks/useAIAgents";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";

interface Props {
  agent: AIAgent;
  draft: Partial<AIAgent>;
  setDraft: (d: Partial<AIAgent>) => void;
}

const MODELS = [
  "google/gemini-2.5-pro",
  "google/gemini-2.5-flash",
  "google/gemini-2.5-flash-lite",
  "google/gemini-3-flash-preview",
  "google/gemini-3.5-flash",
  "openai/gpt-5",
  "openai/gpt-5-mini",
  "openai/gpt-5-nano",
  "openai/gpt-5.2",
];

const IMAGE_MODELS = [
  "google/gemini-2.5-pro",
  "google/gemini-2.5-flash-image",
  "google/gemini-3-pro-image-preview",
];

const TOOLS = [
  { key: "search_reports", label: "Busca semântica em relatórios" },
  { key: "availability", label: "Disponibilidade de técnicos" },
  { key: "order_status", label: "Consulta de OS e status" },
  { key: "report_generation", label: "Geração de relatórios" },
  { key: "vision", label: "Análise de imagens (visão)" },
  { key: "proactive_alerts", label: "Alertas proativos" },
  { key: "knowledge_base", label: "Base de conhecimento (RAG)" },
];

export function ToolsModelTab({ agent, draft, setDraft }: Props) {
  const tm = { ...agent.tools_model, ...(draft.tools_model ?? {}) };
  const update = (patch: Partial<typeof tm>) =>
    setDraft({ ...draft, tools_model: { ...tm, ...patch } });

  const tools = tm.enabled_tools ?? [];
  const toggleTool = (key: string, on: boolean) =>
    update({ enabled_tools: on ? [...tools, key] : tools.filter((t) => t !== key) });

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Modelo principal</Label>
          <Select value={tm.model ?? "google/gemini-2.5-flash"} onValueChange={(v) => update({ model: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {MODELS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Modelo para imagens</Label>
          <Select value={tm.image_model ?? "google/gemini-2.5-pro"} onValueChange={(v) => update({ image_model: v })}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {IMAGE_MODELS.map((m) => <SelectItem key={m} value={m}>{m}</SelectItem>)}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label>Temperature: {tm.temperature ?? 0.7}</Label>
        <Slider
          value={[(tm.temperature ?? 0.7) * 100]}
          min={0}
          max={200}
          step={10}
          onValueChange={(v) => update({ temperature: v[0] / 100 })}
          className="mt-2"
        />
      </div>

      <div>
        <Label>Max tokens por resposta: {tm.max_tokens ?? 2000}</Label>
        <Slider
          value={[tm.max_tokens ?? 2000]}
          min={100}
          max={8000}
          step={100}
          onValueChange={(v) => update({ max_tokens: v[0] })}
          className="mt-2"
        />
      </div>

      <div>
        <Label>Tools habilitadas</Label>
        <div className="space-y-2 mt-2">
          {TOOLS.map((t) => (
            <div key={t.key} className="flex items-center justify-between">
              <span className="text-sm">{t.label}</span>
              <Switch checked={tools.includes(t.key)} onCheckedChange={(v) => toggleTool(t.key, v)} />
            </div>
          ))}
        </div>
      </div>

      <div>
        <Label>Conhecimento extra (instruções livres no contexto)</Label>
        <Textarea
          value={tm.rag_context ?? ""}
          onChange={(e) => update({ rag_context: e.target.value })}
          rows={6}
          placeholder="Fatos, glossário, regras de negócio sempre incluídos no contexto..."
        />
      </div>
    </div>
  );
}
