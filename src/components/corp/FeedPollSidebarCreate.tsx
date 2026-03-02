import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { BarChart3, Plus, X } from 'lucide-react';
import { useAuth } from '@/contexts/AuthContext';
import { useCorpFeed } from '@/hooks/useCorpFeed';

interface Props {
  companyId: string;
  hasActivePoll: boolean;
  onClosePoll?: () => void;
}

const FeedPollSidebarCreate = ({ companyId, hasActivePoll, onClosePoll }: Props) => {
  const { user } = useAuth();
  const { createPost } = useCorpFeed();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState('');
  const [options, setOptions] = useState(['', '']);

  const addOption = () => { if (options.length < 6) setOptions([...options, '']); };
  const removeOption = (i: number) => { if (options.length > 2) setOptions(options.filter((_, idx) => idx !== i)); };
  const updateOption = (i: number, val: string) => { const copy = [...options]; copy[i] = val; setOptions(copy); };

  const valid = question.trim() && options.filter(o => o.trim()).length >= 2;

  const handleSubmit = () => {
    if (!valid) return;
    createPost.mutate(
      {
        company_id: companyId,
        content: question,
        post_type: 'poll',
        pinned: true,
        poll: { question, options: options.filter(o => o.trim()) },
      },
      {
        onSuccess: () => {
          setOpen(false);
          setQuestion('');
          setOptions(['', '']);
        },
      }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          className="w-full text-xs gap-1.5"
          disabled={hasActivePoll}
        >
          <BarChart3 className="h-3.5 w-3.5" />
          {hasActivePoll ? 'Enquete em andamento' : 'Nova Enquete'}
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-primary" />
            Criar Enquete
          </DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Pergunta</Label>
            <Input value={question} onChange={e => setQuestion(e.target.value)} placeholder="Qual a sua opinião sobre...?" />
          </div>
          <div>
            <Label>Opções</Label>
            <div className="space-y-2 mt-1">
              {options.map((opt, i) => (
                <div key={i} className="flex gap-2">
                  <Input
                    value={opt}
                    onChange={e => updateOption(i, e.target.value)}
                    placeholder={`Opção ${i + 1}`}
                  />
                  {options.length > 2 && (
                    <Button variant="ghost" size="icon" className="shrink-0 h-9 w-9" onClick={() => removeOption(i)}>
                      <X className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              ))}
              {options.length < 6 && (
                <Button variant="ghost" size="sm" className="text-xs gap-1" onClick={addOption}>
                  <Plus className="h-3 w-3" /> Adicionar opção
                </Button>
              )}
            </div>
          </div>
          <Button onClick={handleSubmit} disabled={!valid || createPost.isPending} className="w-full">
            {createPost.isPending ? 'Publicando...' : 'Publicar Enquete'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FeedPollSidebarCreate;
