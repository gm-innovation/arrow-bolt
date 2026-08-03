import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { VoiceTestButton } from "@/components/ai/VoiceTestButton";
import { useState, useEffect } from "react";
import {
  useAIUserPreferences,
  useUpdateAIUserPreferences,
  VERBOSITY_LABELS,
  TONE_LABELS,
  PROACTIVITY_LABELS,
  DEFAULT_AI_PREFERENCES,
  type AIVerbosity,
  type AITone,
  type AIProactivity,
  AI_USER_VOICE_LABELS,
  type AIUserVoice,
} from "@/hooks/useAIUserPreferences";

export function AIPreferencesCard() {
  const { data, isLoading } = useAIUserPreferences();
  const update = useUpdateAIUserPreferences();

  const [preferredName, setPreferredName] = useState("");
  const [verbosity, setVerbosity] = useState<AIVerbosity>("concise");
  const [tone, setTone] = useState<AITone>("neutral");
  const [proactivity, setProactivity] = useState<AIProactivity>("medium");
  const [useName, setUseName] = useState(true);
  const [voice, setVoice] = useState<AIUserVoice | "default">("default");
  const [voiceSpeed, setVoiceSpeed] = useState<string>("");

  useEffect(() => {
    if (!data) return;
    setPreferredName(data.preferred_name ?? "");
    setVerbosity(data.verbosity);
    setTone(data.tone);
    setProactivity(data.proactivity);
    setUseName(data.use_name);
    setVoice((data.voice ?? "default") as AIUserVoice | "default");
    setVoiceSpeed(data.voice_speed != null ? String(data.voice_speed) : "");
  }, [data]);

  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Assistente de IA</CardTitle>
        </CardHeader>
        <CardContent>
          <Skeleton className="h-32 w-full" />
        </CardContent>
      </Card>
    );
  }

  const notes = data?.learned_notes ?? [];

  return (
    <Card>
      <CardHeader>
        <CardTitle>Assistente de IA</CardTitle>
        <CardDescription>
          Defina como o assistente deve falar com você. As preferências valem em qualquer sessão ou dispositivo.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label htmlFor="ai-preferred-name">Como quer ser chamado</Label>
            <Input
              id="ai-preferred-name"
              value={preferredName}
              onChange={(e) => setPreferredName(e.target.value)}
              placeholder="Ex.: Rai"
            />
          </div>
          <div className="space-y-2">
            <Label>Tamanho das respostas</Label>
            <Select value={verbosity} onValueChange={(v) => setVerbosity(v as AIVerbosity)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(VERBOSITY_LABELS).map(([k, label]) => (
                  <SelectItem key={k} value={k}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Tom de voz</Label>
            <Select value={tone} onValueChange={(v) => setTone(v as AITone)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(TONE_LABELS).map(([k, label]) => (
                  <SelectItem key={k} value={k}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Proatividade (sugestões)</Label>
            <Select value={proactivity} onValueChange={(v) => setProactivity(v as AIProactivity)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                {Object.entries(PROACTIVITY_LABELS).map(([k, label]) => (
                  <SelectItem key={k} value={k}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div className="space-y-2">
            <Label>Voz da leitura em voz alta</Label>
            <Select value={voice} onValueChange={(v) => setVoice(v as AIUserVoice | "default")}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="default">Padrão do assistente</SelectItem>
                {(Object.entries(AI_USER_VOICE_LABELS) as [AIUserVoice, string][]).map(([k, label]) => (
                  <SelectItem key={k} value={k}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label htmlFor="ai-voice-speed">Velocidade da fala</Label>
            <Input
              id="ai-voice-speed"
              type="number"
              step="0.01"
              min="0.5"
              max="2"
              value={voiceSpeed}
              onChange={(e) => setVoiceSpeed(e.target.value)}
              placeholder="Padrão (1.03x)"
            />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <VoiceTestButton
            {...(voice !== "default" ? { voice } : {})}
            {...(voiceSpeed.trim() && Number.isFinite(Number(voiceSpeed)) ? { speed: Number(voiceSpeed) } : {})}
          />
          <p className="text-xs text-muted-foreground">
            Ouça uma frase de exemplo com a voz escolhida antes de salvar.
          </p>
        </div>

        <div className="flex items-center justify-between rounded-md border p-3">
          <div>
            <p className="text-sm font-medium">Usar meu nome nas conversas</p>
            <p className="text-xs text-muted-foreground">O assistente cumprimenta você pelo nome.</p>
          </div>
          <Switch checked={useName} onCheckedChange={setUseName} />
        </div>

        {notes.length > 0 && (
          <div className="space-y-2">
            <Label className="text-xs text-muted-foreground">Preferências aprendidas nas conversas</Label>
            <div className="flex flex-wrap gap-2">
              {notes.map((n, i) => (
                <Badge key={i} variant="secondary">{n.note}</Badge>
              ))}
            </div>
          </div>
        )}

        <div className="flex gap-2">
          <Button
            onClick={() =>
              update.mutate({
                preferred_name: preferredName.trim() || null,
                verbosity,
                tone,
                proactivity,
                use_name: useName,
                voice: voice === "default" ? null : voice,
                voice_speed: voiceSpeed.trim() ? Number(voiceSpeed) : null,
              })
            }
            disabled={update.isPending}
          >
            Salvar preferências
          </Button>
          <Button
            variant="outline"
            onClick={() => update.mutate({ ...DEFAULT_AI_PREFERENCES })}
            disabled={update.isPending}
          >
            Restaurar padrão
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
