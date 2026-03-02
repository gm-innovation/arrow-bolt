import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Plus } from 'lucide-react';
import { useCorpFeedDiscussions } from '@/hooks/useCorpFeedDiscussions';

interface Props {
  companyId: string;
}

const FeedNewDiscussionDialog = ({ companyId }: Props) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const { createDiscussion } = useCorpFeedDiscussions(companyId);

  const handleSubmit = () => {
    if (!title.trim()) return;
    createDiscussion.mutate(
      { company_id: companyId, title, content: content || undefined },
      { onSuccess: () => { setOpen(false); setTitle(''); setContent(''); } }
    );
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="sm" className="w-full gap-1.5 text-xs h-7">
          <Plus className="h-3 w-3" />
          Nova Discussão
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Nova Discussão</DialogTitle>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Título</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Assunto da discussão" />
          </div>
          <div>
            <Label>Descrição (opcional)</Label>
            <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Contexto inicial..." rows={3} />
          </div>
          <Button onClick={handleSubmit} disabled={!title.trim() || createDiscussion.isPending} className="w-full">
            {createDiscussion.isPending ? 'Criando...' : 'Criar Discussão'}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FeedNewDiscussionDialog;
