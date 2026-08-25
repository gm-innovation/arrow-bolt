import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import {
  AIAgent,
  AIVoiceEngine,
  AI_VOICE_ENGINE_DEFAULTS,
  AI_VOICE_ENGINE_LABELS,
  AI_VOICE_OPTIONS_BY_ENGINE,
  DEFAULT_VOICE_INSTRUCTIONS,
  useUpdateAIAgent,
} from "@/hooks/useAIAgents";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VoiceTestButton } from "@/components/ai/VoiceTestButton";
import { CheckCircle2, Link2, Sparkles } from "lucide-react";

const DEFAULT_SAMPLE =
  "Oi, aqui é a Marina. A OS 4319 foi faturada ontem e o relatório já está assinado pelo técnico. " +
  "Ainda faltam duas medições do mês passado. Quer que eu já mande o resumo pro grupo?";

const ENGINE_NOTES: Record<AIVoiceEngine, string> = {
  gemini: "Vozes bem naturais em pt-BR. Já incluído nos créditos de IA, sem chave extra.",
  openai: "Motor usado hoje. Aceita instruções de entonação e ajuste de velocidade.",
  elevenlabs: "A voz mais humana do mercado. Exige conta ElevenLabs conectada (custo separado).",
};

const ENGINES: AIVoiceEngine[] = ["gemini", "openai", "elevenlabs"];

interface Props {
  agent: AIAgent;
}

export function VoiceLabTab({ agent }: Props) {
  const update = useUpdateAIAgent();
  const [sample, setSample] = useState(DEFAULT_SAMPLE);
  const [speed, setSpeed] = useState<number>(agent.identity?.voice_speed ?? 1.03);
  const [instructions, setInstructions] = useState(
    agent.identity?.voice_instructions ?? DEFAULT_VOICE_INSTRUCTIONS,
  );
  const [available, setAvailable] = useState<Record<string, boolean>>({
    gemini: true,
    openai: true,
    elevenlabs: false,
  });
  const [voiceByEngine, setVoiceByEngine] = useState<Record<AIVoiceEngine, string>>(() => {
    const current = agent.identity?.voice;
    const currentEngine = agent.identity?.voice_engine;
    const base = { ...AI_VOICE_ENGINE_DEFAULTS } as Record<AIVoiceEngine, string>;
    if (currentEngine && current) base[currentEngine] = current;
    return base;
  });

  const officialEngine: AIVoiceEngine = agent.identity?.voice_engine ?? "openai";
  const officialVoice = agent.identity?.voice ?? AI_VOICE_ENGINE_DEFAULTS[officialEngine];

  useEffect(() => {
    let cancelled = false;
    supabase.functions
      .invoke("ai-text-to-speech", { body: { probe: true } })
      .then(({ data }) => {
        const engines = (data as any)?.engines as { engine: string; available: boolean }[] | undefined;
        if (cancelled || !engines) return;
        setAvailable(Object.fromEntries(engines.map((e) => [e.engine, e.available])));
      })
      .catch(() => { /* mantém o padrão */ });
    return () => { cancelled = true; };
  }, []);

  const setOfficial = (engine: AIVoiceEngine) => {
    if (!available[engine]) {
      toast.error("Conecte o ElevenLabs antes de definir essa voz como oficial.");
      return;
    }
    update.mutate({
      id: agent.id,
      identity: {
        ...agent.identity,
        voice_engine: engine,
        voice: voiceByEngine[engine],
        voice_speed: speed,
        voice_instructions: instructions.trim() || DEFAULT_VOICE_INSTRUCTIONS,
      },
    });
  };

  return (
    <div className="space-y-4 max-w-3xl">
      <Card className="p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Sparkles className="h-4 w-4 text-muted-foreground" />
          <h3 className="font-medium">Laboratório de Voz</h3>
        </div>
        <p className="text-sm text-muted-foreground">
          Ouça a mesma frase em cada motor e defina uma voz oficial. A voz escolhida vale em todos os
          canais: chat web, Marina Live e áudios do WhatsApp.
        </p>
        <div>
          <Label>Frase de teste</Label>
          <Textarea rows={3} value={sample} onChange={(e) => setSample(e.target.value)} />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <Label>Velocidade ({speed.toFixed(2)}x)</Label>
            <Input
              type="number"
              step="0.01"
              min="0.7"
              max="1.4"
              value={speed}
              onChange={(e) => setSpeed(Number(e.target.value) || 1)}
            />
          </div>
          <div className="md:col-span-2">
            <Label>Instruções de entonação</Label>
            <Textarea rows={2} value={instructions} onChange={(e) => setInstructions(e.target.value)} />
          </div>
        </div>
      </Card>

      {ENGINES.map((engine) => {
        const isOfficial = officialEngine === engine && officialVoice === voiceByEngine[engine];
        const enabled = !!available[engine];
        return (
          <Card key={engine} className="p-4 space-y-3">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="font-medium">{AI_VOICE_ENGINE_LABELS[engine]}</span>
                  {isOfficial && (
                    <Badge variant="secondary" className="gap-1">
                      <CheckCircle2 className="h-3 w-3" /> Voz oficial
                    </Badge>
                  )}
                  {!enabled && <Badge variant="outline">Não conectado</Badge>}
                </div>
                <p className="text-xs text-muted-foreground mt-1">{ENGINE_NOTES[engine]}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 items-end">
              <div className="md:col-span-2">
                <Label>Voz</Label>
                <Select
                  value={voiceByEngine[engine]}
                  onValueChange={(v) => setVoiceByEngine((prev) => ({ ...prev, [engine]: v }))}
                  disabled={!enabled}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {AI_VOICE_OPTIONS_BY_ENGINE[engine].map((o) => (
                      <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex gap-2">
                {enabled ? (
                  <VoiceTestButton
                    engine={engine}
                    voice={voiceByEngine[engine]}
                    speed={speed}
                    instructions={instructions}
                    sampleText={sample}
                    label="Ouvir"
                    className="flex-1"
                  />
                ) : (
                  <Button type="button" variant="outline" className="flex-1" disabled>
                    <Link2 className="h-4 w-4 mr-2" /> Conectar
                  </Button>
                )}
              </div>
            </div>

            <div className="flex justify-end">
              <Button
                type="button"
                variant={isOfficial ? "secondary" : "default"}
                size="sm"
                disabled={!enabled || update.isPending}
                onClick={() => setOfficial(engine)}
              >
                {isOfficial ? "Atualizar voz oficial" : "Definir como voz oficial da Marina"}
              </Button>
            </div>
          </Card>
        );
      })}

      {!available.elevenlabs && (
        <p className="text-xs text-muted-foreground">
          Para testar o ElevenLabs, me avise no chat que eu abro a conexão da conta — a chave fica só no
          servidor.
        </p>
      )}
    </div>
  );
}
