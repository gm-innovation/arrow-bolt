import { useEffect, useMemo, useState } from "react";
import { AIAgent } from "@/hooks/useAIAgents";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Switch } from "@/components/ui/switch";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Loader2, AlertCircle } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

interface Props {
  agent: AIAgent;
  draft: Partial<AIAgent>;
  setDraft: (d: Partial<AIAgent>) => void;
}

type LLMModel = {
  id: string;
  name: string;
  context?: number;
  input_price?: number;
  output_price?: number;
};

const IMAGE_MODELS = [
  "google/gemini-2.5-pro",
  "google/gemini-2.5-flash-image",
  "google/gemini-3-pro-image-preview",
  "google/gemini-3.1-flash-image-preview",
  "openai/gpt-image-2",
  "openai/gpt-image-1-mini",
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

  const provider = tm.provider ?? "lovable";

  const [models, setModels] = useState<LLMModel[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    supabase.functions
      .invoke("list-llm-models", { body: null, method: "GET" as any })
      // edge function uses query param via GET; supabase-js doesn't expose GET easily,
      // use raw URL fetch fallback
      .catch(() => null);

    const url = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/list-llm-models?provider=${provider}`;
    fetch(url, {
      headers: { apikey: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "" },
    })
      .then((r) => r.json())
      .then((d) => {
        if (cancelled) return;
        setModels(d.models ?? []);
        if (d.error) setError(d.error);
      })
      .catch((e) => !cancelled && setError(e.message))
      .finally(() => !cancelled && setLoading(false));

    return () => {
      cancelled = true;
    };
  }, [provider]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return models;
    return models.filter((m) => m.id.toLowerCase().includes(q) || m.name?.toLowerCase().includes(q));
  }, [models, search]);

  const tools = tm.enabled_tools ?? [];
  const toggleTool = (key: string, on: boolean) =>
    update({ enabled_tools: on ? [...tools, key] : tools.filter((t) => t !== key) });

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label>Provedor de LLM</Label>
          <Select
            value={provider}
            onValueChange={(v) => update({ provider: v as any, model: "" })}
          >
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              <SelectItem value="lovable">Lovable AI Gateway (sem chave)</SelectItem>
              <SelectItem value="openrouter">OpenRouter (requer OPENROUTER_API_KEY)</SelectItem>
            </SelectContent>
          </Select>
          {provider === "openrouter" && (
            <p className="text-xs text-muted-foreground mt-1">
              Configure o secret <code>OPENROUTER_API_KEY</code> no backend.
            </p>
          )}
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
        <div className="flex items-center justify-between mb-1">
          <Label>Modelo principal {loading && <Loader2 className="inline h-3 w-3 animate-spin" />}</Label>
          {provider === "openrouter" && (
            <span className="text-xs text-muted-foreground">{models.length} modelos disponíveis</span>
          )}
        </div>
        {provider === "openrouter" && (
          <Input
            placeholder="Buscar modelo (ex: claude, llama, qwen)..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="mb-2"
          />
        )}
        <Select value={tm.model ?? ""} onValueChange={(v) => update({ model: v })}>
          <SelectTrigger>
            <SelectValue placeholder={loading ? "Carregando..." : "Selecione um modelo"} />
          </SelectTrigger>
          <SelectContent className="max-h-80">
            {filtered.slice(0, 200).map((m) => (
              <SelectItem key={m.id} value={m.id}>
                <div className="flex flex-col">
                  <span>{m.name}</span>
                  {(m.input_price || m.output_price) ? (
                    <span className="text-xs text-muted-foreground">
                      ${(m.input_price * 1e6).toFixed(2)}/Mtok in · ${(m.output_price * 1e6).toFixed(2)}/Mtok out
                      {m.context ? ` · ${(m.context / 1000).toFixed(0)}k ctx` : ""}
                    </span>
                  ) : m.context ? (
                    <span className="text-xs text-muted-foreground">{(m.context / 1000).toFixed(0)}k ctx</span>
                  ) : null}
                </div>
              </SelectItem>
            ))}
            {filtered.length === 0 && !loading && (
              <div className="p-2 text-sm text-muted-foreground text-center">Nenhum modelo encontrado</div>
            )}
          </SelectContent>
        </Select>
        {error && (
          <p className="text-xs text-destructive mt-1 flex items-center gap-1">
            <AlertCircle className="h-3 w-3" /> {error}
          </p>
        )}
        {tm.model && <Badge variant="outline" className="mt-2">{tm.model}</Badge>}
      </div>

      {provider === "openrouter" && (
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label>Estratégia de roteamento</Label>
            <Select
              value={tm.openrouter_route ?? ""}
              onValueChange={(v) => update({ openrouter_route: (v || undefined) as any })}
            >
              <SelectTrigger><SelectValue placeholder="Padrão" /></SelectTrigger>
              <SelectContent>
                <SelectItem value="price">Menor custo</SelectItem>
                <SelectItem value="throughput">Maior throughput</SelectItem>
                <SelectItem value="latency">Menor latência</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div>
            <Label>Provedores permitidos (CSV)</Label>
            <Input
              placeholder="ex: anthropic, openai, together"
              value={(tm.openrouter_providers ?? []).join(", ")}
              onChange={(e) =>
                update({
                  openrouter_providers: e.target.value
                    .split(",")
                    .map((s) => s.trim())
                    .filter(Boolean),
                })
              }
            />
          </div>
        </div>
      )}

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
