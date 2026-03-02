import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';

interface NewDiscussionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: { title: string; content?: string }) => void;
  isPending?: boolean;
}

const NewDiscussionDialog = ({ open, onOpenChange, onSubmit, isPending }: NewDiscussionDialogProps) => {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');

  const handleSubmit = () => {
    if (!title.trim()) return;
    onSubmit({ title: title.trim(), content: content.trim() || undefined });
    setTitle('');
    setContent('');
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Nova Discussão</DialogTitle>
          <DialogDescription>Crie um novo tópico para o grupo.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label htmlFor="disc-title">Título</Label>
            <Input id="disc-title" value={title} onChange={e => setTitle(e.target.value)} placeholder="Assunto da discussão" />
          </div>
          <div>
            <Label htmlFor="disc-content">Descrição (opcional)</Label>
            <Textarea id="disc-content" value={content} onChange={e => setContent(e.target.value)} placeholder="Descreva o assunto..." rows={4} />
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>Cancelar</Button>
          <Button onClick={handleSubmit} disabled={!title.trim() || isPending}>Criar</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default NewDiscussionDialog;
