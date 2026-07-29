import { Mic, Square, X, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface VoiceRecordButtonProps {
  isRecording: boolean;
  isTranscribing: boolean;
  duration: number;
  disabled?: boolean;
  onStart: () => void;
  onStop: () => void;
  onCancel: () => void;
}

function formatDuration(seconds: number) {
  const m = Math.floor(seconds / 60).toString().padStart(2, '0');
  const s = (seconds % 60).toString().padStart(2, '0');
  return `${m}:${s}`;
}

export function VoiceRecordButton({
  isRecording,
  isTranscribing,
  duration,
  disabled,
  onStart,
  onStop,
  onCancel,
}: VoiceRecordButtonProps) {
  if (isTranscribing) {
    return (
      <Button
        type="button"
        variant="outline"
        size="icon"
        className="h-auto w-10 self-stretch shrink-0"
        disabled
        aria-label="Transcrevendo áudio"
      >
        <Loader2 className="h-4 w-4 animate-spin" />
      </Button>
    );
  }

  if (isRecording) {
    return (
      <div className="flex items-center gap-1 shrink-0 self-stretch">
        <Button
          type="button"
          size="icon"
          variant="destructive"
          className="h-auto w-10 self-stretch animate-pulse"
          onClick={onStop}
          aria-label="Parar gravação e transcrever"
          title="Parar e transcrever"
        >
          <Square className="h-3.5 w-3.5 fill-current" />
        </Button>
        <span className="text-xs font-mono tabular-nums text-destructive w-10 text-center">
          {formatDuration(duration)}
        </span>
        <Button
          type="button"
          size="icon"
          variant="ghost"
          className="h-8 w-8"
          onClick={onCancel}
          aria-label="Cancelar gravação"
          title="Cancelar"
        >
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
    );
  }

  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn('h-auto w-10 self-stretch shrink-0')}
      onClick={onStart}
      disabled={disabled}
      aria-label="Gravar mensagem de voz"
      title="Gravar mensagem de voz"
    >
      <Mic className="h-4 w-4" />
    </Button>
  );
}
