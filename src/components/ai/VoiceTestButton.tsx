import { Button } from '@/components/ui/button';
import { Loader2, Square, Volume2 } from 'lucide-react';
import { useSpeechPlayback } from '@/hooks/useSpeechPlayback';

const DEFAULT_SAMPLE =
  'Oi, eu sou a Marina. A OS 1036 foi concluída ontem e o relatório já está assinado. Quer que eu envie o resumo pra você?';

interface VoiceTestButtonProps {
  voice?: string;
  speed?: number;
  instructions?: string;
  sampleText?: string;
  label?: string;
  className?: string;
}

/** Botão para ouvir uma frase de exemplo com a voz/velocidade/entonação em edição. */
export function VoiceTestButton({
  voice,
  speed,
  instructions,
  sampleText,
  label = 'Testar voz',
  className,
}: VoiceTestButtonProps) {
  const { isSpeaking, speakingId, speak, stop } = useSpeechPlayback();
  const active = isSpeaking && speakingId === 'voice-test';

  const handleClick = () => {
    if (active) {
      stop();
      return;
    }
    speak(sampleText?.trim() || DEFAULT_SAMPLE, 'voice-test', {
      ...(voice ? { voice } : {}),
      ...(typeof speed === 'number' && Number.isFinite(speed) ? { speed } : {}),
      ...(instructions?.trim() ? { instructions: instructions.trim() } : {}),
    });
  };

  return (
    <Button type="button" variant="outline" onClick={handleClick} className={className}>
      {active ? (
        <>
          <Square className="h-4 w-4 mr-2" />
          Parar
        </>
      ) : isSpeaking ? (
        <>
          <Loader2 className="h-4 w-4 mr-2 animate-spin" />
          {label}
        </>
      ) : (
        <>
          <Volume2 className="h-4 w-4 mr-2" />
          {label}
        </>
      )}
    </Button>
  );
}
