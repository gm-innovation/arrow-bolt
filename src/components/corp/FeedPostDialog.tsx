import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus } from 'lucide-react';
import { useCorpFeed } from '@/hooks/useCorpFeed';

interface FeedPostDialogProps {
  companyId: string;
}

const FeedPostDialog = ({ companyId }: FeedPostDialogProps) => {
  const [open, setOpen] = useState(false);
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [postType, setPostType] = useState('announcement');
  const [pinned, setPinned] = useState(false);
  const { createPost } = useCorpFeed();

  const handleSubmit = () => {
    if (!content.trim()) return;
    createPost.mutate({
      company_id: companyId,
      title: title || undefined,
      content,
      post_type: postType,
      pinned,
    }, {
      onSuccess: () => {
        setOpen(false);
        setTitle('');
        setContent('');
        setPostType('announcement');
        setPinned(false);
      }
    });
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="gap-2"><Plus className="h-4 w-4" /> Novo Post</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader><DialogTitle>Novo Post no Feed</DialogTitle></DialogHeader>
        <div className="space-y-4">
          <div>
            <Label>Título (opcional)</Label>
            <Input value={title} onChange={e => setTitle(e.target.value)} placeholder="Título do post" />
          </div>
          <div>
            <Label>Conteúdo *</Label>
            <Textarea value={content} onChange={e => setContent(e.target.value)} placeholder="Escreva seu comunicado..." rows={4} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>Tipo</Label>
              <Select value={postType} onValueChange={setPostType}>
                <SelectTrigger><SelectValue /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="announcement">Comunicado</SelectItem>
                  <SelectItem value="update">Atualização</SelectItem>
                  <SelectItem value="general">Geral</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <div className="flex items-center gap-2">
                <Switch checked={pinned} onCheckedChange={setPinned} />
                <Label>Fixar no topo</Label>
              </div>
            </div>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button onClick={handleSubmit} disabled={!content.trim() || createPost.isPending}>
              {createPost.isPending ? 'Publicando...' : 'Publicar'}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default FeedPostDialog;
