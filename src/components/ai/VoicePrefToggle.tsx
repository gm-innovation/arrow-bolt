import { Volume2, VolumeX, AudioLines } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { VoicePref } from '@/hooks/useVoicePref';

const LABELS: Record<VoicePref, string> = {
  off: 'Voz desligada',
  auto: 'Voz automática (só em perguntas faladas)',
  on: 'Voz sempre ligada',
};

interface VoicePrefToggleProps {
  pref: VoicePref;
  onCycle: () => void;
}

export function VoicePrefToggle({ pref, onCycle }: VoicePrefToggleProps) {
  const Icon = pref === 'off' ? VolumeX : pref === 'auto' ? AudioLines : Volume2;

  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      className="h-7 text-xs gap-1"
      onClick={onCycle}
      title={LABELS[pref]}
      aria-label={LABELS[pref]}
    >
      <Icon className="h-3 w-3" />
      {pref === 'off' ? 'Voz off' : pref === 'auto' ? 'Voz auto' : 'Voz on'}
    </Button>
  );
}
