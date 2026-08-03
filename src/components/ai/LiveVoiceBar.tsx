import { Loader2, Mic, MicOff, Radio, Volume2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import type { VoiceSessionState } from '@/lib/voice/transport';

const STATE_LABEL: Record<VoiceSessionState, string> = {
  off: 'Modo conversa desligado',
  listening: 'Ouvindo...',
  hearing: 'Estou te ouvindo',
  transcribing: 'Entendendo...',
  thinking: 'Pensando...',
  speaking: 'Falando (pode me interromper)',
};


interface LiveVoiceBarProps {
  isActive: boolean;
  state: VoiceSessionState;
  level: number;
  partial?: string;
  onToggle: () => void;
  disabled?: boolean;
}

/** Barra do modo conversa contínua: estado, nível de voz e transcrição parcial. */
export function LiveVoiceBar({
  isActive,
  state,
  level,
  partial,
  onToggle,
  disabled,
}: LiveVoiceBarProps) {
  const bars = [0.15, 0.35, 0.55, 0.75, 0.9];

  return (
    <div
      className={cn(
        'flex items-center gap-2 rounded-md border px-2 py-1.5 transition-colors',
        isActive ? 'border-primary/40 bg-primary/5' : 'border-transparent',
      )}
      data-tour="marina-live-voice"
    >
      <Button
        type="button"
        variant={isActive ? 'default' : 'ghost'}
        size="sm"
        className="h-7 gap-1 text-xs"
        onClick={onToggle}
        disabled={disabled}
        aria-pressed={isActive}
        title={isActive ? 'Sair do modo conversa' : 'Conversar por voz, sem clicar no microfone'}
      >
        {isActive ? <Radio className="h-3 w-3 animate-pulse" /> : <Mic className="h-3 w-3" />}
        {isActive ? 'Modo conversa' : 'Modo conversa'}
      </Button>

      {isActive && (
        <>
          <div className="flex items-end gap-0.5" aria-hidden>
            {bars.map((b, i) => (
              <span
                key={i}
                className={cn(
                  'w-1 rounded-sm bg-primary/70 transition-all',
                  level >= b ? 'opacity-100' : 'opacity-25',
                )}
                style={{ height: `${6 + i * 3}px` }}
              />
            ))}
          </div>

          <span className="flex items-center gap-1 text-xs text-muted-foreground">
            {state === 'transcribing' || state === 'thinking' ? (
              <Loader2 className="h-3 w-3 animate-spin" />
            ) : state === 'speaking' ? (
              <Volume2 className="h-3 w-3" />
            ) : state === 'hearing' ? (
              <Mic className="h-3 w-3 text-primary" />
            ) : (
              <MicOff className="h-3 w-3" />
            )}
            {STATE_LABEL[state]}
          </span>

          {partial && (
            <span className="truncate text-xs italic text-muted-foreground/80 max-w-[40%]">
              "{partial}"
            </span>
          )}
        </>
      )}
    </div>
  );
}
