import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X, Plus } from 'lucide-react';

interface FeedPollCreateProps {
  onPollData: (data: { question: string; options: string[] } | null) => void;
}

const FeedPollCreate = ({ onPollData }: FeedPollCreateProps) => {
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);

  const addOption = () => {
    if (options.length < 6) setOptions([...options, '']);
  };

  const removeOption = (i: number) => {
    if (options.length > 2) {
      const next = options.filter((_, idx) => idx !== i);
      setOptions(next);
    }
  };

  const updateOption = (i: number, val: string) => {
    const next = [...options];
    next[i] = val;
    setOptions(next);
    // Emit valid data
    const validOpts = next.filter(o => o.trim());
    if (question.trim() && validOpts.length >= 2) {
      onPollData({ question, options: validOpts });
    } else {
      onPollData(null);
    }
  };

  const updateQuestion = (val: string) => {
    setQuestion(val);
    const validOpts = options.filter(o => o.trim());
    if (val.trim() && validOpts.length >= 2) {
      onPollData({ question: val, options: validOpts });
    } else {
      onPollData(null);
    }
  };

  return (
    <div className="border rounded-lg p-3 space-y-2 bg-muted/30">
      <div className="flex items-center justify-between">
        <Label className="text-xs font-semibold">Enquete</Label>
        <Button variant="ghost" size="sm" className="h-6 w-6 p-0" onClick={() => onPollData(null)}>
          <X className="h-3.5 w-3.5" />
        </Button>
      </div>
      <Input
        value={question}
        onChange={e => updateQuestion(e.target.value)}
        placeholder="Pergunta da enquete"
        className="text-sm"
      />
      <div className="space-y-1.5">
        {options.map((opt, i) => (
          <div key={i} className="flex gap-1.5">
            <Input
              value={opt}
              onChange={e => updateOption(i, e.target.value)}
              placeholder={`Opção ${i + 1}`}
              className="text-sm"
            />
            {options.length > 2 && (
              <Button variant="ghost" size="sm" className="h-9 w-9 p-0 shrink-0" onClick={() => removeOption(i)}>
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        ))}
      </div>
      {options.length < 6 && (
        <Button variant="ghost" size="sm" className="text-xs gap-1 h-7" onClick={addOption}>
          <Plus className="h-3 w-3" />
          Adicionar opção
        </Button>
      )}
    </div>
  );
};

export default FeedPollCreate;
