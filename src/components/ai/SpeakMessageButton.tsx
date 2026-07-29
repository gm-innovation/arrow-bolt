import { Volume2, Square } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SpeakMessageButtonProps {
  text: string;
  isSpeaking: boolean;
  onSpeak: () => void;
  onStop: () => void;
}

export function SpeakMessageButton({ text, isSpeaking, onSpeak, onStop }: SpeakMessageButtonProps) {
  if (!text?.trim()) return null;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-6 px-2 text-xs gap-1 text-muted-foreground hover:text-foreground"
      onClick={isSpeaking ? onStop : onSpeak}
      aria-label={isSpeaking ? 'Parar leitura' : 'Ouvir resposta'}
      title={isSpeaking ? 'Parar leitura' : 'Ouvir resposta'}
    >
      {isSpeaking ? (
        <>
          <Square className="h-3 w-3 fill-current" /> Parar
        </>
      ) : (
        <>
          <Volume2 className="h-3 w-3" /> Ouvir
        </>
      )}
    </Button>
  );
}
